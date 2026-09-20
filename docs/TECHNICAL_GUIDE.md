# LyFind Technical Guide

How the system is built, what tools it uses, and how the main features work under the hood. Written to be understandable — read this before touching the code.

## 1. The stack at a glance

| Layer | Technology | Where |
|---|---|---|
| Frontend framework | React 19 + TypeScript | src/ |
| Build tool | Vite | vite.config.ts, npm run dev / build |
| Styling | Tailwind CSS + shadcn/ui components | tailwind.config.ts, src/components/ui |
| Routing | React Router v6 | src/App.tsx |
| Icons | lucide-react | imported per page |
| Toasts | sonner | toast.success(...) everywhere |
| Database | Firebase Firestore (NoSQL, real-time) | src/services/*.ts |
| Auth | Firebase Authentication (email/password + Google) | src/contexts/AuthContext.tsx |
| File storage | Cloudinary (item photos) | src/services/storageService.ts |
| AI matching | TensorFlow.js + MobileNet (runs in the browser) | src/services/aiPhotoMatcher.ts |
| Email (OTP) | Brevo API (sib-api-v3-sdk) | src/services/emailService.ts |
| Push | Firebase Cloud Messaging + a small Express server on Render | notification-server/ |
| QR codes | qrcode npm package | src/pages/lycean/Item.tsx |
| PWA | manifest.json + custom service worker | public/manifest.json, public/sw.js |
| Hosting | Vercel (frontend) | vercel.json |

There is no traditional backend. Almost everything talks to Firebase directly from the browser. Server-side work (creating staff accounts, deploying rules) is done with Node scripts in scripts/ that use the Firebase Admin SDK with the service-account JSON in the repo root.

## 2. How the code is organized

- src/pages/visitor — public pages (home, login, register)
- src/pages/lycean — logged-in student pages (Browse, Item, Post, Messages, Profile, MyItems, PhotoMatch, Notifications, GuardStation)
- src/pages/admin — admin panel (Dashboard, Users, Items, Approvals, Analytics, Announcements, ...)
- src/components — shared UI (sidebars, modals, shadcn/ui primitives)
- src/contexts — AuthContext (student auth), AdminAuthContext (admin auth), NotificationContext
- src/services — one file per domain, all Firestore access lives here. Pages never call Firestore directly; they call a service.
- scripts/ — Node admin scripts (seed accounts, deploy rules)
- functions/, notification-server/ — the only server-side pieces

Rule of thumb: to add a feature, create or extend a service in src/services, then build the UI in a page. That is the pattern every module in this app follows.

## 3. The data model (Firestore collections)

- users — profile per account. role field: student, faculty, admin, custodian.
- items — lost/found posts. Key fields: type (lost/found), status (active/resolved/archived/pending_approval), userId, photos[], aiFeatures (cached AI vectors), heldAtGuardStation, lastRenewedAt.
- conversations — one per item+pair of users. Holds participants[], unreadCount map, typing map, claim (verification state), handover (confirmation state).
- messages — chat messages, linked by conversationId.
- notifications — in-app notifications per user, with metadata for rich match cards.
- bookmarks — saved items, doc id is userId_itemId.
- watches — saved search alerts (keywords + optional category).
- ratings — exchange ratings, doc id is conversationId_raterId.
- announcements — admin campus banners.
- guardClaims — guard station pickup log.
- matches / aiMatches / photoMatches — AI matching records and queue.
- admins, adminLogs, reports, teacherVerifications — admin infrastructure.

## 4. Security rules (firestore.rules)

Every collection has explicit rules; there is no catch-all. Principles:

- A user can only write their own documents. Role/ban fields on users are blocked from self-editing.
- Items are publicly readable (needed for the public share and QR pages) but only the owner or an admin can modify them. Exception: any signed-in user may write only the aiFeatures field (the AI cache is computed by whoever's browser runs the matcher).
- Conversations and messages are readable only by their participants (messages verify this by looking up the parent conversation). Admins can monitor.
- Admin status = a document existing in the admins collection, which can only be created by the Admin SDK (seed scripts). No browser can make someone an admin.
- Custodian status is checked by reading users/{uid}.role inside the rule.

Deploying rules: node scripts/deploy-rules.js — this uses the Firebase Rules REST API with the service-account JSON, so no firebase login is needed. Run it after every edit to firestore.rules.

Gotcha to remember: reading a document that does not exist fails any rule that touches resource.data. For existence checks (bookmark toggle, hasRated) the rules authorize via the document id instead (userId_itemId pattern).

## 5. How the AI photo matching works

1. When a photo is posted, MobileNet (a pre-trained image classification network running in the browser via TensorFlow.js) converts it to a feature vector — a numeric fingerprint.
2. Vectors are cached on the item document (aiFeatures) so they are computed once.
3. Similarity between two photos = cosine similarity of their vectors, recalibrated to a 0–100 scale (raw MobileNet cosines cluster high, so the naive formula made everything look like a match).
4. autoMatchService runs on every new live post: it compares against all opposite-type active items, stores results in matches, and notifies both owners (score threshold 60).
5. The Photo Matcher page is a manual version of the same pipeline with a queue, limited to 2 uses per 12 hours (localStorage). Dev builds have override buttons.

Limitation to be honest about: MobileNet matches how things look, not identity — two similar black umbrellas will match. That is why claim verification exists.

## 6. How the trust flow works (claim → verify → handover → rate)

All state lives on the conversation document, so the existing real-time listener updates both users instantly with no extra queries.

1. Verification: owner clicks Verify Claimer, a claim object is written {status: awaiting_answer, question, claimerId}. The claimer answers (awaiting_review), the owner approves or rejects. Each step also writes a system message into the chat as an audit trail.
2. Claiming: Mark as Claimed sets the item resolved and initializes handover {ownerConfirmed: false, claimerConfirmed: false} on the conversation.
3. Handover: each side taps their confirm button; when both flags are true a completion system message is posted.
4. Rating: once handover is complete, each participant can write one rating (doc id conversationId_raterId prevents duplicates). Averages are computed with Firestore server-side aggregation (getAggregateFromServer with average/count), so no rating documents are ever downloaded.

## 7. How messaging works

- messageService.listenToUserConversations uses onSnapshot for a live conversation list; listenToMessages does the same per chat.
- Unread counts are a per-user map on the conversation, incremented on send, zeroed on read.
- Seen receipt = the other user's unread count being 0 while your message is last.
- Typing indicator = a typing.{uid} timestamp on the conversation, throttled to one write per 2 seconds; a timestamp fresher than 5 seconds renders the animated dots.
- Notifications on new messages are created client-side in the notifications collection; a push attempt also goes to the Render notification server.

## 8. How the client-side "background jobs" work

There are no cron jobs. Recurring work is done lazily when someone loads a page:

- Watch alerts: when a post goes live, the poster's browser scans the watches collection and notifies matches.
- Photo match queue: any open browser tab processes queued match requests.
- Auto-archive: loading the admin dashboard archives active items older than 45 days (throttled once/day per browser via localStorage).

This is fine for a campus-scale app but is the first thing to move to Cloud Functions if the app grows.

## 9. Accounts and roles

| Role | How created | Special behavior |
|---|---|---|
| student | self-registration, @lsb.edu.ph only | posts need admin approval |
| faculty | teacher verification flow | posts go live instantly |
| custodian | scripts/seed-custodian.js | posts live instantly, flagged Held at Guard Station, /guard-station dashboard |
| admin | scripts/seed-admin*.js | /admin panel, permissions list in the admins doc |

Registration enforces @lsb.edu.ph. Login does not (so seeded staff gmail accounts work). Admin identity is separate from user identity: it is the existence of an admins/{uid} document.

## 10. Environment and secrets

- .env holds VITE_BREVO_API_KEY, VITE_BREVO_SENDER_EMAIL, Firebase web config. Everything with the VITE_ prefix is bundled into the browser and is therefore public — do not put real secrets there.
- The Firebase Admin service-account JSON (lyfind-72845-firebase-adminsdk-*.json) in the repo root is a real secret. It powers the scripts. It should be rotated and kept out of any shared copies of this folder.
- Firebase web config being public is normal and safe — security comes from the Firestore rules, not from hiding the config.

## 11. Everyday commands

```
npm run dev                          # start dev server (localhost:3000)
npm run build                        # type-check + production build
npx tsc --noEmit                     # type-check only
node scripts/deploy-rules.js         # deploy firestore.rules
node scripts/seed-admin-jerlyn.js    # (re)create admin account
node scripts/seed-custodian.js       # (re)create custodian account
```

Dev-only testing tools (never in production builds): /seed-admin, /diagnostic routes; the +99 test spins button and the clickable cooldown timer on the Photo Matcher.

## 12. Debugging pattern for permission errors

Because the security rules are now strict, a failing button usually means a rule/query mismatch, not broken code. The pattern so far:

1. Open the browser console — Firestore prints permission-denied with the collection name.
2. Check whether the query filters on a field the rule can prove (for example, list queries must filter userId == current user when the rule requires ownership).
3. Check whether the code reads a document that might not exist while the rule touches resource.data (use doc-id-based authorization instead).
4. Edit firestore.rules, run node scripts/deploy-rules.js, retry.

Both bugs found so far (Message Owner, bookmarks) were exactly these two patterns.
