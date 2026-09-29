# LyFind — System Review

A module-by-module review of the LyFind photo-based lost-and-found campus web application,
categorized by the user level that owns each module. Last reviewed: 2026-09-29.

**Stack:** React 18 + TypeScript + Vite · Firebase (Auth, Firestore, Storage, Cloud Messaging) ·
TensorFlow.js (MobileNet) for photo matching · Gemini API · Brevo (transactional email) ·
Cloudinary (image hosting) · Tesseract OCR · shadcn/ui + Tailwind.

## User levels

| Level | Who | Access gate |
|---|---|---|
| **Visitor** | Anyone, not logged in | None — public routes |
| **Lycean (Student)** | Registered `@lsb.edu.ph` account | `RequireAuth` (redirects to `/login`) |
| **Teacher (Faculty)** | `role: faculty` + `teacherVerificationStatus: approved` | Same login as students; extra privileges |
| **Custodian (Guard)** | `role: custodian` | `RequireAuth`; locked to `/guard-station` only |
| **Admin** | Document exists at `admins/{uid}` | Separate portal `/admin/login` + `AdminRoute` guard |
| **Developer** | Dev builds only | Routes excluded from production (`import.meta.env.DEV`) |

Roles are enforced in three layers: route guards in `src/App.tsx`, Firestore security rules
(`firestore.rules`), and seed scripts (admin creation is only possible via the Admin SDK —
never from the website).

---

## 1. Visitor level (public, no login)

### Pages — `src/pages/visitor/`, `src/pages/public/`

| Module | Route | Purpose |
|---|---|---|
| `Home.tsx` | `/` | Landing page: hero, stats, features, how-it-works, testimonials, CTA |
| `About.tsx` | `/about` | About the project and team |
| `Services.tsx` | `/services` | What the platform offers |
| `Institution.tsx` | `/institution` | Institution (LSB) information |
| `Auth.tsx` | `/auth` | Auth hub / entry chooser |
| `Login.tsx` | `/login` | Email + password login (no domain restriction — allows staff gmail accounts) |
| `Register.tsx` | `/register` | Registration restricted to `@lsb.edu.ph`; 6-digit OTP emailed via Brevo |
| `ForgotPassword.tsx` | `/forgot-password` | Password reset |
| `public/PublicItem.tsx` | `/public/item/:id` | Publicly shareable item view (no login needed — used in announcement/notification links) |
| `NotFound.tsx` | `*` | 404 catch-all |

### Landing-page components — `src/components/`

`header.tsx`, `hero.tsx` (+ `hero-option1/2/3.tsx` variants), `stats.tsx`, `features.tsx`,
`feature-showcase.tsx`, `how-it-works.tsx`, `testimonials.tsx`, `cta.tsx`,
`ai-matching-demo.tsx`, `campus-map-demo.tsx`, `posting-algorithm-demo.tsx`,
`photo-analyzer.tsx` — marketing/demo widgets shown to visitors only. The header is hidden
on all Lycean and Admin routes.

**Review notes:** Public surface is small and clean. `PublicItem` is the only public read of
live data — its Firestore access must stay read-only in the rules. The OTP fallback
("account created directly if email service is unavailable") is a deliberate availability
trade-off worth remembering during demos.

---

## 2. Lycean level (logged-in student — the baseline user)

### Pages — `src/pages/lycean/`

| Module | Route | Purpose |
|---|---|---|
| `Browse.tsx` | `/browse` | Feed of approved lost/found items with search and filters |
| `Item.tsx` | `/item/:id` | Item details, claim/contact actions, report button |
| `Post.tsx` | `/post` | Post a lost or found item (photo, category, location) — goes to admin approval queue for students |
| `PhotoMatch.tsx` | `/photo-match` | AI photo matching: upload a photo, MobileNet finds visually similar items (lazy-loaded — heavy TF.js bundle) |
| `MyItems.tsx` | `/my-items` | The user's own posts and their statuses |
| `Messages.tsx` | `/messages` | Chat with other users: verify-claimer Q&A, mark-as-claimed, handover confirmation, 5-star mutual rating |
| `Notifications.tsx` | `/notifications` | In-app notification center |
| `Profile.tsx` | `/profile` | Profile, rating display, settings |

### Shared authenticated components

`lycean-sidebar.tsx` (main nav shell), `NotificationBell.tsx`, `ReportItemModal.tsx`,
`OTPModal.tsx`, `PushNotificationPrompt.tsx` / `PushNotificationSetup.tsx`,
`LocationPickerWithOCR.tsx` + `FloorPlanMap.tsx` (pick a campus location on floor plans,
with OCR assist), `PrivacyModal.tsx`, `TermsModal.tsx`, `AuthStatus.tsx`.

### Services used at this level — `src/services/`

