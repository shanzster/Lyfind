import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Item } from './itemService';
import { notificationService } from './notificationService';

export interface Watch {
  id?: string;
  userId: string;
  keywords: string; // free-text, matched word-by-word against title+description
  category?: string; // optional category filter ('All' = any)
  createdAt: Timestamp;
}

const WATCHES_COLLECTION = 'watches';

export const watchService = {
  async createWatch(userId: string, keywords: string, category?: string): Promise<string> {
    const docRef = await addDoc(collection(db, WATCHES_COLLECTION), {
      userId,
      keywords: keywords.trim().toLowerCase(),
      category: category && category !== 'All' ? category : null,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async getUserWatches(userId: string): Promise<Watch[]> {
    const q = query(collection(db, WATCHES_COLLECTION), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Watch);
  },

  async deleteWatch(watchId: string): Promise<void> {
    await deleteDoc(doc(db, WATCHES_COLLECTION, watchId));
  },

  // Called after a new item is posted: notify every watcher whose saved
  // search matches. Any keyword word appearing in the title/description
  // counts as a hit (plus the optional category filter).
  async notifyWatchersForNewItem(item: Item & { id: string }): Promise<void> {
    try {
      const snapshot = await getDocs(collection(db, WATCHES_COLLECTION));
      const haystack = `${item.title} ${item.description}`.toLowerCase();

      const notified = new Set<string>();
      for (const d of snapshot.docs) {
        const watch = d.data() as Watch;
        if (watch.userId === item.userId || notified.has(watch.userId)) continue;
        if (watch.category && watch.category !== item.category) continue;

        const words = watch.keywords.split(/\s+/).filter((w) => w.length >= 3);
        if (words.length === 0) continue;
        if (!words.some((w) => haystack.includes(w))) continue;

        notified.add(watch.userId);
        await notificationService.createNotification({
          userId: watch.userId,
          type: 'match',
          title: '🔔 Watched item posted!',
          message: `A new ${item.type} item matches your saved search "${watch.keywords}": ${item.title}`,
          actionUrl: `/item/${item.id}`,
          metadata: {
            matchedItemId: item.id,
            matchedItemTitle: item.title,
            matchedItemImage: item.photos?.[0],
          },
        });
      }
    } catch (error) {
      // Never block posting on watch notifications
      console.error('[WatchService] Failed to notify watchers:', error);
    }
  },
};
