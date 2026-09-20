/**
 * Deploy firestore.rules via the Firebase Rules REST API using the
 * service-account JSON in the repo root (works without `firebase login`).
 *
 * Usage: node scripts/deploy-rules.js
 */

import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GoogleAuth } from 'google-auth-library';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const saFile = readdirSync(rootDir).find(
  f => f.includes('firebase-adminsdk') && f.endsWith('.json')
);
if (!saFile) throw new Error('No firebase-adminsdk JSON found in repo root');

const serviceAccount = JSON.parse(readFileSync(join(rootDir, saFile), 'utf8'));
const projectId = serviceAccount.project_id;
const rulesSource = readFileSync(join(rootDir, 'firestore.rules'), 'utf8');

const auth = new GoogleAuth({
  credentials: serviceAccount,
  scopes: ['https://www.googleapis.com/auth/firebase', 'https://www.googleapis.com/auth/cloud-platform'],
});

const client = await auth.getClient();
const { token } = await client.getAccessToken();
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
const base = `https://firebaserules.googleapis.com/v1/projects/${projectId}`;

// 1. Create a ruleset from the local file
const rulesetRes = await fetch(`${base}/rulesets`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    source: { files: [{ name: 'firestore.rules', content: rulesSource }] },
  }),
});
if (!rulesetRes.ok) throw new Error(`Ruleset creation failed: ${await rulesetRes.text()}`);
const ruleset = await rulesetRes.json();
console.log('✅ Ruleset created:', ruleset.name);

// 2. Point the cloud.firestore release at the new ruleset
const releaseName = `projects/${projectId}/releases/cloud.firestore`;
const patchRes = await fetch(`${base}/releases/cloud.firestore`, {
  method: 'PATCH',
  headers,
  body: JSON.stringify({
    release: { name: releaseName, rulesetName: ruleset.name },
  }),
});
if (!patchRes.ok) {
  // Release may not exist yet — create it
  const createRes = await fetch(`${base}/releases`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: releaseName, rulesetName: ruleset.name }),
  });
  if (!createRes.ok) throw new Error(`Release update failed: ${await createRes.text()}`);
}
console.log('🚀 Firestore rules deployed to project:', projectId);
