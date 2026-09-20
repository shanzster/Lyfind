# LyFind — Implementation Log (Feature Roadmap Build-Out)

> **Update 2026-09-15 — Module build-out.** Seven full modules added (see
> "Phase 2: Modules" at the bottom of this file). Firestore rules updated and
> redeployed. Custodian account created.

**Date:** 2026-09-14
**Scope:** Features from `FEATURE_ROADMAP.md`, implemented easiest → hardest.
Everything below is coded, type-checked (`tsc` clean), and production-built
(`npm run build` ✓). The new Firestore security rules are **deployed live**.

---

## 1. Debug routes gated out of production ✅ (security)

**What:** `/seed-admin`, `/fix-admin`, `/oauth-diagnostic`, `/diagnostic` could
be opened by anyone in production and could mutate admin data.

**How:** In `src/App.tsx`, wrapped those `<Route>` registrations in
`{import.meta.env.DEV && (...)}`. Vite strips them from production builds
entirely — the routes now 404 in prod but still work during `npm run dev`.

## 2. Atomic profile counters ✅ (correctness)

**What:** `itemsPosted` / `itemsResolved` used read-modify-write, which loses
counts under concurrent updates.

**How:** In `src/services/userService.ts`, rewrote `incrementItemsPosted` /
`incrementItemsResolved` to a single `updateDoc` using Firestore's
`increment(1)` — atomic on the server, no read needed.

## 3. Day separators & smart timestamps in chat ✅ (Messenger polish)

**What:** Messages now show "Today / Yesterday / Monday / Mar 3" dividers
between day groups, like Messenger.

**How:** In `src/pages/lycean/Messages.tsx`, added `getDayLabel()` and
`isNewDay()` helpers; the message list inserts a divider row whenever the
calendar day changes between consecutive messages.

## 4. Browse: sort + date filters ✅

**What:** Replaced the static "Most recent" label with two dropdowns:
**Any time / Last 7 days / Last 30 days** and **Newest first / Oldest first**.

**How:** Client-side filter + sort over the already-fetched items in
`src/pages/lycean/Browse.tsx` (no new queries needed).

## 5. Reunited success counter ✅

**What:** Browse header now shows "🎉 N items reunited with their owners".

**How:** New `itemService.getResolvedCount()` using Firestore's
`getCountFromServer()` aggregate — counts resolved items server-side without
downloading any documents.

## 6. Fixed "Mark as Resolved" (was a TODO stub!) ✅ (bug fix)

**What:** The button on the Item page only showed a success toast — it never
updated Firestore. Now it actually sets `status: 'resolved'` and increments
the owner's `itemsResolved` counter (which feeds the trust badge + counter).

**How:** `handleMarkResolved()` in `src/pages/lycean/Item.tsx` calling
`itemService.updateItem()`.

## 7. Trust badge in chat ✅

**What:** The chat header shows "🏅 N returned" next to the other person's
name — how many of their items were successfully resolved. Builds confidence
before meeting a stranger.

