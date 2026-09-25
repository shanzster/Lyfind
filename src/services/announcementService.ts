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

export type AnnouncementPriority = 'info' | 'warning' | 'urgent';

export interface Announcement {
  id?: string;
  title: string;
  message: string;
  active: boolean;
  priority?: AnnouncementPriority;
  expiresAt?: Timestamp | null;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
}

const ANNOUNCEMENTS_COLLECTION = 'announcements';

export function isAnnouncementCurrentlyActive(
  announcement: Pick<Announcement, 'active' | 'expiresAt'> | null | undefined,
  now = new Date()
): boolean {
  if (!announcement?.active) return false;

  if (!announcement.expiresAt) return true;

  const expiresAt = announcement.expiresAt.toDate
    ? announcement.expiresAt.toDate().getTime()
    : new Date(announcement.expiresAt as any).getTime();

  return expiresAt > now.getTime();
}

export const announcementService = {
  async create(
    title: string,
    message: string,
    createdBy: string,
    createdByName: string,
    priority: AnnouncementPriority = 'info',
    expiresAt?: Date | string | Timestamp | null
  ): Promise<string> {
    const normalizedExpiresAt = expiresAt
      ? expiresAt instanceof Timestamp
        ? expiresAt
        : Timestamp.fromDate(new Date(expiresAt))
      : null;

    const docRef = await addDoc(collection(db, ANNOUNCEMENTS_COLLECTION), {
      title: title.trim(),
      message: message.trim(),
      active: true,
      priority,
      expiresAt: normalizedExpiresAt,
      createdBy,
      createdByName,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async update(
    id: string,
    updates: Partial<Pick<Announcement, 'title' | 'message' | 'priority' | 'active'>> & {
      expiresAt?: Date | string | Timestamp | null;
    }
  ): Promise<void> {
    const normalized: Record<string, unknown> = { ...updates };

    if (updates.title !== undefined) normalized.title = updates.title.trim();
    if (updates.message !== undefined) normalized.message = updates.message.trim();
    if (updates.expiresAt !== undefined) {
      normalized.expiresAt = updates.expiresAt
        ? updates.expiresAt instanceof Timestamp
          ? updates.expiresAt
          : Timestamp.fromDate(new Date(updates.expiresAt as string | Date))
        : null;
    }

    await updateDoc(doc(db, ANNOUNCEMENTS_COLLECTION, id), normalized);
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
        limit(20)
      );
      const snapshot = await getDocs(q);
      const announcements = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Announcement);
      return announcements.find((a) => isAnnouncementCurrentlyActive(a)) || null;
    } catch (error) {
      // Composite index may be missing; fall back to client-side filtering
      console.error('[AnnouncementService] getLatestActive failed, falling back:', error);
      const all = await this.getAll();
      return all.find((a) => isAnnouncementCurrentlyActive(a)) || null;
    }
  },

  async setActive(id: string, active: boolean): Promise<void> {
    await updateDoc(doc(db, ANNOUNCEMENTS_COLLECTION, id), { active });
  },

  async remove(id: string): Promise<void> {
    await deleteDoc(doc(db, ANNOUNCEMENTS_COLLECTION, id));
  },
};
