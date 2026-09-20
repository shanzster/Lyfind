# LyFind Development Log — September 14–15, 2026

A plain record of everything done in this working session, in order.

## 1. Fixed the email verification error (OTP not sending)

- Problem: registration showed "email verification is unavailable" because Brevo rejected our API key with a 401 error.
- Cause: the Brevo account had "Authorised IPs" enabled, which blocks API calls from unknown IP addresses. Since the app sends OTP from each user's browser, this can never work.
- Fix: deactivated Authorised IPs at https://app.brevo.com/security/authorised_ips (done in the Brevo dashboard, no code change).
- Verified the API key works and the sender jherlyndelacruz24@gmail.com is verified in Brevo.
- File involved: src/services/emailService.ts

## 2. Created a new admin account

- The old seeded admin password was not what we thought (seed script used LyFindAdmin2026!, the old SeedAdmin page used Admin123!@#).
- Created a fresh super-admin via a one-off script:
  - Email: AdminSiJerlyn@gmail.com
  - Password: Password123!
  - Login: /admin/login
- Script: scripts/seed-admin-jerlyn.js (re-run it to reset the password).

## 3. Messenger-style circles in Messages

- Added a horizontal strip of avatar circles at the top of the conversation list, one per chat, each with a small thumbnail of the item being discussed, unread ring/badge, and the person's first name.
- File: src/pages/lycean/Messages.tsx

## 4. Mobile fixes in Messages

- The floating action button (FAB) was hidden on the whole Messages page, leaving no way to navigate on mobile. Now it shows on the conversation list and only hides while a chat is open.
- Fixed the avatar circles getting cut off at the top (padding inside the scroll container).
- Files: src/components/lycean-sidebar.tsx, src/pages/lycean/Messages.tsx

## 5. Message notifications explained + unread highlighting

- Confirmed messages already trigger in-app notifications (bell + Notifications page) and attempt a push via the notification server.
- Added Messenger-style highlighting for unread conversations: orange row tint, bold name, bright preview text, orange dot, count badge.
- File: src/pages/lycean/Messages.tsx

## 6. System review and feature roadmap

- Full read-through of the system; wrote a prioritized feature list split into UI and backend.
- Document: docs/FEATURE_ROADMAP.md

## 7. Phase 1 build-out (15 items, easiest to hardest)

Full details in docs/IMPLEMENTATION_LOG.md. Summary:

1. Debug routes (/seed-admin, /fix-admin, /diagnostic, /oauth-diagnostic) removed from production builds — src/App.tsx
2. Atomic counters for itemsPosted/itemsResolved — src/services/userService.ts
3. Day separators in chat (Today / Yesterday / Mar 3) — Messages.tsx
4. Sort and date filters in Browse — src/pages/lycean/Browse.tsx
5. Reunited counter on Browse ("N items reunited") — Browse.tsx + itemService.ts
6. Fixed the Mark as Resolved button (it was a stub that saved nothing) — src/pages/lycean/Item.tsx
7. Trust badge in chat ("N returned") — Messages.tsx + userService.ts
8. Seen receipts under your last message — Messages.tsx
9. Typing indicator (animated dots) — Messages.tsx + messageService.ts
10. Bookmarks: save button on Browse cards + Saved Items in Profile — new src/services/bookmarkService.ts
11. QR poster generator (print-ready poster with scan-to-claim QR) — Item.tsx, added the qrcode package
12. Match cards in Notifications (side-by-side photos + confidence %) — Notifications.tsx, notificationService.ts, autoMatchService.ts
13. Firestore security rules fully rewritten and deployed (old rules let any user write anything) — firestore.rules, deployed with scripts/deploy-rules.js
14. Claim verification questions in chat (owner asks, claimer answers, owner approves) — messageService.ts + Messages.tsx
15. Two-sided handover confirmation ("I handed it over" / "I received it") — same files

## 8. Bug fixes caused by the new security rules

- "Failed to start conversation" when clicking Message Owner: the conversation lookup queried by the owner's id instead of the current user's. Fixed in messageService.getConversationByItemAndUsers.
- "Failed to update saved items" when bookmarking: rules could not evaluate a read on a bookmark that did not exist yet. Fixed by authorizing via the doc id prefix (uid_itemId) and redeployed rules.

## 9. Testing tools (dev builds only, invisible in production)

- "+99 test spins" button on the Photo Matcher to bypass the 2-per-12h limit.
- Clicking the cooldown timer asks "override time reset?" and clears the cooldown.
- File: src/pages/lycean/PhotoMatch.tsx

## 10. Mobile fix: Match History overlapping text

- History cards now stack vertically on phones, badges wrap, titles truncate, buttons go full width.
- File: src/pages/lycean/PhotoMatch.tsx

## 11. Phase 2: seven new modules (leaderboard skipped by request)

Full details in docs/IMPLEMENTATION_LOG.md (Phase 2 section). Summary:

- Guard Station: custodian role, instant posts flagged "Held at Guard Station", blue badge in Browse, claim-at-desk notice on the item page, dashboard at /guard-station with a pickup log (name + student ID). New files: src/services/guardService.ts, src/pages/lycean/GuardStation.tsx, scripts/seed-custodian.js
- Custodian account created: ManonGuard@gmail.com / Password123! — logs in at /login, dashboard at /guard-station. The login-time @lsb.edu.ph check was removed (registration still enforces it).
- Saved search alerts: "Alert me" button next to Browse search, notifications when matching items are posted, manage alerts in Profile. New file: src/services/watchService.ts
- Ratings: 5-star prompt after a completed handover, average shown in the chat header. New file: src/services/ratingService.ts
- Announcements: admin page at /admin/announcements, dismissible banner at the top of Browse. New file: src/services/announcementService.ts
- Semester report: Export CSV button on /admin/analytics (all items + totals, resolution rate, per-category and per-month counts).
- Item lifecycle: renew/archive prompts in My Items for 30-day-old posts; the admin dashboard auto-archives posts older than 45 days.
- PWA: offline service worker (public/sw.js) registered in production, install banner in Profile.
- Firestore rules updated for the new collections (watches, ratings, announcements, guardClaims) and redeployed.

## 12. Messages list redesign

- Rounded card rows, timestamps (now / 5m / 2h / Mon), item thumbnail badge on every avatar, tighter preview lines, unread pill, and a search bar that filters chats by person or item.
- File: src/pages/lycean/Messages.tsx

## 13. Category pills cut off on mobile

- Cause: justify-center plus a scrollable row clips both ends and makes the start unreachable.
- Fix: justify-content: safe center on Browse and My Items category rows; the All/Lost/Found pills now wrap on narrow screens.
- Files: Browse.tsx, MyItems.tsx

## Accounts created this session

| Role | Email | Password | Login |
|---|---|---|---|
| Super admin | AdminSiJerlyn@gmail.com | Password123! | /admin/login |
| Custodian | ManonGuard@gmail.com | Password123! | /login |

Change these passwords after first login. Re-run scripts/seed-admin-jerlyn.js or scripts/seed-custodian.js to reset them.

## Useful links

- Firebase console: https://console.firebase.google.com/project/lyfind-72845
- Brevo dashboard (email/OTP): https://app.brevo.com — senders at https://app.brevo.com/senders/list, IP settings at https://app.brevo.com/security/authorised_ips
- Firestore rules deploy: node scripts/deploy-rules.js
- Roadmap: docs/FEATURE_ROADMAP.md
- Implementation details: docs/IMPLEMENTATION_LOG.md
- Technical guide: docs/TECHNICAL_GUIDE.md

## Still open (needs server infrastructure)

- Replace client-side OTP with Firebase Auth email verification
- Cloud Function push notifications (removes the public notification-server secret)
- Scheduled auto-expiry emails, server-side match processing, image moderation
- Rotate the Brevo key and the Firebase service account JSON (both still in the repo)
- Put the project in git (still not a repository!)
