# LyFind Deployment Guide

Single source of truth for deploying LyFind. (The ~95 historical fix-note markdown
files are archived in `docs/archive/` for reference.)

## Architecture

- **Frontend (SPA):** Vite + React, deployed on **Vercel**
- **Database/Auth:** **Firebase** project `lyfind-72845` (Firestore + Firebase Auth)
- **Images:** Cloudinary (unsigned upload from the browser)
- **Transactional email / OTP:** Brevo (client-side via `sib-api-v3-sdk`)
- **Push notifications:** `notification-server/` (Express + FCM), deployed on **Render**

## 1. Vercel (frontend)

1. Import the repo in Vercel; framework preset **Vite**.
2. Build command `npm run build`, output directory `dist`.
3. `vercel.json` already contains the SPA rewrite (all routes → `index.html`).
4. Set the environment variables below, then deploy.

### Environment variables

| Variable | Purpose |
|---|---|
| `VITE_FIREBASE_API_KEY` etc. | Firebase web config (see `src/lib/firebase.ts`) |
| `VITE_BREVO_API_KEY` | Brevo API key for OTP / credential emails |
| `VITE_BREVO_SENDER_EMAIL` | Verified Brevo sender address |
| `VITE_NOTIFICATION_SERVER_URL` | Render URL of the notification server |
| `VITE_NOTIFICATION_API_SECRET` | Shared secret with the notification server |
| `VITE_FIREBASE_VAPID_KEY` | Web push VAPID key |

Note: if `VITE_BREVO_API_KEY` is missing, registration works WITHOUT email OTP
(direct account creation) — this is intentional fallback behavior.

**Brevo requirement:** the Brevo account must have **Authorised IPs DEACTIVATED**
(https://app.brevo.com/security/authorised_ips) because OTP emails are sent from
each user's browser (every user has a different IP). The sender address must be
verified at https://app.brevo.com/senders/list.

## 2. Firebase

- Deploy Firestore rules: `firebase deploy --only firestore:rules`
- Deploy indexes: `firebase deploy --only firestore:indexes`
- A composite index on `teacherVerifications` (`status` ASC, `submittedAt` ASC)
  is recommended (the code has a fallback if it's missing).
- Auth providers required: **Email/Password** and **Google** (restricted in-app
  to `@lsb.edu.ph`).
- Add your deployed domains to Auth → Settings → Authorized domains.

## 3. Render (notification-server)

1. New Web Service from the `notification-server/` directory.
2. Set `FIREBASE_SERVICE_ACCOUNT` (JSON), `API_SECRET`, `PORT` per its README.
3. Point `VITE_NOTIFICATION_SERVER_URL` at the resulting URL.

## 4. Seeding an admin

Generate a fresh Firebase Admin SDK service-account key (Project Settings →
Service accounts), keep it OUT of git, and run:

```
node scripts/seed-admin.js
```

Admin panel login is at `/admin/login`.
