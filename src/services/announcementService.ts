import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Announcement {
  id?: string;
  title: string;
  message: string;
  active: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
}

const ANNOUNCEMENTS_COLLECTION = 'announcements';

export const announcementService = {
  async create(
    title: string,
    message: string,
    createdBy: string,
    createdByName: string
  ): Promise<string> {
    const docRef = await addDoc(collection(db, ANNOUNCEMENTS_COLLECTION), {
      title: title.trim(),
      message: message.trim(),
      active: true,
      createdBy,
      createdByName,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  // All announcements, newest first (admin management view)
  async getAll(): Promise<Announcement[]> {
    const q = query(collection(db, ANNOUNCEMENTS_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Announcement);
  },

  // Latest active announcement (student banner)
  async getLatestActive(): Promise<Announcement | null> {
    try {
      const q = query(
        collection(db, ANNOUNCEMENTS_COLLECTION),
        where('active', '==', true),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const d = snapshot.docs[0];
      return { id: d.id, ...d.data() } as Announcement;
    } catch (error) {
      // Composite index may be missing; fall back to client-side filtering
      console.error('[AnnouncementService] getLatestActive failed, falling back:', error);
      const all = await this.getAll();
      return all.find((a) => a.active) || null;
    }
  },

  async setActive(id: string, active: boolean): Promise<void> {
    await updateDoc(doc(db, ANNOUNCEMENTS_COLLECTION, id), { active });
  },

  async remove(id: string): Promise<void> {
    await deleteDoc(doc(db, ANNOUNCEMENTS_COLLECTION, id));
  },
};
