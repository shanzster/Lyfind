import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { notificationService } from './notificationService';
import { adminService } from './adminService';

export interface TeacherVerificationRequest {
  uid: string;
  email: string;
  displayName: string;
  department?: string;
  idPhotoURL: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  rejectionReason?: string;
  disclaimerAccepted: boolean;
}

const COLLECTION = 'teacherVerifications';

export const teacherVerificationService = {
  // Submit a verification request (one per user; doc id = uid)
  async submitRequest(
    user: FirebaseUser,
    idPhotoURL: string,
    department?: string
  ): Promise<void> {
    const existing = await this.getRequest(user.uid);
    if (existing) {
      if (existing.status === 'pending') {
        throw new Error('You already have a pending teacher verification request.');
      }
      if (existing.status === 'approved') {
        throw new Error('Your teacher account is already verified.');
      }
      if (existing.status === 'rejected') {
        throw new Error('Your teacher verification was rejected. Contact an administrator to appeal.');
      }
    }

    const request: TeacherVerificationRequest = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      idPhotoURL,
      status: 'pending',
      submittedAt: Timestamp.now(),
      disclaimerAccepted: true,
    };
    if (department) {
      request.department = department;
    }

    await setDoc(doc(db, COLLECTION, user.uid), request);

    await updateDoc(doc(db, 'users', user.uid), {
      teacherVerificationStatus: 'pending',
      teacherIdPhotoURL: idPhotoURL,
      updatedAt: Timestamp.now(),
    });
  },

  // Get a user's request
  async getRequest(uid: string): Promise<TeacherVerificationRequest | null> {
    const snap = await getDoc(doc(db, COLLECTION, uid));
    return snap.exists() ? (snap.data() as TeacherVerificationRequest) : null;
  },

  // Live-subscribe to a user's request
  subscribeToRequest(
    uid: string,
    callback: (request: TeacherVerificationRequest | null) => void
  ): () => void {
    return onSnapshot(
      doc(db, COLLECTION, uid),
      snap => callback(snap.exists() ? (snap.data() as TeacherVerificationRequest) : null),
      error => console.error('[TeacherVerification] Subscribe error:', error)
    );
  },

  // All pending requests, oldest first (admin)
  async getPendingRequests(): Promise<TeacherVerificationRequest[]> {
    try {
      const q = query(
        collection(db, COLLECTION),
        where('status', '==', 'pending'),
        orderBy('submittedAt', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => d.data() as TeacherVerificationRequest);
    } catch (error) {
      // Composite index may be missing — fall back to unordered query
      console.warn('[TeacherVerification] Ordered query failed, falling back:', error);
      const q = query(collection(db, COLLECTION), where('status', '==', 'pending'));
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map(d => d.data() as TeacherVerificationRequest)
        .sort((a, b) => (a.submittedAt?.toMillis() || 0) - (b.submittedAt?.toMillis() || 0));
    }
  },

  async getPendingCount(): Promise<number> {
    try {
      const q = query(collection(db, COLLECTION), where('status', '==', 'pending'));
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('[TeacherVerification] Pending count failed:', error);
      return 0;
    }
  },

  // Approve: user becomes faculty
  async approveRequest(uid: string, adminUid: string): Promise<void> {
    await updateDoc(doc(db, COLLECTION, uid), {
      status: 'approved',
      reviewedAt: Timestamp.now(),
      reviewedBy: adminUid,
    });

    await updateDoc(doc(db, 'users', uid), {
      role: 'faculty',
      teacherVerificationStatus: 'approved',
      updatedAt: Timestamp.now(),
    });

    await adminService.logAdminAction(adminUid, 'approve_teacher_verification', uid);

    try {
      await notificationService.notifyTeacherApproved(uid);
    } catch (error) {
      console.error('[TeacherVerification] Failed to send approval notification:', error);
    }
  },

  // Reject: account is PERMANENTLY BANNED (policy — rejection is treated as a violation)
  async rejectRequest(uid: string, adminUid: string, reason: string): Promise<void> {
    await updateDoc(doc(db, COLLECTION, uid), {
      status: 'rejected',
      reviewedAt: Timestamp.now(),
      reviewedBy: adminUid,
      rejectionReason: reason,
    });

    await updateDoc(doc(db, 'users', uid), {
      teacherVerificationStatus: 'rejected',
      banned: true,
      banReason: `Teacher ID verification rejected: ${reason}. If you believe this was a mistake, contact an administrator to appeal.`,
      bannedBy: adminUid,
      bannedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    await adminService.logAdminAction(adminUid, 'reject_teacher_verification', uid, {
      reason,
      accountBanned: true,
    });

    try {
      await notificationService.notifyTeacherRejected(uid, reason);
    } catch (error) {
      console.error('[TeacherVerification] Failed to send rejection notification:', error);
    }
  },
};
