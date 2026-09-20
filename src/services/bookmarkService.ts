import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Item, itemService } from './itemService';

const BOOKMARKS_COLLECTION = 'bookmarks';

// Doc id is `${userId}_${itemId}` so toggling is a single deterministic write
const bookmarkId = (userId: string, itemId: string) => `${userId}_${itemId}`;

export const bookmarkService = {
  async isBookmarked(userId: string, itemId: string): Promise<boolean> {
    const snap = await getDoc(doc(db, BOOKMARKS_COLLECTION, bookmarkId(userId, itemId)));
    return snap.exists();
  },

  // Returns the new bookmarked state
  async toggle(userId: string, itemId: string): Promise<boolean> {
    const ref = doc(db, BOOKMARKS_COLLECTION, bookmarkId(userId, itemId));
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await deleteDoc(ref);
      return false;
    }
    await setDoc(ref, { userId, itemId, createdAt: Timestamp.now() });
    return true;
  },

  async getBookmarkedItemIds(userId: string): Promise<Set<string>> {
    const q = query(collection(db, BOOKMARKS_COLLECTION), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return new Set(snapshot.docs.map((d) => d.data().itemId as string));
  },

  async getBookmarkedItems(userId: string): Promise<Item[]> {
    const ids = await this.getBookmarkedItemIds(userId);
    const items = await Promise.all(
      [...ids].map(async (id) => {
        try {
          return await itemService.getItemById(id);
        } catch {
          return null;
        }
      })
    );
    return items.filter((item): item is Item => item !== null);
  },
};
