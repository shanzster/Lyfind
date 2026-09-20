import {
  collection,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  Timestamp,
  getAggregateFromServer,
  average,
  count,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Rating {
  conversationId: string;
  itemId: string;
  raterId: string;
  ratedUserId: string;
  stars: number; // 1..5
  comment?: string;
  createdAt: Timestamp;
}

export interface RatingSummary {
  average: number;
  count: number;
}

const RATINGS_COLLECTION = 'ratings';

// One rating per rater per conversation — deterministic doc id prevents dupes
const ratingId = (conversationId: string, raterId: string) => `${conversationId}_${raterId}`;

export const ratingService = {
  async submitRating(
    conversationId: string,
    itemId: string,
    raterId: string,
    ratedUserId: string,
    stars: number,
    comment?: string
  ): Promise<void> {
    await setDoc(doc(db, RATINGS_COLLECTION, ratingId(conversationId, raterId)), {
      conversationId,
      itemId,
      raterId,
      ratedUserId,
      stars: Math.max(1, Math.min(5, Math.round(stars))),
      ...(comment?.trim() ? { comment: comment.trim() } : {}),
      createdAt: Timestamp.now(),
    });
  },

  async hasRated(conversationId: string, raterId: string): Promise<boolean> {
    const snap = await getDoc(doc(db, RATINGS_COLLECTION, ratingId(conversationId, raterId)));
    return snap.exists();
  },

  // Server-side aggregate: no rating docs are downloaded
  async getUserRatingSummary(userId: string): Promise<RatingSummary> {
    try {
      const q = query(collection(db, RATINGS_COLLECTION), where('ratedUserId', '==', userId));
      const snapshot = await getAggregateFromServer(q, {
        average: average('stars'),
        count: count(),
      });
      const data = snapshot.data();
      return {
        average: Math.round((data.average || 0) * 10) / 10,
        count: data.count,
      };
    } catch (error) {
      console.error('[RatingService] Failed to load rating summary:', error);
      return { average: 0, count: 0 };
    }
  },
};
