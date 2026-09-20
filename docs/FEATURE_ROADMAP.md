# LyFind — Feature Roadmap (UI & Backend)

A prioritized list of features to add, split by where the work lives.
Priority: ⭐⭐⭐ = do first (high impact / low effort) · ⭐⭐ = strong addition · ⭐ = polish / nice-to-have

---

## 🎨 UI FEATURES

### Trust & Claiming
| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 1 | **Claim verification questions** | ⭐⭐⭐ | Before handover, the finder asks the claimer a question only the real owner can answer (e.g. "What's the phone wallpaper?"). Modal in the chat with question + answer flow, and an "Approved / Rejected" state shown in the conversation. |
| 2 | **Two-sided handover confirmation** | ⭐⭐⭐ | Both parties tap "I handed it over" / "I received it" before the item becomes *resolved*. Progress indicator in chat (1/2 confirmed). |
| 3 | **Trust badge on profiles** | ⭐⭐ | Show "🏅 5 items returned" next to a user's name in chat and item pages. Builds confidence to meet up with strangers. |

### Matching & Discovery
| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 4 | **"Is this yours?" match cards** | ⭐⭐⭐ | Rich notification card with side-by-side photos (your lost item vs the found item), confidence %, and one-tap "Yes — message the finder". |
| 5 | **Bookmark / watch items** | ⭐⭐ | Save button on items ("might be mine, let me check first"), with a Saved tab in Profile. |
| 6 | **Saved search alerts UI** | ⭐⭐ | "Notify me when anything matching *black Casio calculator* is posted" — form + list of active alerts in Profile. |
| 7 | **Sort & date filters in Browse** | ⭐ | Sort by newest/oldest, filter by date range and building/floor. |

### Messaging (Messenger polish)
| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 8 | **Typing indicator** | ⭐⭐ | "… is typing" bubble via a `typing` flag on the conversation doc. |
| 9 | **Seen receipts** | ⭐⭐ | Small avatar/check under your last message once the other person has read it (data already exists in `unreadCount`). |
| 10 | **Day separators & smart timestamps** | ⭐ | "Today / Yesterday / Mar 3" dividers between message groups. |
| 11 | **Online / active status dot** | ⭐ | Green dot on avatars (presence via Firestore heartbeat or Realtime DB). |

### Campus & Community
| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 12 | **QR poster generator** | ⭐⭐⭐ | One-click printable poster ("FOUND: umbrella — scan to claim") with a QR code linking to the item page. Bridges physical campus to the app. |
| 13 | **Reunited success wall** | ⭐⭐ | Public counter + feed: "🎉 127 items returned this semester", anonymized recent reunions. Great for adoption and the demo. |
| 14 | **PWA install experience** | ⭐⭐ | Web app manifest + install prompt + offline shell so students can add LyFind to their home screen. |

---

## ⚙️ BACKEND FEATURES

### Security foundations (prerequisites for everything above)
| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 1 | **Proper Firestore rules** | ⭐⭐⭐ | Per-collection rules: users write only their own docs, `admins`/roles writable only via Admin SDK, items editable only by owner. Currently a catch-all — blocks nothing. |
| 2 | **Server-side email verification** | ⭐⭐⭐ | Replace client-side Brevo OTP with Firebase Auth's built-in email verification (free, no daily cap, no exposed API key). |
| 3 | **Cloud Function push notifications** | ⭐⭐⭐ | Trigger on `notifications` collection writes → send FCM push. Removes the public shared secret on the notification server. |
| 4 | **Remove/gate debug routes** | ⭐⭐⭐ | `/seed-admin`, `/fix-admin`, `/diagnostic`, `/oauth-diagnostic` must not ship in production builds. |

### Item lifecycle
| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 5 | **Auto-expiry + reminder emails** | ⭐⭐⭐ | Scheduled function: after 30 days email "Still looking? Renew or archive", auto-archive at 45. Keeps Browse fresh, re-engages users. |
| 6 | **Claim verification data model** | ⭐⭐⭐ | `claims` subcollection: question, answer, status (pending/approved/rejected), timestamps. Powers UI feature #1. |
| 7 | **Atomic counters** | ⭐⭐ | Use Firestore `increment()` for `itemsPosted` / `itemsResolved` (current read-modify-write loses counts). |

### Matching engine
| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 8 | **Server-side match processing** | ⭐⭐ | Move `photoMatchService.processQueue` from "browser tab must stay open" to a Cloud Function so matching always runs. |
| 9 | **Saved search matching** | ⭐⭐ | On each new item: run text match against saved searches, notify subscribers. Powers UI feature #6. |
| 10 | **Scheduled cache pre-warm** | ⭐ | Nightly job computing AI features for all active items so first match is instant. |

### Moderation & safety
| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 11 | **Image moderation on upload** | ⭐⭐ | NSFW/inappropriate-content check before photos go live (lightweight model or Cloud Vision SafeSearch). |
| 12 | **Rate limiting** | ⭐⭐ | Cap posts/messages per user per hour (Cloud Function or security-rules timestamp checks) to stop spam. |
| 13 | **Auto-flag suspicious activity** | ⭐ | Flag users with many rejected claims or reports for admin review. |

### Admin & institution
| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 14 | **Guard-station / custodian accounts** | ⭐⭐⭐ | Special role whose items show "Held at Guard House — claim there". Turns LyFind into official school infrastructure. |
| 15 | **Semester report export** | ⭐⭐ | One-click CSV/PDF: items posted/returned by category, building, month. The feature that makes the school keep using it. |
| 16 | **Admin dashboard pagination** | ⭐ | Admin pages currently fetch entire collections; add paginated queries. |
| 17 | **Scheduled Firestore backups** | ⭐ | Daily export to a storage bucket — protects all user data. |

---

## 🎯 Suggested build order

1. **Backend security foundations** (B1–B4) — everything else stands on these.
2. **Claim flow**: claims data model (B6) → verification questions UI (U1) → two-sided handover (U2).
3. **Match cards** (U4) + **QR poster** (U12) — biggest demo wow for the effort.
4. **Lifecycle**: auto-expiry (B5) + success wall (U13).
5. Messenger polish (U8–U10) and the rest as time allows.
