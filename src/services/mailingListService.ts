import {
  collection,
  doc,
  getDocs,
  writeBatch,
  deleteDoc,
  Timestamp,
  orderBy,
  query,
} from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db } from '@/lib/firebase';

// ── Mailing list ─────────────────────────────────────────────────────────
// Admin-imported recipient list (CSV / Excel of names, courses, student
// numbers and emails). This is the basis for announcement email blasts;
// it is independent of who has registered in the app.

export interface MailingRecipient {
  id?: string; // lowercase email
  name: string;
  course?: string;
  studentNumber?: string;
  email: string;
  importedAt: Timestamp;
  importedBy: string;
  sourceFile?: string;
}

export interface ParsedRow {
  name: string;
  course: string;
  studentNumber: string;
  email: string;
}

export interface ParseResult {
  rows: ParsedRow[]; // valid, de-duplicated rows
  invalid: { row: number; reason: string; raw: Record<string, unknown> }[];
  duplicates: number;
  headers: string[];
  mapping: Record<keyof ParsedRow, string | null>;
}

const COLLECTION = 'mailingList';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Header aliases (lowercased, non-alphanumerics stripped)
const HEADER_ALIASES: Record<keyof ParsedRow, string[]> = {
  email: ['email', 'emailaddress', 'email address', 'e-mail', 'mail', 'schoolemail', 'lsbemail'],
  name: ['name', 'fullname', 'studentname', 'student', 'completename', 'full name'],
  course: ['course', 'program', 'programme', 'degree', 'section', 'courseyear', 'yearsection', 'strand'],
  studentNumber: [
    'studentnumber', 'studentno', 'studentid', 'idnumber', 'idno', 'id', 'sn', 'lrn', 'number', 'student number',
  ],
};

function norm(header: string): string {
  return String(header).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function detectMapping(headers: string[]): Record<keyof ParsedRow, string | null> {
  const mapping: Record<keyof ParsedRow, string | null> = {
    name: null,
    course: null,
    studentNumber: null,
    email: null,
  };
  const normalized = headers.map((h) => ({ raw: h, key: norm(h) }));
  (Object.keys(HEADER_ALIASES) as (keyof ParsedRow)[]).forEach((field) => {
    const aliases = HEADER_ALIASES[field].map(norm);
    // exact alias match first, then "contains"
    const exact = normalized.find((h) => aliases.includes(h.key));
    const partial = normalized.find((h) => aliases.some((a) => a.length > 2 && h.key.includes(a)));
    const hit = exact || partial;
    if (hit && !Object.values(mapping).includes(hit.raw)) mapping[field] = hit.raw;
  });
  // Fallback: sniff an email column by content is done in parse()
  return mapping;
}

export const mailingListService = {
  // Parse a .csv / .xlsx / .xls file in the browser into recipient rows
  async parseFile(file: File): Promise<ParseResult> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error('The file has no sheets');

    const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    if (records.length === 0) throw new Error('The file has no data rows');

    const headers = Object.keys(records[0]);
    const mapping = detectMapping(headers);

    // If no email header was recognised, sniff the column whose values look like emails
    if (!mapping.email) {
      const sniffed = headers.find((h) =>
        records.slice(0, 20).some((r) => EMAIL_RE.test(String(r[h] ?? '').trim()))
      );
      if (sniffed) mapping.email = sniffed;
    }
    if (!mapping.email) {
      throw new Error(`Could not find an email column. Headers found: ${headers.join(', ')}`);
    }

    const rows: ParsedRow[] = [];
    const invalid: ParseResult['invalid'] = [];
    const seen = new Set<string>();
    let duplicates = 0;

    records.forEach((raw, i) => {
      const get = (field: keyof ParsedRow) =>
        mapping[field] ? String(raw[mapping[field]!] ?? '').trim() : '';
      const email = get('email').toLowerCase();
      const rowNumber = i + 2; // 1-based + header row

      if (!email) {
        // Skip fully blank lines silently
        const blank = Object.values(raw).every((v) => String(v ?? '').trim() === '');
        if (!blank) invalid.push({ row: rowNumber, reason: 'Missing email', raw });
        return;
      }
      if (!EMAIL_RE.test(email)) {
        invalid.push({ row: rowNumber, reason: `Invalid email "${email}"`, raw });
        return;
      }
      if (seen.has(email)) {
        duplicates++;
        return;
      }
      seen.add(email);
      rows.push({
        email,
        name: get('name') || email.split('@')[0],
        course: get('course'),
        studentNumber: get('studentNumber'),
      });
    });

    return { rows, invalid, duplicates, headers, mapping };
  },

  // Upsert rows into Firestore (doc id = email) in batches of 400
  async importRows(
    rows: ParsedRow[],
    adminUid: string,
    sourceFile?: string,
    onProgress?: (done: number, total: number) => void
  ): Promise<number> {
    const now = Timestamp.now();
    let done = 0;
    for (let i = 0; i < rows.length; i += 400) {
      const batch = writeBatch(db);
      rows.slice(i, i + 400).forEach((r) => {
        const id = encodeURIComponent(r.email); // emails contain "." and "@" but never "/"
        batch.set(doc(db, COLLECTION, id), {
          name: r.name,
          email: r.email,
          ...(r.course ? { course: r.course } : {}),
          ...(r.studentNumber ? { studentNumber: r.studentNumber } : {}),
          importedAt: now,
          importedBy: adminUid,
          ...(sourceFile ? { sourceFile } : {}),
        });
      });
      await batch.commit();
      done = Math.min(i + 400, rows.length);
      onProgress?.(done, rows.length);
    }
    return rows.length;
  },

  async getAll(): Promise<MailingRecipient[]> {
    try {
      const snapshot = await getDocs(query(collection(db, COLLECTION), orderBy('name')));
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as MailingRecipient);
    } catch {
      const snapshot = await getDocs(collection(db, COLLECTION));
      return snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }) as MailingRecipient)
        .sort((a, b) => a.name.localeCompare(b.name));
    }
  },

  async remove(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id));
  },

  async clearAll(onProgress?: (done: number, total: number) => void): Promise<number> {
    const snapshot = await getDocs(collection(db, COLLECTION));
    const ids = snapshot.docs.map((d) => d.id);
    for (let i = 0; i < ids.length; i += 400) {
      const batch = writeBatch(db);
      ids.slice(i, i + 400).forEach((id) => batch.delete(doc(db, COLLECTION, id)));
      await batch.commit();
      onProgress?.(Math.min(i + 400, ids.length), ids.length);
    }
    return ids.length;
  },
};
