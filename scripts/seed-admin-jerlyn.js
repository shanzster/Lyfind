/**
 * One-off: create the AdminSiJerlyn@gmail.com admin account.
 * Same logic as seed-admin.js, different credentials.
 *
 * Usage: node scripts/seed-admin-jerlyn.js
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

const ADMIN_CONFIG = {
  email: 'AdminSiJerlyn@gmail.com',
  password: 'Password123!',
  displayName: 'Admin Si Jerlyn',
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
    throw new Error('No firebase-adminsdk service-account JSON found in the repo root.');
  }
  return join(rootDir, candidates[0]);
}

async function seedAdmin() {
  console.log('🚀 Creating admin account...\n');

  const serviceAccount = JSON.parse(readFileSync(findServiceAccountFile(), 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
  const auth = getAuth();
  const db = getFirestore();

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
}

seedAdmin()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