| Service | Responsibility |
|---|---|
| `itemService.ts` | Item CRUD, approval status, resolution |
| `photoMatchService.ts` + `aiPhotoMatcher.ts` + `itemFeatureCache.ts` | MobileNet feature extraction, similarity scoring, cached embeddings |
| `autoMatchService.ts` | Automatic lost↔found matching when new items go live |
| `messageService.ts` | Conversations, claim verification flow, handover confirmations |
| `notificationService.ts` / `pushNotificationService.ts` | In-app + FCM push notifications |
| `bookmarkService.ts` | Saved items |
| `watchService.ts` | Search alerts ("watch" a query, get notified on matches) |
| `ratingService.ts` | Post-handover 5-star mutual ratings |
| `reportService.ts` | Report inappropriate items/users |
| `storageService.ts` | Image upload (Cloudinary/Firebase Storage) |
| `userService.ts` | User profile reads/writes |
| `geminiService.ts` | Gemini-assisted item description/analysis |

**Review notes:** This is the core of the product — the lost→found→claim→handover→rate
lifecycle. The claim-verification chat flow (owner asks an ownership question before
approving) is the main anti-fraud control. Student posts are quarantined behind admin
approval; that plus the report flow are the moderation story at this level.

---

## 3. Teacher level (verified faculty)

Teachers use the **same pages as Lyceans** — there is no separate teacher UI shell.
Their level is defined by privileges, not routes:

| Module | Role at this level |
|---|---|
| `pages/lycean/TeacherVerification.tsx` (`/teacher-verification`) | Where a faculty member submits proof to get verified |
| `services/teacherVerificationService.ts` | Verification request lifecycle (submit → pending → approved/rejected) |
| `itemService.ts` (privilege branch) | Approved-teacher posts **skip the admin approval queue** and go live instantly; auto-matching and watch alerts fire immediately |
| `Profile.tsx` | Shows the VERIFIED teacher badge |

**Review notes:** The privilege is meaningful (bypasses moderation), so the verification
approval must stay admin-only — it is (see `admin/TeacherVerifications.tsx`). Correctly
modeled as a flag on top of the student experience rather than a parallel app.

---

## 4. Custodian level (Guard Station)

| Module | Route | Purpose |
|---|---|---|
| `pages/lycean/GuardStation.tsx` | `/guard-station` | Guard dashboard: "Log New Item" records turned-in items (photo, description, finder name + student ID, where/when found) into a private intake log; "Claimed" opens the pickup form and writes the permanent pickup log |
| `services/guardService.ts` | Intake log, pickup log, held-item state |

