/**
 * Create (or repair) a pre-verified teacher (faculty) account.
 * Faculty posts skip the admin approval queue and go live instantly.
 *
 * Usage: node scripts/seed-teacher.js
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const TEACHER_CONFIG = {
  email: 'teacher@lsb.edu.ph',
  password: 'Password123!',
  displayName: 'Teacher Lyfind',
};

function findServiceAccountFile() {
  const candidates = readdirSync(rootDir).filter(
    f => f.includes('firebase-adminsdk') && f.endsWith('.json')
  );
  if (candidates.length === 0) {
    throw new Error('No firebase-adminsdk service-account JSON found in the repo root.');
  }
  return join(rootDir, candidates[0]);
}

async function seedTeacher() {
  console.log('🎓 Creating verified teacher account...\n');

  const serviceAccount = JSON.parse(readFileSync(findServiceAccountFile(), 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
  const auth = getAuth();
  const db = getFirestore();

  let user;
  try {
    user = await auth.getUserByEmail(TEACHER_CONFIG.email);
    console.log('ℹ️  Auth user already exists (uid:', user.uid + ') — updating password/name');
    await auth.updateUser(user.uid, {
      password: TEACHER_CONFIG.password,
      displayName: TEACHER_CONFIG.displayName,
      emailVerified: true,
      disabled: false,
    });
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      user = await auth.createUser({
        email: TEACHER_CONFIG.email,
        password: TEACHER_CONFIG.password,
        displayName: TEACHER_CONFIG.displayName,
        emailVerified: true,
      });
      console.log('✅ Auth user created (uid:', user.uid + ')');
    } else {
      throw error;
    }
  }

  const now = Timestamp.now();

  // users/{uid}: pre-verified faculty
  await db.collection('users').doc(user.uid).set(
    {
      uid: user.uid,
      email: TEACHER_CONFIG.email,
      displayName: TEACHER_CONFIG.displayName,
      role: 'faculty',
      teacherVerificationStatus: 'approved',
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      itemsPosted: 0,
      itemsResolved: 0,
    },
    { merge: true }
  );
  console.log('✅ Firestore users/' + user.uid + ' written (role: faculty, approved)');

  // teacherVerifications/{uid}: matching approved record for the admin panel
  await db.collection('teacherVerifications').doc(user.uid).set(
    {
      userId: user.uid,
      email: TEACHER_CONFIG.email,
      displayName: TEACHER_CONFIG.displayName,
      status: 'approved',
      submittedAt: now,
      reviewedAt: now,
      reviewedBy: 'seed-script',
      note: 'Pre-verified via seed script',
    },
    { merge: true }
  );
  console.log('✅ Firestore teacherVerifications/' + user.uid + ' written (approved)');

  console.log('\n🎉 Done! Verified teacher account ready:');
  console.log('   Login URL: /login');
  console.log('   Email:    ', TEACHER_CONFIG.email);
  console.log('   Password: ', TEACHER_CONFIG.password);
  console.log('   Perk:      posts go live instantly (no approval queue)');
}

seedTeacher()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
