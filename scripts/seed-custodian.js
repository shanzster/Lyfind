/**
 * Create (or repair) the Guard Station custodian account.
 * Custodians are regular users with role 'custodian' — their posts are live
 * immediately and flagged "Held at Guard Station", and they get the
 * /guard-station dashboard.
 *
 * Usage: node scripts/seed-custodian.js
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const CUSTODIAN_CONFIG = {
  email: 'guardstation@lsb.edu.ph',
  password: 'Password123!',
  displayName: 'Guard Station',
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

async function seedCustodian() {
  console.log('🏢 Creating Guard Station custodian account...\n');

  const serviceAccount = JSON.parse(readFileSync(findServiceAccountFile(), 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
  const auth = getAuth();
  const db = getFirestore();

  let user;
  try {
    user = await auth.getUserByEmail(CUSTODIAN_CONFIG.email);
    console.log('ℹ️  Auth user already exists (uid:', user.uid + ') — updating password/name');
    await auth.updateUser(user.uid, {
      password: CUSTODIAN_CONFIG.password,
      displayName: CUSTODIAN_CONFIG.displayName,
      emailVerified: true,
      disabled: false,
    });
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      user = await auth.createUser({
        email: CUSTODIAN_CONFIG.email,
        password: CUSTODIAN_CONFIG.password,
        displayName: CUSTODIAN_CONFIG.displayName,
        emailVerified: true,
      });
      console.log('✅ Auth user created (uid:', user.uid + ')');
    } else {
      throw error;
    }
  }

  const now = Timestamp.now();
  await db.collection('users').doc(user.uid).set(
    {
      uid: user.uid,
      email: CUSTODIAN_CONFIG.email,
      displayName: CUSTODIAN_CONFIG.displayName,
      role: 'custodian',
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      itemsPosted: 0,
      itemsResolved: 0,
    },
    { merge: true }
  );
  console.log('✅ Firestore users/' + user.uid + ' written (role: custodian)');

  console.log('\n🎉 Done! Custodian account ready:');
  console.log('   Login URL: /login');
  console.log('   Email:    ', CUSTODIAN_CONFIG.email);
  console.log('   Password: ', CUSTODIAN_CONFIG.password);
  console.log('   Dashboard: /guard-station');
}

seedCustodian()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