**Access model:** custodians are hard-redirected — `RequireAuth` in `App.tsx` bounces any
custodian navigation away from non-`/guard-station` routes. Guard-logged items are **not**
public; only an admin can "Post to board" from the intake queue (tagged "Held at Guard
Station").

**Review notes:** Tightest role in the system, and correctly so — a shared physical-desk
account. The intake→admin-publish handoff keeps editorial control with admins while letting
guards capture items in real time. The pickup log gives a permanent chain-of-custody record.

---

## 5. Admin level (separate portal)

Admin has its own auth context (`AdminAuthContext.tsx`), its own login (`/admin/login`),
and every route is wrapped in `AdminRoute`. Admin status cannot be self-granted — it
requires an `admins/{uid}` Firestore document created by a seed script.

### Pages — `src/pages/admin/`

| Module | Route | Purpose |
|---|---|---|
| `AdminLogin.tsx` | `/admin/login` | Dedicated admin portal login |
| `AdminDashboard.tsx` | `/admin/dashboard` | Overview stats and quick links |
| `PendingApprovals.tsx` | `/admin/approvals` | Approve/reject student item posts (the moderation queue) |
| `ItemsManagement.tsx` / `ItemDetails.tsx` | `/admin/items`, `/admin/items/:id` | Full item catalog management |
| `PostItem.tsx` | `/admin/post` | Admin posts an item directly (live immediately) |
| `GuardIntake.tsx` | `/admin/guard-intake` | Guard Station intake queue → "Post to board" publishes held items |
| `UsersManagement.tsx` / `UserDetails.tsx` | `/admin/users`, `/admin/users/:id` | User administration (roles, suspension, details) |
| `TeacherVerifications.tsx` | `/admin/teacher-verifications` | Approve/reject faculty verification requests |
| `ReportsManagement.tsx` | `/admin/reports` | Handle user reports |
| `MessagesMonitoring.tsx` | `/admin/messages` | Oversight of user conversations |
| `AIMatching.tsx` | `/admin/ai-matching` | Review/tune AI match results |
| `Announcements.tsx` | `/admin/announcements` | Publish announcements; optional email blast to the mailing list (per-recipient personalised send, resend, sent-count tracking) |
| `MailingList.tsx` | `/admin/mailing-list` | Import recipients from .csv/.xlsx (auto-detected headers: Name, Course, Student Number, Email; upsert by email) |
| `Analytics.tsx` | `/admin/analytics` | Usage analytics with CSV export |
| `ActivityLogs.tsx` | `/admin/logs` | Audit trail |
| `Settings.tsx` | `/admin/settings` | Platform settings |

### Admin-level services

| Service | Responsibility |
|---|---|
| `adminService.ts` | Admin profile, approvals, moderation actions, activity logging |
| `announcementService.ts` (+ `announcementService.test.ts`) | Announcement CRUD and email-blast orchestration — the only module with a unit test |
| `mailingListService.ts` | Spreadsheet parsing (xlsx — note: this dependency makes it a 335 kB chunk) and recipient storage |
| `emailService.ts` | Brevo integration: OTP emails, announcement emails (needs `VITE_BREVO_API_KEY`, `VITE_BREVO_SENDER_EMAIL`; free tier ≈300 emails/day) |
| `aiMatchingService.ts` | Backend of the admin AI-matching review screen |

### Admin components

`components/admin/AdminSidebar.tsx` — admin nav shell (includes the Mailing List entry).

**Review notes:** Broadest surface in the app — 17 pages. The separation of the admin auth
context from the user auth context is a good defensive choice. Two watch items: the Brevo
API key is a `VITE_`-prefixed variable, so it ships in the client bundle — acceptable for a
demo, but a server-side relay would be the production fix; and `mailingListService`'s xlsx
dependency dominates its lazy chunk (335 kB) — fine since it is lazy-loaded admin-only.

---

## 6. Developer level (dev builds only)

These routes render only when `import.meta.env.DEV` is true — they are excluded from
production builds:

| Module | Route | Purpose |
|---|---|---|
| `pages/SeedAdmin.tsx` | `/seed-admin` | Seed the admin account |
| `pages/FixAdmin.tsx` | `/fix-admin` | Repair a broken admin profile |
| `pages/OAuthDiagnostic.tsx` | `/oauth-diagnostic` | OAuth troubleshooting |
| `pages/lycean/DiagnosticTest.tsx` | `/diagnostic` | General diagnostics (note: not wrapped in `RequireAuth`, but dev-only) |
| `components/DebugOverlay.tsx` | — | On-screen debug overlay |
| `utils/pwaDebug.ts`, `utils/fixUserProfile.ts` | — | PWA/profile repair helpers |

Related tooling outside `src/`: idempotent seed scripts (`scripts/seed-admin-jerlyn.js`,
`seed-teacher.js`, `seed-custodian.js`) that require the Firebase service-account JSON.

**Review notes:** Gating by `import.meta.env.DEV` is the right call — verify after each
build that none of these chunks appear in `dist/` route tables.

---

## 7. Cross-cutting infrastructure (all levels)

| Module | Role |
|---|---|
| `App.tsx` | Route table, `RequireAuth` / `AdminRoute` guards, custodian lockdown, header visibility, Render wake-up ping |
| `contexts/AuthContext.tsx` | User session + profile (role lives here) |
| `contexts/AdminAuthContext.tsx` | Isolated admin session |
| `contexts/NotificationContext.tsx` | App-wide notification state |
| `hooks/` | `use-auth`, `useFirebaseAuth`, `use-items`, `usePushNotifications`, `use-toast`, `use-mobile` |
| `lib/firebase.ts`, `lib/firebase-messaging.ts` | Firebase app + FCM initialization |
| `lib/floorPlans.ts` | Campus floor-plan data for location picking |
| `lib/ocrService.ts` | Tesseract OCR wrapper |
| `lib/utils.ts`, `lib/mock-data.ts` | Utilities and demo data |
| `components/ui/*` (48 files) | shadcn/ui primitives — role-agnostic |
| `components/theme-provider.tsx` | Light/dark theme |
| `firestore.rules` | Server-side enforcement of everything above |

---

## Overall assessment

**Strengths**
- Role model is enforced in depth: route guards + Firestore rules + Admin-SDK-only admin
  creation, with the admin portal on a fully separate auth context.
- The custodian lockdown (single-route role) and the guard-intake → admin-publish handoff
  are well designed for a shared desk account.
- Moderation is layered: student approval queue, teacher-verification gate for queue
  bypass, report handling, message monitoring, activity logs.
- Heavy modules (TF.js photo match, xlsx parsing, all admin pages) are lazy-loaded.

**Risks / follow-ups**
1. **Client-side Brevo key** (`VITE_BREVO_API_KEY`) is extractable from the bundle — move
   email sending behind the notification server for production.
2. **Bundle size**: two main chunks exceed 1.1 MB minified; `manualChunks` tuning would
   help first load.
3. **Test coverage** is essentially one file (`announcementService.test.ts`); the claim/
   handover state machine in `messageService.ts` is the highest-value next target.
4. **Seeded demo passwords** are committed in `docs/ACCOUNTS.md` — rotate after the demo.
