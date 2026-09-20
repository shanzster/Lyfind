import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Guard Station module: physical claim log kept by the custodian.
// When a student picks up an item at the guard/SSO desk, the custodian logs
// who took it (name + student ID as checked against their physical ID).
export interface GuardClaim {
  id?: string;
  itemId: string;
  itemTitle: string;
  custodianId: string;
  claimerName: string;
  claimerStudentId: string;
  note?: string;
  claimedAt: Timestamp;
}

const GUARD_CLAIMS_COLLECTION = 'guardClaims';

export const guardService = {
  // Log a physical pickup and mark the item resolved in one step
  async logClaim(
    itemId: string,
    itemTitle: string,
    custodianId: string,
    claimerName: string,
    claimerStudentId: string,
    note?: string
  ): Promise<string> {
    const docRef = await addDoc(collection(db, GUARD_CLAIMS_COLLECTION), {
      itemId,
      itemTitle,
      custodianId,
      claimerName: claimerName.trim(),
      claimerStudentId: claimerStudentId.trim(),
      ...(note?.trim() ? { note: note.trim() } : {}),
      claimedAt: Timestamp.now(),
    });

    await updateDoc(doc(db, 'items', itemId), {
      status: 'resolved',
      claimedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return docRef.id;
  },

  async getClaimLog(custodianId: string): Promise<GuardClaim[]> {
    try {
      const q = query(
        collection(db, GUARD_CLAIMS_COLLECTION),
        where('custodianId', '==', custodianId),
        orderBy('claimedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as GuardClaim);
    } catch (error) {
      // Composite index may be missing; fall back to unordered + client sort
      console.error('[GuardService] Ordered claim log failed, falling back:', error);
      const q = query(
        collection(db, GUARD_CLAIMS_COLLECTION),
        where('custodianId', '==', custodianId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }) as GuardClaim)
        .sort((a, b) => (b.claimedAt?.toMillis() || 0) - (a.claimedAt?.toMillis() || 0));
    }
  },
};
