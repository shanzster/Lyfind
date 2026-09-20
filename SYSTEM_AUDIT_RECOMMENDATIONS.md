# LyFind — System Audit & Recommendations

Full-system audit of the LyFind codebase. Items are prioritized P0 (urgent
security) through P3 (polish). **P0 items were deliberately deferred by owner
decision** — they remain OPEN and are documented here so they aren't forgotten.

---

## P0 — SECURITY (OPEN, deliberately skipped per owner decision)

1. **Firestore rules are effectively a catch-all.** `firestore.rules` allows
   broad read/write access. Any authenticated user (or in some collections any
   client) can modify others' documents, grant themselves roles, delete items,
   forge reports/notifications, and write to `admins`. This is the single
   biggest risk in the system. Fix: rewrite rules with per-collection,
   per-field validation (users can only write their own docs; role/ban/suspend
   fields writable only via Admin SDK; `teacherVerifications` writable once by
   the owner, reviewable only by admins; `matches`, `adminLogs`, `notifications`
   writable only server-side or with strict checks).
2. **Secrets committed to the repo.** Firebase web config is public by design,
   but the Brevo API key (in `.env`/Vercel and previously in docs), the
   notification-server shared secret, and any Firebase Admin SDK service
   account JSON must never be committed. `.gitignore` now excludes `.env` and
   `*firebase-adminsdk*.json`, but keys that were ever committed should be
   ROTATED.
3. **Debug/utility routes are publicly reachable:** `/seed-admin`, `/fix-admin`,
   `/oauth-diagnostic`, `/diagnostic`. These can mutate admin data or leak
   configuration. Remove them from production builds or gate behind admin auth.
4. **Client-side OTP.** The OTP is generated, stored, and verified in the
   browser (`emailService.ts`), so it provides no real security — anyone can
   skip it. Real email verification requires a server (Cloud Function) that
   generates/verifies the code, or Firebase's built-in email verification.
5. **Notification server auth.** The Render notification server accepts a
   static shared secret sent from the browser (`VITE_NOTIFICATION_API_SECRET`
   is public by definition of being a VITE_ var). Anyone can send push
   notifications to any user. Move sends server-side (Cloud Function trigger on
   the `notifications` collection) or verify Firebase ID tokens.

## P1 — Correctness / integrity

- Firestore composite index for `teacherVerifications` (status + submittedAt) —
  code falls back to unordered query, but create the index for ordered results.
- `photoMatchService.processQueue` relies on a browser tab staying open; queue
  processing should move server-side eventually.
- Two toast systems coexist (sonner + Radix use-toast); standardize on sonner.
- `itemsPosted`/`itemsResolved` counters are updated read-modify-write
  (non-atomic); use `increment()`.

## P2 — Performance

- (DONE) Lazy-load admin pages, TensorFlow, Tesseract; vendor chunking;
  console stripping in prod. First-load bundle went from ~752 KB gzip to
  ~400 KB gzip.
- Per-item AI feature caching (`aiFeatures` on item docs) — DONE; consider a
  scheduled job to pre-warm caches for all active items.
- Firestore reads in admin dashboards fetch entire collections; add pagination.

## P3 — Polish

- Admin UI uses hardcoded hex colors (`#2f1632`, `#ff7400`) instead of theme
  tokens; unify with the design system.
- `create-admin*.html` root files removed; keep admin creation to
  `scripts/seed-admin.js`.
- Consolidate duplicated visitor hero components (`hero-option1/2/3`).
