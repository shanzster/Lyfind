import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface AIMatchResult {
  id?: string;
  queryItemId: string;
  queryItemTitle: string;
  queryImageUrl: string;
  matchedItemId: string;
  matchedItemTitle: string;
  matchedImageUrl: string;
  similarityScore: number;
  matchedBy: string; // user who performed the search
  matchedByName: string;
  status: 'pending' | 'confirmed' | 'dismissed';
  createdAt: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  reviewNote?: string;
}

const MATCHES_COLLECTION = 'aiMatches';

export const aiMatchingService = {
  // Create a new AI match result
  async createMatch(matchData: Omit<AIMatchResult, 'id' | 'createdAt' | 'status'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, MATCHES_COLLECTION), {
        ...matchData,
        status: 'pending',
        createdAt: Timestamp.now()
      });
      
      console.log('[AIMatchingService] Match created:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('[AIMatchingService] Error creating match:', error);
      throw error;
    }
  },

  // Get all AI matches
  async getAllMatches(filters?: {
    status?: string;
    minScore?: number;
  }): Promise<AIMatchResult[]> {
    try {
      let q = query(
        collection(db, MATCHES_COLLECTION),
        orderBy('createdAt', 'desc')
      );

      if (filters?.status && filters.status !== 'all') {
        q = query(
          collection(db, MATCHES_COLLECTION),
          where('status', '==', filters.status),
          orderBy('createdAt', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      let matches = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AIMatchResult));

      // Filter by score if specified
      if (filters?.minScore !== undefined) {
        matches = matches.filter(m => m.similarityScore >= filters.minScore!);
      }

      return matches;
    } catch (error) {
      console.error('[AIMatchingService] Error getting matches:', error);
      return [];
    }
  },

  // Get matches for a specific item
  async getMatchesForItem(itemId: string): Promise<AIMatchResult[]> {
    try {
      const q = query(
        collection(db, MATCHES_COLLECTION),
        where('queryItemId', '==', itemId),
        orderBy('similarityScore', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AIMatchResult));
    } catch (error) {
      console.error('[AIMatchingService] Error getting item matches:', error);
      return [];
    }
  },

  // Get match by ID
  async getMatchById(matchId: string): Promise<AIMatchResult | null> {
    try {
      const docRef = doc(db, MATCHES_COLLECTION, matchId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as AIMatchResult;
      }
      return null;
    } catch (error) {
      console.error('[AIMatchingService] Error getting match:', error);
      return null;
    }
  },

  // Update match status
  async updateMatchStatus(
    matchId: string,
    status: 'confirmed' | 'dismissed',
    reviewedBy: string,
    reviewNote?: string
  ): Promise<void> {
    try {
      await updateDoc(doc(db, MATCHES_COLLECTION, matchId), {
        status,
        reviewedAt: Timestamp.now(),
        reviewedBy,
        reviewNote: reviewNote || ''
      });

      console.log('[AIMatchingService] Match status updated:', matchId, status);
    } catch (error) {
      console.error('[AIMatchingService] Error updating match status:', error);
      throw error;
    }
  },

  // Delete a match
  async deleteMatch(matchId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, MATCHES_COLLECTION, matchId));
      console.log('[AIMatchingService] Match deleted:', matchId);
    } catch (error) {
      console.error('[AIMatchingService] Error deleting match:', error);
      throw error;
    }
  },

  // Get statistics
  async getMatchStats(): Promise<{
    total: number;
    pending: number;
    confirmed: number;
    dismissed: number;
    avgScore: number;
  }> {
    try {
      const snapshot = await getDocs(collection(db, MATCHES_COLLECTION));
      const matches = snapshot.docs.map(doc => doc.data() as AIMatchResult);

      const total = matches.length;
      const pending = matches.filter(m => m.status === 'pending').length;
      const confirmed = matches.filter(m => m.status === 'confirmed').length;
      const dismissed = matches.filter(m => m.status === 'dismissed').length;
      
      const avgScore = total > 0
        ? matches.reduce((sum, m) => sum + m.similarityScore, 0) / total
        : 0;

      return {
        total,
        pending,
        confirmed,
        dismissed,
        avgScore: Math.round(avgScore * 100) / 100
      };
    } catch (error) {
      console.error('[AIMatchingService] Error getting stats:', error);
      return { total: 0, pending: 0, confirmed: 0, dismissed: 0, avgScore: 0 };
    }
  }
};
