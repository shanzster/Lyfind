import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
  Timestamp,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Item {
  id?: string;
  type: 'lost' | 'found';
  title: string;
  description: string;
  category: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  floorPlanId?: string;
  locationX?: number;
  locationY?: number;
  roomNumber?: string;
  photos: string[];
  userId: string;
  userName: string;
  userEmail: string;
  userPhotoURL?: string;
  status: 'active' | 'resolved' | 'archived';
  claimedBy?: string;
  claimedAt?: Timestamp;
  meetupLocation?: {
    name: string;
    coordinates?: { lat: number; lng: number };
  };
  contactInfo?: {
    email?: string;
    phone?: string;
  };
  // Cached AI embeddings: map keys (v0, v1, v2) because Firestore forbids
  // nested arrays. See itemFeatureCache.ts.
  aiFeatures?: { version: number; count: number; [k: string]: any };
  postedByFaculty?: boolean;
  // Guard Station module: item is physically held at the campus guard/SSO desk
  heldAtGuardStation?: boolean;
  // Lifecycle module: renewing bumps this so old-but-renewed items aren't archived
  lastRenewedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const ITEMS_COLLECTION = 'items';

export const itemService = {
  // Create new item
  async createItem(itemData: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, ITEMS_COLLECTION), {
      ...itemData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  },

  // ── Lifecycle module ─────────────────────────────────────────────────

  // Effective age reference: renewals extend an item's life
  itemAgeMs(item: Item): number {
    const ref = item.lastRenewedAt?.toMillis() || item.createdAt?.toMillis() || Date.now();
    return Date.now() - ref;
  },

  // The user's active items older than `days` (default 30) — renewal prompts
  async getStaleUserItems(userId: string, days = 30): Promise<Item[]> {
    const items = await this.getUserItems(userId);
    const cutoffMs = days * 86400000;
    return items.filter(
      (item) => item.status === 'active' && this.itemAgeMs(item) > cutoffMs
    );
  },

  async renewItem(id: string): Promise<void> {
    await updateDoc(doc(db, ITEMS_COLLECTION, id), {
      lastRenewedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  },

  async archiveItem(id: string): Promise<void> {
    await updateDoc(doc(db, ITEMS_COLLECTION, id), {
      status: 'archived',
      updatedAt: Timestamp.now(),
    });
  },

  // Lazy sweep (run from the admin dashboard): archive active items older
  // than `days` (default 45). Returns how many were archived.
  async archiveExpiredItems(days = 45): Promise<number> {
    const items = await this.getAllItems({ status: 'active' });
    const cutoffMs = days * 86400000;
    const expired = items.filter((item) => item.id && this.itemAgeMs(item) > cutoffMs);
    await Promise.all(expired.map((item) => this.archiveItem(item.id!)));
    return expired.length;
  },

  // Count of resolved (reunited) items — server-side aggregate, no doc reads
  async getResolvedCount(): Promise<number> {
    const q = query(collection(db, ITEMS_COLLECTION), where('status', '==', 'resolved'));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  },

  // Get all items
  async getAllItems(filters?: {
    type?: 'lost' | 'found';
    category?: string;
    status?: string;
  }) {
    try {
      console.log('[ItemService] Fetching items with filters:', filters);
      
      // Start with base query - just get all items ordered by createdAt
      const q = query(collection(db, ITEMS_COLLECTION), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      console.log('[ItemService] Fetched', snapshot.docs.length, 'items from Firestore');
      
      let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item));

      // Apply filters client-side to avoid needing composite indexes
      if (filters?.type) {
        items = items.filter(item => item.type === filters.type);
      }
      if (filters?.category) {
        items = items.filter(item => item.category === filters.category);
      }
      if (filters?.status) {
        items = items.filter(item => item.status === filters.status);
      }

      console.log('[ItemService] Returning', items.length, 'items after filtering');
      return items;
    } catch (error: any) {
      console.error('[ItemService] Error fetching items:', error);
      console.error('[ItemService] Error code:', error.code);
      console.error('[ItemService] Error message:', error.message);
      
      // If it's a permission error, provide helpful message
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied. Please check Firestore security rules.');
      }
      
      throw error;
    }
  },

  // Get item by ID
  async getItemById(id: string) {
    const docRef = doc(db, ITEMS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Item;
    }
    return null;
  },

  // Get items by user
  async getItemsByUser(userId: string) {
    try {
      console.log('[ItemService] Fetching items for user:', userId);
      
      const q = query(
        collection(db, ITEMS_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item));
      
      console.log('[ItemService] Found', items.length, 'items for user');
      return items;
    } catch (error: any) {
      console.error('[ItemService] Error fetching user items:', error);
      
      // If it's an index error, try without orderBy
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.log('[ItemService] Retrying without orderBy due to missing index...');
        const q = query(
          collection(db, ITEMS_COLLECTION),
          where('userId', '==', userId)
        );
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item));
        
        // Sort client-side
        items.sort((a, b) => {
          const aTime = a.createdAt?.toMillis() || 0;
          const bTime = b.createdAt?.toMillis() || 0;
          return bTime - aTime;
        });
        
        console.log('[ItemService] Found', items.length, 'items for user (without index)');
        return items;
      }
      
      throw error;
    }
  },

  // Alias for getItemsByUser
  async getUserItems(userId: string) {
    return this.getItemsByUser(userId);
  },

  // Update item
  async updateItem(id: string, updates: Partial<Item>) {
    const docRef = doc(db, ITEMS_COLLECTION, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  },

  // Delete item
  async deleteItem(id: string) {
    const docRef = doc(db, ITEMS_COLLECTION, id);
    await deleteDoc(docRef);
  },

  // Search items
  async searchItems(searchTerm: string) {
    const items = await this.getAllItems();
    return items.filter(item =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  },
};