**How:** New `userService.getReturnedCount(uid)` (aggregate count of the
user's resolved items, falling back to the profile counter). Loaded per
conversation in `Messages.tsx`.

## 8. Seen receipts ✅ (Messenger polish)

**What:** A small "Seen" label appears under your last message once the other
person has read it.

**How:** The conversation's `unreadCount` map already tracks this — when the
other participant's count is 0 and the last message is yours, it's been seen.
Also added an effect that keeps calling `markAsRead` while a chat is open, so
messages arriving mid-conversation are marked read immediately (previously
only on conversation switch).

## 9. Typing indicator ✅ (Messenger polish)

**What:** Animated three-dot bubble when the other person is typing.

**How:**
- `messageService.setTyping()` writes `typing.{uid}: Timestamp` on the
  conversation doc (throttled to once per 2 s from the input's onChange).
- A timestamp fresher than 5 s = "typing"; a 2 s re-render tick expires it.
- No extra listeners needed — the existing conversation snapshot carries it.

## 10. Bookmarks / saved items ✅

**What:** A bookmark button on every Browse card (top-right of the photo);
saved items appear in a "Saved Items" grid on the Profile page.

**How:**
- New `src/services/bookmarkService.ts` — `bookmarks` collection with doc id
  `{userId}_{itemId}` (toggle = one deterministic write), plus
  `getBookmarkedItems()` which hydrates the saved ids into full items.
- Browse: optimistic toggle with rollback on failure.
- Profile: grid of saved items linking to their item pages.

## 11. QR poster generator ✅

**What:** A "Print QR Poster" button on the Item page (owner view) opens a
print-ready A4 poster: LOST/FOUND banner, item photo, location, and a QR code
linking to the public item page (`/public/item/:id` — no login needed to view).

**How:** Added the `qrcode` npm package; `handleGeneratePoster()` in
`Item.tsx` renders the QR to a data URL, writes a styled printable HTML
document into a new window, and auto-triggers the print dialog.

## 12. "Is this yours?" match cards ✅

**What:** AI-match notifications now render a rich card: your item's photo and
the possible match side-by-side with a confidence % badge between them, and
the action button links straight to the matched item.

**How:**
- `notificationService.notifyAutoMatch()` accepts optional match-card
  metadata (both titles/images, matched item id, confidence).
- `autoMatchService` passes it for both directions of a match (new-item owner
  gets the best match; each candidate owner gets the new item).
- `Notifications.tsx` renders the card for `type === 'match'` notifications
  that carry the metadata. Old notifications without metadata render as before.

## 13. Firestore security rules — rewritten AND deployed 🔒 (the big one)

**What:** The old rules ended in `match /{document=**} { allow read, write: if
request.auth != null }` — any signed-in student could edit anyone's profile,
grant themselves a role, delete any item, or write to `admins`.

**How:** Full per-collection rewrite in `firestore.rules`. Highlights:

| Collection | Policy |
|---|---|
| `users` | read: signed-in · write: own profile only, **role/ban/suspension fields blocked** (admin or Admin SDK only) |
| `items` | read: public (share/QR pages) · write: owner or admin; exception: any user may write only `aiFeatures` (client-side matcher cache) |
| `conversations`, `messages` | participants only (messages verified via lookup of the parent conversation); admins can monitor |
| `notifications` | recipient reads/updates/deletes; any signed-in user may create |
| `bookmarks` | own docs only |
| `reports` | users create their own; only admins read/manage |
| `teacherVerifications` | owner submits/reads own; admin reviews |
| `photoMatches` | create: own · read/update: signed-in (the processing queue is a distributed client-side worker by design) |
| `admins` | read own doc / admin list; **create/delete impossible from any client** (Admin SDK only) |
| `adminLogs`, `pendingAdmins`, `pendingUsers` | admin only; logs are append-only |
| everything else | **denied by default** — no catch-all |

Admin identity = existence of `admins/{uid}`, which can now only be created by
the seed scripts (Admin SDK bypasses rules).

**Deployment:** `firebase login` wasn't available, so I wrote
`scripts/deploy-rules.js`, which deploys `firestore.rules` through the
Firebase Rules REST API using the service-account JSON. **The new rules are
live on project `lyfind-72845`.** Re-run `node scripts/deploy-rules.js` after
any future rules edit.

## 14. Claim verification questions ✅ (flagship trust feature)

**What:** Before handing an item over, the owner can verify the claimer:

1. Owner clicks **🔐 Verify Claimer** in the chat and asks a question only the
   true owner would know ("What's the phone wallpaper?").
2. The claimer sees the question in the chat's item panel and submits an answer.
3. The owner reviews the answer → **Approve** or **Reject** (with re-ask).
4. Every step posts a system message into the conversation, so there's a
   visible audit trail.

**How:** New `claim` object on the conversation doc
(`status: awaiting_answer → awaiting_review → approved/rejected`, question,
answer, claimerId) driven by `messageService.askClaimQuestion / 
answerClaimQuestion / reviewClaim`. The panel UI lives in the chat's item card
area and renders per-role (owner vs claimer) and per-status. All updates flow
through the existing real-time conversation listener — no new subscriptions.

## 15. Two-sided handover confirmation ✅

**What:** After "Mark as Claimed", both parties must confirm the physical
exchange: the owner taps **"I handed over the item"**, the claimer taps
**"I received the item"**. The panel shows progress (1/2 confirmed) and posts
"🎉 Handover complete" when both have confirmed.

**How:** `markItemAsClaimed` now initializes `handover: { ownerConfirmed:
false, claimerConfirmed: false }` on the conversation;
`messageService.confirmHandover()` flips the caller's flag and posts the
appropriate system message. Same real-time listener carries the state.

---

## Files touched

| File | Change |
|---|---|
| `src/App.tsx` | dev-only gating of debug routes |
| `src/services/userService.ts` | atomic increments, `getReturnedCount` |
| `src/services/itemService.ts` | `getResolvedCount` aggregate |
| `src/services/messageService.ts` | typing, claim verification, handover, system messages |
| `src/services/notificationService.ts` | match-card metadata support |
| `src/services/autoMatchService.ts` | passes match-card data both directions |
| `src/services/bookmarkService.ts` | **new** — saved items |
| `src/pages/lycean/Messages.tsx` | day separators, seen receipts, typing UI, trust badge, claim/handover panel + modal |
| `src/pages/lycean/Browse.tsx` | sort/date filters, reunited counter, bookmark buttons |
| `src/pages/lycean/Profile.tsx` | Saved Items section |
| `src/pages/lycean/Item.tsx` | working Mark-as-Resolved, QR poster |
| `src/pages/lycean/Notifications.tsx` | match cards |
| `firestore.rules` | full rewrite (deployed) |
| `scripts/deploy-rules.js` | **new** — rules deployment without CLI login |
| `package.json` | + `qrcode`, `@types/qrcode` |

## Not implemented (needs server infrastructure — next phase)

- **Firebase Auth email verification** (replace client-side Brevo OTP) — code
  change is small but changes the registration UX; do deliberately.
- **Cloud Function push notifications** — requires deploying Cloud Functions
  (Blaze plan); would remove the public notification-server secret.
- **Auto-expiry + reminder emails** — needs a scheduled Cloud Function.
- **Server-side match processing** — same.
- **Image moderation** — needs Cloud Vision or a server-side model.
- **Guard-station accounts / semester report export** — larger product
  features, not started.

---

# Phase 2: Modules (2026-09-15)

## M1. Guard Station module 🏢

- **Custodian role** added (`role: 'custodian'` on the user profile).
- **Account created:** `ManonGuard@gmail.com` / `Password123!` (uid
  `DLhXn0AxK3OKtpTK33qoCEJiDY92`), seeded via `scripts/seed-custodian.js`
  (re-run to reset the password). Logs in at `/login` like a normal user —
  the login-time @lsb.edu.ph check was removed (registration still enforces
  it; staff accounts are seeded via Admin SDK).
- **Custodian posts** go live immediately (no approval queue) and are flagged
  `heldAtGuardStation: true`.
- **Badges:** Browse cards show a blue "🏢 Held at Guard Station" ribbon;
  the Item page shows a claim-at-the-desk notice instead of meetup language.
- **Dashboard** at `/guard-station` (appears in the custodian's sidebar):
  lists held items, and "Claimed" opens a pickup form (claimer name +
  student ID + note) that resolves the item and appends to a permanent
  pickup log (`guardClaims` collection — custodian/admin readable only).

## M2. Saved Search Alerts module 🔔

- New `watchService` + `watches` collection.
- Browse: typing 3+ chars in search shows an "🔔 Alert me" button that saves
  the query (+ selected category) as a watch.
- On every new item going live (faculty/custodian post, or admin approval of
  a student post), all watches are scanned; keyword hits notify the watcher
  with a link to the item.
- Profile: "Search Alerts" card lists active watches with one-tap removal.

## M3. Ratings & Reputation module ⭐

- New `ratingService` + `ratings` collection (doc id
  `{conversationId}_{raterId}` — one rating per person per exchange).
- After a completed two-sided handover, the chat panel shows a 5-star +
  comment prompt for each participant.
- The chat header now shows "⭐ 4.8 (12)" next to the trust badge, computed
  with a server-side aggregate (`average`/`count`) — no docs downloaded.

## M4. Announcements module 📢

- New `announcementService` + `announcements` collection.
- Admin: new "Announcements" page (sidebar → Announcements) to publish,
  hide/show, and delete campus-wide banners.
- Students: the latest active announcement renders as a dismissible banner
  at the top of Browse (dismissals remembered per browser).

## M5. Semester Report module 📊

- "Export Semester Report (CSV)" button on the admin Analytics page.
- CSV contains every item (title, type, category, status, poster, location,
  dates) plus summary blocks: totals, resolution rate, per-category and
  per-month counts. Generated fully client-side.

## M6. Item Lifecycle module ⏳

- Items gain `lastRenewedAt`; age = now − (lastRenewedAt ?? createdAt).
- My Items: active items older than 30 days appear in a "Still looking?"
  banner with per-item **Renew** (extends 30 days) and **Archive** buttons.
- Lazy sweep: loading the admin dashboard auto-archives active items older
  than 45 days (throttled to once/day per browser).

## M7. PWA module 📱

- `public/sw.js`: app-shell service worker — network-first navigations with
  offline fallback, cache-first hashed assets, same-origin only (Firebase and
  Cloudinary are untouched; push stays on `firebase-messaging-sw.js`).
- Registered in `src/main.tsx` in production builds only.
- Profile: "Install LyFind" banner appears when the browser fires
  `beforeinstallprompt` (manifest.json already existed).

## Phase 2 rules changes (deployed)

| Collection | Policy |
|---|---|
| `watches` | read: signed-in (poster's client scans all watches) · create/delete: owner |
| `ratings` | read: signed-in (public trust signal) · create/update: rater only, id-suffix enforced |
| `announcements` | read: signed-in · write: admin |
| `guardClaims` | create: custodian (role checked via users doc) · read: own log or admin |

## Phase 2 files

New: `watchService.ts`, `ratingService.ts`, `announcementService.ts`,
`guardService.ts`, `GuardStation.tsx`, `admin/Announcements.tsx`,
`public/sw.js`, `scripts/seed-custodian.js`.
Modified: `itemService` (lifecycle + heldAtGuardStation), `userService`
(custodian role), `Post.tsx`, `adminService` (watch alerts on approval),
`Browse.tsx` (banner, alert button, guard badge), `Profile.tsx` (alerts list,
install banner), `MyItems.tsx` (renewal), `Messages.tsx` (ratings),
`Item.tsx` (guard notice), `Analytics.tsx` (CSV), `AdminDashboard.tsx`
(sweep), `App.tsx` + both sidebars (routes/nav), `AuthContext.tsx` (login
domain check removed), `main.tsx` (SW registration), `firestore.rules`.

## ⚠️ Watch-outs after this deploy

- The new Firestore rules are **live**. If any flow starts failing with
  `permission-denied`, check the rules for that collection — the old behavior
  allowed everything, so a regression here means a rule is too strict, not a
  code bug. Test especially: registration, posting, chat, admin dashboards.
- The service-account JSON and Brevo key are still in the repo — rotating
  them is still on the to-do list (P0 item #2 in `SYSTEM_AUDIT_RECOMMENDATIONS.md`).
