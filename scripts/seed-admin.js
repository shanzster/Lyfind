/**
 * Seed Admin Account Script
 *
 * Creates (or repairs) the super-admin account in Firebase Auth + Firestore.
 * Idempotent: if the Auth user already exists, its password/display name are
 * reset and the Firestore docs are (re)written.
 *
 * Requires a Firebase Admin SDK service-account key JSON in the repo root
 * (kept OUT of git — see .gitignore).
 *
 * Usage:
 *   node scripts/seed-admin.js
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Admin account configuration
const ADMIN_CONFIG = {
  email: 'admin@lsb.edu.ph',
  password: 'LyFindAdmin2026!', // Change after first login!
  displayName: 'Admin User',
  role: 'super_admin',
  adminLevel: 'super',
};

const PERMISSIONS = [
  'users.view', 'users.edit', 'users.delete', 'users.suspend', 'users.ban',
  'items.view', 'items.edit', 'items.delete', 'items.feature',
  'items.approve', 'items.reject', 'items.request_info',
  'reports.view', 'reports.handle', 'reports.delete',
  'messages.view', 'messages.delete',
  'ai.configure', 'ai.monitor',
  'analytics.view', 'analytics.export',
  'settings.view', 'settings.edit',
  'admins.create', 'admins.edit', 'admins.delete',
  'logs.view', 'logs.export',
  'system.backup', 'system.restore', 'system.shutdown',
  'teachers.verify', 'teachers.approve', 'teachers.reject',
];

function findServiceAccountFile() {
  const candidates = readdirSync(rootDir).filter(
    f => f.includes('firebase-adminsdk') && f.endsWith('.json')
  );
  if (candidates.length === 0) {
    throw new Error(
      'No firebase-adminsdk service-account JSON found in the repo root. ' +
      'Generate one in Firebase Console → Project Settings → Service accounts.'
    );
  }
  return join(rootDir, candidates[0]);
}

async function seedAdmin() {
  console.log('🚀 Starting admin account creation...\n');

  const serviceAccountPath = findServiceAccountFile();
  console.log('🔑 Using service account:', serviceAccountPath);
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

  initializeApp({ credential: cert(serviceAccount) });
  const auth = getAuth();
  const db = getFirestore();

  // Create or update the Auth user
  let user;
  try {
    user = await auth.getUserByEmail(ADMIN_CONFIG.email);
    console.log('ℹ️  Auth user already exists (uid:', user.uid + ') — updating password/name');
    await auth.updateUser(user.uid, {
      password: ADMIN_CONFIG.password,
      displayName: ADMIN_CONFIG.displayName,
      emailVerified: true,
      disabled: false,
    });
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      user = await auth.createUser({
        email: ADMIN_CONFIG.email,
        password: ADMIN_CONFIG.password,
        displayName: ADMIN_CONFIG.displayName,
        emailVerified: true,
      });
      console.log('✅ Auth user created (uid:', user.uid + ')');
    } else {
      throw error;
    }
  }

  const now = Timestamp.now();

  // admins/{uid}
  await db.collection('admins').doc(user.uid).set(
    {
      uid: user.uid,
      email: ADMIN_CONFIG.email,
      displayName: ADMIN_CONFIG.displayName,
      role: ADMIN_CONFIG.role,
      adminLevel: ADMIN_CONFIG.adminLevel,
      permissions: PERMISSIONS,
      createdAt: now,
      lastLogin: now,
      twoFactorEnabled: false,
      assignedBy: 'seed-script',
      active: true,
    },
    { merge: true }
  );
  console.log('✅ Firestore admins/' + user.uid + ' written');

  // users/{uid}
  await db.collection('users').doc(user.uid).set(
    {
      uid: user.uid,
      email: ADMIN_CONFIG.email,
      displayName: ADMIN_CONFIG.displayName,
      role: 'admin',
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      itemsPosted: 0,
      itemsResolved: 0,
    },
    { merge: true }
  );
  console.log('✅ Firestore users/' + user.uid + ' written');

  console.log('\n🎉 Done! Admin account ready:');
  console.log('   Login URL: /admin/login');
  console.log('   Email:    ', ADMIN_CONFIG.email);
  console.log('   Password: ', ADMIN_CONFIG.password);
  console.log('   UID:      ', user.uid);
  console.log('\n⚠️  Change the password after first login.');
}

seedAdmin()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
