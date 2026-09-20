# LyFind — Accounts & How to Log In

Live site: https://lyfind-72845.web.app
Local dev: http://localhost:3000 (npm run dev)

## Quick reference

| Role | Email | Password | Login page |
|---|---|---|---|
| Admin | AdminSiJerlyn@gmail.com | Password123! | /admin/login |
| Teacher (verified) | teacher@lsb.edu.ph | Password123! | /login |
| Custodian (Guard Station) | ManonGuard@gmail.com | Password123! | /login |
| Student | register your own @lsb.edu.ph email | your choice | /login |

All seeded passwords are Password123!. Change them after the demo — they are
written in this repo.

## How to log in as Admin

1. Go to https://lyfind-72845.web.app/admin/login (note: /admin/login, NOT the normal login page — admin has its own portal).
2. Enter AdminSiJerlyn@gmail.com / Password123!
3. You land on the admin dashboard: approvals, users, items, reports, message monitoring, teacher verifications, announcements, analytics (with the CSV export), activity logs, settings.

Forgot/broken password: run node scripts/seed-admin-jerlyn.js — it resets the password back to Password123!.

## How to log in as Teacher

1. Go to https://lyfind-72845.web.app/login (the normal login page).
2. Enter teacher@lsb.edu.ph / Password123!
3. You get the normal student interface, but with faculty perks: posts skip the admin approval queue and go live instantly (auto-matching and search alerts fire right away), and the profile shows the VERIFIED teacher badge.

Reset: node scripts/seed-teacher.js

## How to log in as Custodian (Guard Station)

1. Go to https://lyfind-72845.web.app/login (normal login page).
2. Enter ManonGuard@gmail.com / Password123!
3. A Guard Station entry appears at the top of the sidebar → https://lyfind-72845.web.app/guard-station
4. From the dashboard: "Log New Item" posts a turned-in item (live instantly, tagged "Held at Guard Station"); "Claimed" on a held item opens the pickup form (claimer name + student ID + note) and records it in the permanent pickup log.

Reset: node scripts/seed-custodian.js

## How to create and log in as a Student

1. Go to https://lyfind-72845.web.app/register
2. Use an email ending in @lsb.edu.ph — other domains are rejected at registration (login itself has no domain restriction; that is how the gmail staff accounts work).
3. A 6-digit OTP is emailed via Brevo; enter it in the popup. If the email service is unavailable, the account is created directly.
4. Log in at https://lyfind-72845.web.app/login
5. Student posts go to the admin approval queue — log in as admin to approve them before they appear in Browse.

## Testing multi-user flows (chat, claims, handover, ratings)

You need two accounts logged in at once. Use one normal browser window and one
incognito/private window (or two different browsers):

1. Window A (e.g. teacher): post a found item — it is live instantly.
2. Window B (student): find it in Browse → Message Owner.
3. Window A: in the chat, use Verify Claimer to send an ownership question.
4. Window B: answer it. Window A: approve, then Mark as Claimed with a meetup spot.
5. Both windows: confirm the handover ("I handed it over" / "I received it").
6. Both windows: the 5-star rating prompt appears — rate each other.

## Old / legacy accounts

- admin@lsb.edu.ph — the original seeded admin (script default password: LyFindAdmin2026!). Prefer AdminSiJerlyn@gmail.com; this one can be deleted in Firebase Console → Authentication if unused.

## How the roles actually work (for troubleshooting)

- Admin = a document exists at admins/{uid} in Firestore. Only the seed scripts (Admin SDK) can create it — no one can become admin from the website.
- Teacher = users/{uid} has role: faculty and teacherVerificationStatus: approved.
- Custodian = users/{uid} has role: custodian.
- All seed scripts are idempotent: safe to re-run any time; they reset the password and repair the Firestore documents. They require the Firebase service-account JSON in the repo root.
