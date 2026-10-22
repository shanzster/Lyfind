import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// jsPDF is heavy (~300KB) and only needed when a student actually generates an
// appeal, so load it on demand rather than bundling it into every page that
// merely reads appeals (e.g. the admin user-detail view).
async function getJsPDF() {
  const mod = await import('jspdf');
  return mod.jsPDF;
}

const APPEALS_COLLECTION = 'appeals';

export interface Appeal {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  // The student's written appeal
  reason: string;
  // Snapshot of why they were suspended (for admin context)
  suspensionReason?: string;
  // The generated appeal document, stored inline as a base64 PDF data URL.
  // Appeals are short text documents, comfortably under Firestore's 1MB limit.
  pdfDataUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
  decidedBy?: string;
  decidedAt?: Timestamp;
  decisionNote?: string;
}

interface SubmitAppealInput {
  userId: string;
  userName: string;
  userEmail: string;
  reason: string;
  suspensionReason?: string;
}

/**
 * Build a simple, printable PDF of the student's appeal and return it as a
 * base64 data URL (data:application/pdf;base64,...).
 */
async function generateAppealPdf(input: SubmitAppealInput): Promise<string> {
  const jsPDF = await getJsPDF();
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 56;
  let y = 72;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('Suspension Appeal', marginX, y);
  y += 28;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  const stamped = new Date().toLocaleString();
  pdf.text(`Submitted: ${stamped}`, marginX, y);
  y += 24;

  const line = (label: string, value: string) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, marginX, y);
    pdf.setFont('helvetica', 'normal');
    const wrapped = pdf.splitTextToSize(value || '—', 420);
    pdf.text(wrapped, marginX + 120, y);
    y += Math.max(18, wrapped.length * 15) + 4;
  };

  line('Name:', input.userName);
  line('Email:', input.userEmail);
  line('Suspension reason:', input.suspensionReason || 'Not specified');
  y += 8;

  pdf.setFont('helvetica', 'bold');
  pdf.text('Appeal:', marginX, y);
  y += 18;
  pdf.setFont('helvetica', 'normal');
  const body = pdf.splitTextToSize(input.reason || '—', 480);
  pdf.text(body, marginX, y);

  // jsPDF returns "data:application/pdf;base64,...."
  return pdf.output('datauristring');
}

export const appealService = {
  generateAppealPdf,

  /** Returns the student's most recent appeal, or null if none. */
  async getLatestAppealForUser(userId: string): Promise<Appeal | null> {
    const q = query(
      collection(db, APPEALS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...(d.data() as Omit<Appeal, 'id'>) };
  },

  /** Whether the student has an appeal still awaiting an admin decision. */
  async hasPendingAppeal(userId: string): Promise<boolean> {
    const q = query(
      collection(db, APPEALS_COLLECTION),
      where('userId', '==', userId),
      where('status', '==', 'pending')
    );
    const snap = await getDocs(q);
    return !snap.empty;
  },

  /**
   * Submit an appeal: generate the PDF and store the appeal. Blocks duplicate
   * pending appeals from the same user.
   */
  async submitAppeal(input: SubmitAppealInput): Promise<string> {
    if (await this.hasPendingAppeal(input.userId)) {
      throw new Error('You already have an appeal awaiting review.');
    }

    const pdfDataUrl = await generateAppealPdf(input);

    const data: any = {
      userId: input.userId,
      userName: input.userName,
      userEmail: input.userEmail,
      reason: input.reason,
      pdfDataUrl,
      status: 'pending',
      createdAt: Timestamp.now(),
    };
    if (input.suspensionReason) data.suspensionReason = input.suspensionReason;

    const ref = await addDoc(collection(db, APPEALS_COLLECTION), data);
    return ref.id;
  },

  /** All pending appeals, newest first (admin queue). */
  async getPendingAppeals(): Promise<Appeal[]> {
    const q = query(
      collection(db, APPEALS_COLLECTION),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Appeal, 'id'>) }));
  },

  /** All appeals, newest first (admin history). */
  async getAllAppeals(): Promise<Appeal[]> {
    const q = query(collection(db, APPEALS_COLLECTION), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Appeal, 'id'>) }));
  },

  /** Count of pending appeals — used for the sidebar badge. */
  async countPendingAppeals(): Promise<number> {
    const q = query(
      collection(db, APPEALS_COLLECTION),
      where('status', '==', 'pending')
    );
    const snap = await getDocs(q);
    return snap.size;
  },

  async getAppeal(appealId: string): Promise<Appeal | null> {
    const ref = doc(db, APPEALS_COLLECTION, appealId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<Appeal, 'id'>) };
  },

  /** Record an admin decision on an appeal. */
  async decideAppeal(
    appealId: string,
    adminUid: string,
    decision: 'approved' | 'rejected',
    note?: string
  ): Promise<void> {
    const data: any = {
      status: decision,
      decidedBy: adminUid,
      decidedAt: Timestamp.now(),
    };
    if (note) data.decisionNote = note;
    await updateDoc(doc(db, APPEALS_COLLECTION, appealId), data);
  },
};
