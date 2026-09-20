# LyFind — Details About the Project

This document is a complete, factual reference about the LyFind system, written
to be given to an AI assistant (or a new team member) as source material for
revising documentation, writing a thesis manuscript, or preparing a defense.
Everything stated here is implemented and deployed unless marked otherwise.

---

## 1. Project identity

- Name: LyFind
- Type: Photo-based lost-and-found campus web application
- Institution: Lyceum of Subic Bay (LSB), Olongapo City, Philippines
- Live URL: https://lyfind-72845.web.app (Firebase Hosting)
- Tagline: Campus Lost & Found, powered by AI photo matching
- Brand: dark purple theme (#2f1632 background), orange accent (#ff7400),
  Benzin font for display headings, Movatif for body text, glassmorphism UI.

## 2. Problem statement

Lost-and-found on campus is traditionally a paper logbook at a guard desk.
Items sit unclaimed because owners do not know they were found; finders have
no easy way to locate owners; there is no verification that a claimer really
owns an item; and the school has no records or statistics. LyFind digitizes
the entire flow: posting, discovery, AI-assisted matching, secure
communication, ownership verification, physical handover confirmation, and
institutional record-keeping.

## 3. User roles

| Role | How obtained | Capabilities |
|---|---|---|
| Visitor | none | landing pages, public item pages (via share link / QR) |
| Student | self-registration, restricted to @lsb.edu.ph emails, OTP email verification | post items (admin-approved first), browse, search, bookmark, saved-search alerts, message, claim, rate |
| Faculty (teacher) | student account + teacher verification flow (ID reviewed by admin), or seeded | same as student but posts go live instantly, VERIFIED badge |
| Custodian (guard station) | seeded by Admin SDK script | posts go live instantly and are flagged "Held at Guard Station"; dedicated dashboard with a physical pickup log |
| Admin | document in the `admins` Firestore collection, creatable only via Admin SDK seed script | full admin panel: approvals, user management (suspend/ban), item management, reports, message monitoring, teacher verifications, announcements, analytics + CSV export, activity logs |

Policy: direct messaging between students and teachers is blocked in both
directions. Attempting it shows a disclaimer modal with the teacher's school
email (tap-to-copy) instead of opening a chat.

## 4. Complete feature list

### Posting & discovery
- Post lost/found items with photos, category, description, campus location
  (interactive floor-plan pin + room number).
- Student posts enter an admin approval queue with risk levels; faculty and
  custodian posts go live instantly.
- Browse page: search, category pills, Lost/Found/All filter, date-range
  filter (7/30 days), newest/oldest sort, "N items reunited" success counter,
  dismissible campus announcement banner.
- Bookmarks (saved items) with a Saved Items grid in the profile.
- Saved-search alerts ("watches"): save a keyword search; get notified when a
  matching item is posted.
- Item lifecycle: posts older than 30 days prompt the owner to renew or
  archive; posts older than 45 days are auto-archived (lazy sweep on admin
  dashboard load).
- Public item pages at /public/item/:id (no login) for sharing and QR posters.
- Printable QR poster: one-page, minimalist white A4 poster (logo, LOST/FOUND
  heading, photo, two-column details: item/category/distinguishing marks and
  where/date, QR code linking to the public page). Uses the app's own fonts.

### AI photo matching
- MobileNet (TensorFlow.js) runs in the browser; each photo becomes a feature
  embedding, cached on the item document (aiFeatures).
- Similarity = cosine similarity recalibrated to a 0–100 scale.
- Automatic matching on every new live post against all opposite-type active
  items (threshold 60); both owners are notified.
- Match notifications render as rich cards: both photos side by side with a
  confidence percentage.
- Manual Photo Matcher page: upload a photo, queued processing, results with
  scores; limited to 2 uses per 12 hours per user.
- Known limitation (state honestly in documentation): MobileNet matches visual
  similarity, not object identity — two similar items match each other. This
  is mitigated by the claim-verification flow.

### Messaging (Messenger-style)
- Real-time chat per item (Firestore listeners), one conversation per
  item + user pair.
- Conversation list: avatar circles strip at top (with item thumbnail badges),
  card-style rows with relative timestamps, unread highlighting (tint, bold,
  count pill), chat search by person or item.
- In-chat: image attachments (up to 5), campus floor-plan location sharing
  with animated pin, day separators, typing indicator, seen receipts.
- Trust signals in the chat header: "🏅 N returned" badge (count of the other
  user's resolved items) and "⭐ 4.8 (12)" rating summary.
- Reporting: report a conversation (harassment/spam/fraud/etc.) to admins;
  admins monitor all conversations (disclosed by an in-chat notice).

### Claim → verify → handover → rate (the trust pipeline)
1. Ownership verification: the item owner sends a question only the true
   owner could answer; the claimer answers; the owner approves or rejects.
   Every step posts a system message (audit trail). State machine on the
   conversation document: awaiting_answer → awaiting_review →
   approved/rejected.
2. Mark as Claimed: owner sets a campus meetup location; item becomes
   resolved; claimer is notified.
3. Two-sided handover: both parties independently confirm ("I handed it
   over" / "I received it"); completion posts a celebration system message.
4. Rating: after completion each participant rates the exchange 1–5 stars
   with an optional comment (one rating per person per conversation, enforced
   by deterministic doc ids). Averages computed with Firestore server-side
   aggregation.

### Guard Station module
- Custodian posts items physically held at the guard/SSO desk.
- Students see "🏢 Held at Guard Station" on cards and a claim-at-the-desk
  notice on the item page (no meetup).
- Custodian dashboard (/guard-station): held-items list and a Log Pickup form
  (claimer name + student ID + note) that resolves the item and appends to a
  permanent pickup log (guardClaims collection).

### Notifications
- In-app: Firestore notifications collection; bell with live badge;
  Notifications page with filters, mark-read, delete, match cards.
- Browser popups while the app is open (Notification API via listener).
- Push (app closed): Express server ("notification-server", deployed on
  Render) using Firebase Cloud Messaging. STATUS: the Render deployment is
  currently offline (account lost); code and render.yaml blueprint are ready
  for redeployment. In-app notifications are unaffected.
- Campus announcements: admins publish banners (admin page), students see the
  latest active one atop Browse, dismissible per browser.

### Admin panel
- Dashboard with stats; pending approvals (approve/reject with reasons; risk
  levels); users management (view, suspend, ban, create); items management;
  item details; reports management; messages monitoring; teacher
  verifications review; announcements; analytics with one-click Semester
  Report CSV export (per-item rows + totals, resolution rate, per-category
  and per-month summaries); activity logs (all admin actions logged);
  settings.

### PWA
- manifest.json (installable, app shortcuts) + custom service worker
  (public/sw.js): network-first navigations with offline fallback,
  cache-first hashed assets, production-only registration. Install prompt
  banner in Profile.

## 5. Architecture

- Serverless-first: the React SPA talks directly to Firebase (Auth,
  Firestore, Cloud Messaging). There is no application server for core
  features.
- Pattern: pages (src/pages) call services (src/services, one per domain);
  services are the only layer touching Firestore. Contexts provide auth state
  (AuthContext for users, AdminAuthContext for admins, NotificationContext).
- Client-side background jobs (no cron): watch-alert scanning runs in the
  poster's browser on post; the photo-match queue is processed by any open
  tab; the 45-day archive sweep runs on admin dashboard load (throttled
  once/day via localStorage). Documented trade-off: acceptable at campus
  scale; first candidates for Cloud Functions migration.
- Admin tooling: Node scripts (scripts/) using the Firebase Admin SDK with a
  service-account key — seed-admin-jerlyn.js, seed-teacher.js,
  seed-custodian.js, deploy-rules.js (deploys firestore.rules via the
  Firebase Rules REST API, no CLI login needed).
- The only servers: notification-server/ (Express, push relay, currently
  offline) and functions/resetUserPassword.js (Cloud Function).

## 6. Technology stack (exact)

React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix primitives),
React Router v6, lucide-react icons, sonner toasts, Firebase JS SDK v12
(Auth, Firestore, Messaging), firebase-admin (scripts), TensorFlow.js +
@tensorflow-models/mobilenet, qrcode, sib-api-v3-sdk (Brevo email),
Cloudinary (image hosting), Firebase Hosting (deployed), Vercel config also
present, Render (push server), recharts (admin charts), Tesseract (OCR for
location picker).

## 7. Data model (Firestore collections)

users, items, conversations, messages, notifications, bookmarks (id:
uid_itemId), watches, ratings (id: conversationId_raterId), announcements,
guardClaims, matches, aiMatches, photoMatches, reports,
teacherVerifications (id: uid), admins, adminLogs, pendingAdmins,
pendingUsers.

Item key fields: type lost|found; status active|resolved|archived|
pending_approval; photos[]; aiFeatures cache; heldAtGuardStation;
lastRenewedAt; claimedBy/claimedAt/meetupLocation; approval metadata.

Conversation key fields: participants[owner, inquirer], participantNames/
Photos maps, unreadCount map, typing map (timestamps), claim state object,
handover {ownerConfirmed, claimerConfirmed}, lastMessage/lastMessageTime.

## 8. Security

- Firestore security rules: per-collection, deployed, no catch-all. Users
  write only their own docs (role/ban fields excluded); items publicly
  readable, owner/admin writable (exception: aiFeatures writable by any
  signed-in user for the shared AI cache); conversations/messages restricted
  to participants (verified via parent-conversation lookup) with admin
  monitoring; admin docs creatable only via Admin SDK; announcements
  admin-write; guardClaims custodian-write (role verified via users doc);
  ratings one-per-rater enforced by doc-id suffix.
- Registration restricted to @lsb.edu.ph; login is domain-unrestricted so
  Admin-SDK-seeded staff accounts (gmail) can sign in.
- Email verification: 6-digit OTP emailed via Brevo. KNOWN WEAKNESS (state as
  limitation/future work): the OTP is generated and checked client-side, so
  it is advisory, not enforcement; the plan is Firebase Auth built-in email
  verification or a Cloud Function.
- Debug/seed routes and all testing tools are excluded from production
  builds via import.meta.env.DEV.
- Admin actions are written to adminLogs (audit trail).
- Messaging safety: report system, admin monitoring notice, teacher↔student
  messaging ban.

## 9. Deployment

- Frontend: Firebase Hosting, project lyfind-72845; deploy = npm run build
  then firebase deploy --only hosting (service-account auth works without
  interactive login). Live now.
- Firestore rules: node scripts/deploy-rules.js. Live now.
- Push server: Render free tier via notification-server/render.yaml; needs
  env vars API_SECRET and FIREBASE_SERVICE_ACCOUNT_BASE64. Currently
  offline pending a new Render account.
- Version control: local git repository initialized (branch main); GitHub
  remote pending creation. Secrets (.env, service-account JSON, base64 file)
  are gitignored.

## 10. Known limitations / future work (honest list for the paper)

1. Client-side OTP provides no real enforcement (see §8).
2. Push notifications require the Render service to be redeployed.
3. Client-side background jobs depend on open browser tabs; should migrate
   to Cloud Functions (requires Blaze plan).
4. MobileNet similarity is visual, not identity; CLIP embeddings or
   photo+text hybrid scoring are the proposed upgrades.
5. No automated test suite; verification is manual + TypeScript.
6. Admin dashboards fetch whole collections (no pagination yet).
7. Brevo free tier caps at 300 emails/day.
8. Secrets that were previously committed should be rotated.
9. Uploaded images are not moderated automatically.

## 11. Statistics-ready claims for documentation

- 4 user roles + visitor; 19 Firestore collections; ~15 student-facing pages
  and 14 admin pages; 15 services.
- Feature milestones delivered in the final build-out: 15 improvements
  (phase 1) + 7 modules (phase 2), all deployed.
- First-load bundle previously optimized from ~752 KB to ~400 KB gzip via
  lazy loading and chunking.
- End-to-end trust pipeline: verification question → approval → claim with
  meetup → dual handover confirmation → mutual rating.

## 12. Test accounts (for demo scripts in documentation)

- Admin: AdminSiJerlyn@gmail.com / Password123! at /admin/login
- Teacher: teacher@lsb.edu.ph / Password123! at /login
- Custodian: ManonGuard@gmail.com / Password123! at /login (dashboard at
  /guard-station)
- Students: register with any @lsb.edu.ph email.

## 13. Related internal documents

- docs/SESSION_LOG.md — chronological log of the final development session
- docs/IMPLEMENTATION_LOG.md — per-feature implementation details
- docs/TECHNICAL_GUIDE.md — deeper how-it-works guide
- docs/FEATURE_ROADMAP.md — the roadmap the build followed
- docs/ACCOUNTS.md — accounts and login walkthroughs
- SYSTEM_AUDIT_RECOMMENDATIONS.md — security audit that motivated the rules
  rewrite
