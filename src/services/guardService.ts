import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ── Guard Station module ──────────────────────────────────────────────────
//
// Custodians do NOT post to the public board. They keep an intake log of
// items physically turned in at the guard desk. Admins review the intake
// queue and decide what to publish as a public "found" post. When a student
// picks up an item at the desk, the custodian records the pickup (name +
// student ID checked against a physical ID) in the permanent claim log.

export type GuardIntakeStatus = 'logged' | 'posted' | 'released';

export interface GuardIntake {
  id?: string;
  custodianId: string;
  custodianName: string;
  title: string;
  category: string;
  description: string;
  photos: string[];
  // Who turned the item in (checked against their physical student ID)
  finderName: string;
  finderStudentId: string;
  foundLocation?: string;
  foundDate?: string; // YYYY-MM-DD as entered by the guard
  note?: string;
  status: GuardIntakeStatus;
  // Set by an admin when the entry is published to the public board
  postedItemId?: string;
  postedBy?: string;
  postedAt?: Timestamp;
  // Set by the custodian when the item is handed back
  releasedTo?: { name: string; studentId: string; note?: string };
  releasedAt?: Timestamp;
  loggedAt: Timestamp;
  updatedAt: Timestamp;
}

export interface GuardClaim {
  id?: string;
  intakeId?: string;
  itemId?: string; // public item, only when the entry had been posted
  itemTitle: string;
  custodianId: string;
  claimerName: string;
  claimerStudentId: string;
  note?: string;
  claimedAt: Timestamp;
}

const GUARD_INTAKE_COLLECTION = 'guardIntake';
const GUARD_CLAIMS_COLLECTION = 'guardClaims';

function sortByDesc<T>(rows: T[], pick: (row: T) => Timestamp | undefined): T[] {
  return rows.sort((a, b) => (pick(b)?.toMillis() || 0) - (pick(a)?.toMillis() || 0));
}

export const guardService = {
  // ── Intake (custodian) ──────────────────────────────────────────────────

  async logIntake(input: {
    custodianId: string;
    custodianName: string;
    title: string;
    category: string;
    description: string;
    photos: string[];
    finderName: string;
    finderStudentId: string;
    foundLocation?: string;
    foundDate?: string;
    note?: string;
  }): Promise<string> {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, GUARD_INTAKE_COLLECTION), {
      custodianId: input.custodianId,
      custodianName: input.custodianName,
      title: input.title.trim(),
      category: input.category,
      description: input.description.trim(),
      photos: input.photos,
      finderName: input.finderName.trim(),
      finderStudentId: input.finderStudentId.trim(),
      ...(input.foundLocation?.trim() ? { foundLocation: input.foundLocation.trim() } : {}),
      ...(input.foundDate ? { foundDate: input.foundDate } : {}),
      ...(input.note?.trim() ? { note: input.note.trim() } : {}),
      status: 'logged' as GuardIntakeStatus,
      loggedAt: now,
      updatedAt: now,
    });
    return docRef.id;
  },

  async getIntakeLog(custodianId: string): Promise<GuardIntake[]> {
    const base = collection(db, GUARD_INTAKE_COLLECTION);
    try {
      const snapshot = await getDocs(
        query(base, where('custodianId', '==', custodianId), orderBy('loggedAt', 'desc'))
      );
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as GuardIntake);
    } catch (error) {
      // Composite index may be missing; fall back to unordered + client sort
      console.error('[GuardService] Ordered intake log failed, falling back:', error);
      const snapshot = await getDocs(query(base, where('custodianId', '==', custodianId)));
      return sortByDesc(
        snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as GuardIntake),
        (r) => r.loggedAt
      );
    }
  },

  // ── Intake (admin) ──────────────────────────────────────────────────────

  async getAllIntake(): Promise<GuardIntake[]> {
    const snapshot = await getDocs(
      query(collection(db, GUARD_INTAKE_COLLECTION), orderBy('loggedAt', 'desc'))
    );
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as GuardIntake);
  },

  async getIntakeById(id: string): Promise<GuardIntake | null> {
    const snap = await getDoc(doc(db, GUARD_INTAKE_COLLECTION, id));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as GuardIntake) : null;
  },

  // Called by the admin after they publish the entry as a public item
  async markIntakePosted(intakeId: string, itemId: string, adminUid: string): Promise<void> {
    await updateDoc(doc(db, GUARD_INTAKE_COLLECTION, intakeId), {
      status: 'posted',
      postedItemId: itemId,
      postedBy: adminUid,
      postedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  },

  // ── Pickup / claim log (custodian) ──────────────────────────────────────

  // Record a physical pickup: writes the claim log, marks the intake entry
  // released, and (if an admin had posted it) resolves the public item.
  async logClaim(
    intake: GuardIntake,
    custodianId: string,
    claimerName: string,
    claimerStudentId: string,
    note?: string
  ): Promise<string> {
    const now = Timestamp.now();
    const trimmedNote = note?.trim();
    const releasedTo = {
      name: claimerName.trim(),
      studentId: claimerStudentId.trim(),
      ...(trimmedNote ? { note: trimmedNote } : {}),
    };

    const docRef = await addDoc(collection(db, GUARD_CLAIMS_COLLECTION), {
      intakeId: intake.id,
      ...(intake.postedItemId ? { itemId: intake.postedItemId } : {}),
      itemTitle: intake.title,
      custodianId,
      claimerName: releasedTo.name,
      claimerStudentId: releasedTo.studentId,
      ...(trimmedNote ? { note: trimmedNote } : {}),
      claimedAt: now,
    });

    await updateDoc(doc(db, GUARD_INTAKE_COLLECTION, intake.id!), {
      status: 'released',
      releasedTo,
      releasedAt: now,
      updatedAt: now,
    });

    if (intake.postedItemId) {
      try {
        await updateDoc(doc(db, 'items', intake.postedItemId), {
          status: 'resolved',
          claimedAt: now,
          updatedAt: now,
        });
      } catch (error) {
        // The pickup is already recorded; the public post can be resolved by an admin
        console.error('[GuardService] Could not resolve posted item:', error);
      }
    }

    return docRef.id;
  },

  async getClaimLog(custodianId: string): Promise<GuardClaim[]> {
    const base = collection(db, GUARD_CLAIMS_COLLECTION);
    try {
      const snapshot = await getDocs(
        query(base, where('custodianId', '==', custodianId), orderBy('claimedAt', 'desc'))
      );
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as GuardClaim);
    } catch (error) {
      console.error('[GuardService] Ordered claim log failed, falling back:', error);
      const snapshot = await getDocs(query(base, where('custodianId', '==', custodianId)));
      return sortByDesc(
        snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as GuardClaim),
        (r) => r.claimedAt
      );
    }
  },
};
