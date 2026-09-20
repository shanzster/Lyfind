import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  updateDoc,
  doc,
  deleteField,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { extractFeatures, analyzeImage, findMatches } from './aiPhotoMatcher';
import { getItemFeatureVectors } from './itemFeatureCache';
import { itemService, Item } from './itemService';
import { storageService } from './storageService';
import { aiMatchingService } from './aiMatchingService';
import { notificationService } from './notificationService';

export interface PhotoMatchRequest {
  id?: string;
  userId: string;
  imageUrl: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  position?: number;
  progress?: number;
  currentStep?: string;
  results?: MatchResult[];
  analysisDetails?: {
    imageSize: string;
    detectedObjects: string[];
    dominantColors: string[];
    features: number;
    comparedItems: number;
    processingTime: number;
  };
  error?: string;
  createdAt: Timestamp;
  completedAt?: Timestamp;
}

export interface MatchResult {
  itemId: string;
  title: string;
  type: 'lost' | 'found';
  score: number;
  imageUrl: string;
  location: string;
  date: string;
  postedBy: string;
}

const PHOTO_MATCH_COLLECTION = 'photoMatches';

export const photoMatchService = {
  // Upload image to Cloudinary
  async uploadImage(file: File): Promise<string> {
    try {
      console.log('[PhotoMatch] Uploading to Cloudinary...');
      const imageUrl = await storageService.uploadToCloudinary(file);
      console.log('[PhotoMatch] Upload successful:', imageUrl);
      return imageUrl;
    } catch (error) {
      console.error('[PhotoMatch] Upload failed:', error);
      throw new Error('Failed to upload image. Please try again.');
    }
  },

  // Create photo match request
  async createMatchRequest(userId: string, imageUrl: string): Promise<string> {
    try {
      // Get all queued and processing requests to calculate position
      const queueQuery = query(
        collection(db, PHOTO_MATCH_COLLECTION),
        where('status', 'in', ['queued', 'processing'])
      );
      
      const queueSnapshot = await getDocs(queueQuery);
      const position = queueSnapshot.size + 1;
      
      // Calculate estimated wait time (10 seconds per person in queue)
      const estimatedWaitSeconds = queueSnapshot.size * 10;

      const docRef = await addDoc(collection(db, PHOTO_MATCH_COLLECTION), {
        userId,
        imageUrl,
        status: 'queued',
        position,
        progress: 0,
        currentStep: `Position #${position} in queue - Estimated wait: ${estimatedWaitSeconds}s`,
        createdAt: Timestamp.now(),
      });

      // Start processing queue
      this.processQueue();

      return docRef.id;
    } catch (error) {
      console.error('[PhotoMatch] Failed to create match request:', error);
      throw new Error('Failed to create match request. Please try again.');
    }
  },

  // Process queue with 10-second delay between each request
  async processQueue() {
    try {
      // Get the next queued request (oldest first)
      const queueQuery = query(
        collection(db, PHOTO_MATCH_COLLECTION),
        where('status', '==', 'queued')
      );
      
      const queueSnapshot = await getDocs(queueQuery);
      
      if (queueSnapshot.empty) {
        console.log('[PhotoMatch] Queue is empty');
        return;
      }

      // Sort by createdAt client-side to get oldest first
      const queuedRequests = queueSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() as PhotoMatchRequest }))
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis() || 0;
          const bTime = b.createdAt?.toMillis() || 0;
          return aTime - bTime;
        });

      // Check if any request is currently processing
      const processingQuery = query(
        collection(db, PHOTO_MATCH_COLLECTION),
        where('status', '==', 'processing')
      );
      const processingSnapshot = await getDocs(processingQuery);

      if (!processingSnapshot.empty) {
        console.log('[PhotoMatch] A request is already processing, waiting...');
        // Check again in 5 seconds
        setTimeout(() => this.processQueue(), 5000);
        return;
      }

      // Process the first request in queue
      const nextRequest = queuedRequests[0];
      console.log('[PhotoMatch] Processing next request:', nextRequest.id);
      
      await this.processMatchRequest(nextRequest.id);
      
      // Wait 10 seconds before processing next request
      setTimeout(() => this.processQueue(), 10000);
      
    } catch (error) {
      console.error('[PhotoMatch] Queue processing error:', error);
      // Retry in 5 seconds
      setTimeout(() => this.processQueue(), 5000);
    }
  },

  // Get user's match requests
  async getUserMatchRequests(userId: string): Promise<PhotoMatchRequest[]> {
    const q = query(
      collection(db, PHOTO_MATCH_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as PhotoMatchRequest));
  },

  // Update match request status
  async updateMatchRequest(
    requestId: string,
    updates: Partial<PhotoMatchRequest>
  ) {
    const docRef = doc(db, PHOTO_MATCH_COLLECTION, requestId);
    await updateDoc(docRef, updates);
  },

  // Delete match request
  async deleteMatchRequest(requestId: string): Promise<void> {
    try {
      const docRef = doc(db, PHOTO_MATCH_COLLECTION, requestId);
      await deleteDoc(docRef);
      console.log('[PhotoMatch] Deleted match request:', requestId);
    } catch (error) {
      console.error('[PhotoMatch] Failed to delete match request:', error);
      throw error;
    }
  },

  // Process match request with real AI matching
  async processMatchRequest(requestId: string) {
    const startTime = Date.now();
    
    try {
      // Get the match request
      const requestDoc = await getDocs(
        query(collection(db, PHOTO_MATCH_COLLECTION), where('__name__', '==', requestId))
      );
      
      if (requestDoc.empty) {
        throw new Error('Match request not found');
      }
      
      const request = requestDoc.docs[0].data() as PhotoMatchRequest;
      const imageUrl = request.imageUrl;

      // Update to processing
      await this.updateMatchRequest(requestId, {
        status: 'processing',
        position: deleteField() as any,
        progress: 10,
        currentStep: 'Loading AI model...',
      });

      // Extract features from the uploaded image
      await this.updateMatchRequest(requestId, {
        progress: 30,
        currentStep: 'Extracting visual features...',
      });
      
      const queryFeatures = await extractFeatures(imageUrl);

      // Analyze image for details
      await this.updateMatchRequest(requestId, {
        progress: 50,
        currentStep: 'Analyzing image content...',
      });
      
      const analysis = await analyzeImage(imageUrl);

      // Get all items from database
      await this.updateMatchRequest(requestId, {
        progress: 60,
        currentStep: 'Loading items from database...',
      });
      
      const allItems = await itemService.getAllItems({ status: 'active' });

      // Filter items that have photos and extract their features
      await this.updateMatchRequest(requestId, {
        progress: 70,
        currentStep: 'Comparing with database items...',
      });
      
      const itemsWithFeatures: Array<Item & { featuresList: number[][] }> = [];

      for (const item of allItems) {
        if (item.photos && item.photos.length > 0) {
          try {
            // All photos, served from the per-item feature cache when current
            const featuresList = await getItemFeatureVectors(item);
            if (featuresList.length > 0) {
              itemsWithFeatures.push({ ...item, featuresList });
            }
          } catch (error) {
            console.error('[PhotoMatch] Failed to extract features for item:', item.id, error);
          }
        }
      }

      // Find matches
      await this.updateMatchRequest(requestId, {
        progress: 85,
        currentStep: 'Finding best matches...',
      });

      const validItems = itemsWithFeatures.filter((item): item is (Item & { featuresList: number[][]; id: string }) => !!item.id);
      const matches = findMatches(queryFeatures, validItems, 45);

      // Convert to MatchResult format
      const results: MatchResult[] = matches.slice(0, 10).map(match => ({
        itemId: match.id || '',
        title: match.title,
        type: match.type,
        score: match.score,
        imageUrl: match.photos[0],
        location: match.location?.address || 'Unknown location',
        date: match.createdAt?.toDate().toISOString() || new Date().toISOString(),
        postedBy: match.userName || 'Anonymous',
      }));

      // Calculate processing time
      const processingTime = (Date.now() - startTime) / 1000;

      // Store each match result in aiMatches collection for admin monitoring
      await this.updateMatchRequest(requestId, {
        progress: 95,
        currentStep: 'Saving match results...',
      });

      for (const result of results) {
        try {
          await aiMatchingService.createMatch({
            queryItemId: requestId,
            queryItemTitle: 'Photo Match Query',
            queryImageUrl: imageUrl,
            matchedItemId: result.itemId,
            matchedItemTitle: result.title,
            matchedImageUrl: result.imageUrl,
            similarityScore: result.score,
            matchedBy: request.userId,
            matchedByName: 'User',
          });
        } catch (error) {
          console.error('[PhotoMatch] Failed to save match result:', error);
        }
      }

      // Complete with results
      await this.updateMatchRequest(requestId, {
        status: 'completed',
        progress: 100,
        currentStep: 'Analysis complete!',
        results,
        completedAt: Timestamp.now(),
        analysisDetails: {
          imageSize: `${analysis.imageSize.width}x${analysis.imageSize.height}`,
          detectedObjects: analysis.objects.slice(0, 5).map(o => o.className),
          dominantColors: analysis.dominantColors,
          features: queryFeatures.length,
          comparedItems: itemsWithFeatures.length,
          processingTime: Math.round(processingTime * 10) / 10,
        },
      });

      console.log('[PhotoMatch] Processing complete:', results.length, 'matches found and saved');

      // Send notification to user if matches were found
      if (results.length > 0) {
        try {
          await notificationService.notifyMatch(
            request.userId,
            results.length
          );
        } catch (error) {
          console.error('[PhotoMatch] Failed to send notification:', error);
          // Don't throw - processing was successful
        }
      }
    } catch (error) {
      console.error('[PhotoMatch] Processing failed:', error);
      
      await this.updateMatchRequest(requestId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  },
};
