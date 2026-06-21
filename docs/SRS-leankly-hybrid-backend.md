# Software Requirements Specification (SRS)
## Leankly Hybrid Production Backend

| Field | Value |
|-------|-------|
| **Project** | Leankly |
| **Document** | Hybrid Backend SRS - NestJS REST API with Appwrite Platform Delegation |
| **Version** | 1.0 |
| **Status** | Draft for implementation |
| **Audience** | AI agents / backend engineers |
| **Context** | Production backend plan that keeps Appwrite for Auth, Storage, and Push delivery only. The custom backend owns all Leankly domain data and business rules. |

---

## 1. Summary

This document specifies the hybrid backend architecture for Leankly. The goal is to reduce operational burden by delegating commodity platform services to Appwrite while keeping the product-critical logic in a custom backend.

Appwrite owns:

- Email/password signup and login
- Email verification and password recovery
- Google and Apple OAuth
- Session handling and Appwrite JWT issuance
- Avatar and leank cover file storage
- Push delivery plumbing

The custom backend owns:

- Appwrite JWT verification and `appwriteUserId` mapping
- App user profile and onboarding state
- Leanks, feed, reactions, requests, and participants
- Messaging, read receipts, unread count, and chat membership rules
- Blocks, reports, moderation, referrals, and account deletion workflow
- RevenueCat entitlement cache and Pro gates
- Rate limits, authorization, observability, realtime, and admin routes

Appwrite TablesDB is not the long-term source of truth for domain data. Appwrite Realtime is not used as the production realtime layer in this SRS.

---

## 2. Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    Expo Mobile App                          │
│  Appwrite Auth SDK │ Appwrite Storage SDK │ API Client       │
└───────────────┬───────────────────────────────┬─────────────┘
                │                               │
                │ Appwrite Auth / Storage        │ HTTPS / WSS
                ▼                               ▼
┌───────────────────────────────┐   ┌─────────────────────────┐
│           Appwrite             │   │       NestJS API         │
│ Auth │ OAuth │ Storage │ Push  │   │ /v1 REST │ WebSocket     │
└───────────────────────────────┘   │ Domain Rules │ Admin     │
                                    └───────┬─────────┬───────┘
                                            │         │
                                            ▼         ▼
                                      PostgreSQL    Redis/BullMQ
```

### 2.1 Trust Boundary

Mobile clients authenticate with Appwrite. For protected backend calls, the mobile app sends an Appwrite JWT:

```http
Authorization: Bearer <appwrite-jwt>
```

The backend verifies the JWT against Appwrite, resolves the actor, and maps:

```text
Appwrite account $id -> users.appwrite_user_id -> users.id
```

The backend must never trust client-supplied `userId`, `ownerId`, `senderId`, or entitlement state.

### 2.2 Required Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20 LTS |
| Framework | NestJS 11 |
| Language | TypeScript 5 |
| ORM | Prisma |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7 + BullMQ |
| Auth Provider | Appwrite Auth |
| File Storage | Appwrite Storage |
| Push Delivery | Appwrite Push / Appwrite delivery integration |
| AI | OpenAI API via backend worker |
| Realtime | Socket.io + Redis adapter |
| API Docs | Swagger / OpenAPI 3.1 |
| Container | Docker + docker-compose for local backend dependencies |

---

## 3. Backend Scope

### 3.1 In Scope

- REST API under `/v1`
- Appwrite JWT verification guard
- App profile bootstrap/sync from Appwrite identity
- PostgreSQL source of truth for all domain data
- Feed, leanks, reactions, requests, participants, messages, read receipts, unread counts
- Server-side usage limits and Pro gates
- RevenueCat webhook and entitlement cache
- Appwrite Storage confirmation for avatars and leank covers
- Server-triggered push dispatch through Appwrite
- WebSocket realtime for messaging-related updates
- AI-powered leank categorization via backend BullMQ worker
- Health checks, Swagger, Docker, logging, rate limiting, and integration tests

### 3.2 Out of Scope

- Owned password hashing, refresh sessions, OTP tables, or OAuth provider verification
- S3/R2 presigned upload implementation
- Direct mobile push delivery calls
- Appwrite TablesDB as production domain storage
- Appwrite Realtime as production messaging realtime
- Website backend
- Multi-region deployment

---

## 4. Data Model

Use PostgreSQL UUID primary keys. Keep `appwrite_user_id` as a unique external identity key.

| Table | Purpose |
|-------|---------|
| `users` | App profile, onboarding, referral stats, push target metadata, soft delete |
| `leanks` | Events and chat rooms |
| `participants` | Accepted leank/chat members |
| `reactions` | Swipes and join request state |
| `messages` | Chat messages |
| `user_chat_meta` | Read receipts and chat user metadata |
| `blocks` | User block relationships |
| `reports` | Moderation reports |
| `referrals` | Referral idempotency and audit |
| `daily_usage` | Free-tier interest/undo counters |
| `user_entitlements` | RevenueCat Pro status cache |

### 4.1 Important Constraints

- `users.appwrite_user_id` unique
- `users.email` unique among non-deleted users
- `participants(leank_id, user_id)` unique
- `reactions(user_id, leank_id)` unique
- `user_chat_meta(leank_id, user_id)` unique
- `blocks(blocker_id, blocked_id)` unique
- `referrals(referrer_id, referred_id)` unique
- Index all feed, chat, unread, and request query paths before production traffic

---

## 5. Public API

All custom backend routes are versioned under `/v1`. All protected routes require an Appwrite JWT.

### 5.1 Auth and User Bootstrap

The backend does not expose login/register/refresh endpoints. Mobile uses Appwrite Auth directly.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/v1/users/me` | Appwrite JWT | Verify JWT, create/sync profile if missing, return current user |
| PATCH | `/v1/users/me` | Appwrite JWT | Update app profile fields |
| PATCH | `/v1/users/me/push-token` | Appwrite JWT | Store current Expo/Appwrite push target metadata |
| DELETE | `/v1/users/me` | Appwrite JWT | Soft delete user and cascade domain data transactionally |
| GET | `/v1/users/me/usage` | Appwrite JWT | Return daily usage and remaining free limits |
| GET | `/v1/users/me/entitlements` | Appwrite JWT | Return Pro entitlement cache |

Backend behavior:

- Verify the Appwrite JWT on every protected call.
- Reject unverified Appwrite email accounts except for profile bootstrap if needed for UX.
- Create `users` row on first valid JWT if none exists.
- Copy stable identity fields from Appwrite: `appwriteUserId`, `email`, `emailVerified`, and display name when available.

### 5.2 Leanks and Feed

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/leanks` | Appwrite JWT | Create leank |
| GET | `/v1/leanks/feed` | Appwrite JWT | Paginated discovery feed |
| GET | `/v1/leanks/chats` | Appwrite JWT | Active leanks where caller is owner or participant |
| GET | `/v1/leanks/:id` | Appwrite JWT | Leank detail |
| PATCH | `/v1/leanks/:id` | Appwrite JWT | Owner updates editable leank fields |
| POST | `/v1/leanks/:id/close` | Appwrite JWT | Owner closes leank |

Feed must exclude own leanks, participated leanks, already-reacted leanks, non-active leanks, blocked owners, and users who blocked the caller.

### 5.3 Reactions, Requests, and Participants

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/reactions` | Appwrite JWT | Like or skip a leank |
| DELETE | `/v1/reactions/:leankId` | Appwrite JWT | Undo reaction |
| GET | `/v1/reactions/requests` | Appwrite JWT | Pending requests for owned leanks |
| POST | `/v1/reactions/:id/accept` | Appwrite JWT | Owner accepts request |
| POST | `/v1/reactions/:id/decline` | Appwrite JWT | Owner declines request |
| GET | `/v1/leanks/:id/participants` | Appwrite JWT | Participant list |
| POST | `/v1/leanks/:id/leave` | Appwrite JWT | Participant leaves |
| DELETE | `/v1/leanks/:id/participants/:userId` | Appwrite JWT | Owner removes participant |

Transactional requirements:

- Like enforces Pro, daily free limits, and bonus interest atomically.
- Accept inserts participant, updates reaction, creates system message if needed, and emits events in one transaction.
- Leave/remove update participant state and create system messages.
- Push dispatch happens only after the DB transaction commits.

### 5.4 Messaging and Read State

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/v1/leanks/:id/messages` | Appwrite JWT | Cursor-paginated messages |
| POST | `/v1/leanks/:id/messages` | Appwrite JWT | Send message |
| PATCH | `/v1/leanks/:id/read` | Appwrite JWT | Mark chat read |
| GET | `/v1/users/me/unread-count` | Appwrite JWT | Total unread count |

Messaging requirements:

- Only leank owners or participants can read/send messages.
- Active leanks are read/write; completed leanks are read-only unless explicitly allowed later.
- Send message inserts message, updates denormalized `lastMessage`, emits realtime event, and queues push after commit.
- Read receipts upsert `user_chat_meta.read_at`.
- Unread count excludes messages sent by the caller.

### 5.5 Media via Appwrite Storage

Mobile uploads files to Appwrite Storage. Backend records and validates file references.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/media/confirm` | Appwrite JWT | Confirm uploaded Appwrite file and return normalized media reference |

Request:

```json
{
  "fileId": "appwrite-file-id",
  "bucket": "avatars|leank_covers",
  "purpose": "avatar|leank_cover"
}
```

Backend behavior:

- Verify the file exists in the expected Appwrite bucket.
- Verify content type and max size according to Appwrite metadata.
- Return stable `fileId`, preview URL, and public/download URL strategy.
- Profile and leank endpoints accept only confirmed file references.

### 5.6 Push via Appwrite

The backend owns push decisions. Appwrite owns delivery.

Push triggers:

- Like -> notify leank owner
- Accept request -> notify requester
- Send message -> notify other participants, excluding sender
- System/admin alert -> notify target users

Rules:

- Mobile must not call push delivery endpoints directly.
- Backend dispatches push only after the related transaction commits.
- Invalid/missing push targets are skipped and logged.
- Push payloads must preserve current mobile routing fields, especially `leankId` for chat notifications.

### 5.7 Realtime

Realtime remains backend-owned through WebSocket.

| Event | Room | Payload |
|-------|------|---------|
| `leank.updated` | `leank:{id}` | Leank summary/detail |
| `message.created` | `leank:{id}` | Message object |
| `reaction.updated` | `user:{ownerId}` | Request summary |
| `chatMeta.updated` | `user:{userId}` | `{ leankId, readAt }` |
| `unread.changed` | `user:{userId}` | `{ unreadCount }` |

WebSocket authentication uses the same Appwrite JWT verification path as REST.

---

## 6. Sprint Plan

### Sprint 1 - Backend Foundation

- Scaffold NestJS API, Prisma, PostgreSQL, Redis, health checks, OpenAPI, logging, and global validation.
- Add Appwrite admin/client SDK integration service.
- Add Appwrite JWT guard and current-user decorator.
- Acceptance: `/health`, `/health/db`, and authenticated smoke route work locally.

### Sprint 2 - Appwrite Auth Integration and User Profiles

- Implement `GET /v1/users/me` bootstrap/sync.
- Implement profile update, push target update, account soft delete, referrals, blocks, and reports.
- No owned password, OTP, refresh token, or OAuth implementation.
- Acceptance: verified Appwrite user can bootstrap profile; unverified user is rejected from protected domain routes.

### Sprint 3 - Leanks and Feed

- Implement leank create/update/close and discovery feed.
- Store Appwrite Storage file references for covers.
- Enforce feed exclusions and Pro-only filters server-side.
- Acceptance: feed excludes own, blocked, participated, reacted, and non-active leanks.

### Sprint 4 - Reactions, Requests, Participants, and Usage

- Implement like/skip/undo, request list, accept/decline, leave/remove.
- Enforce daily usage, bonus interests, and request visibility gates.
- Queue push dispatch after commit through Appwrite delivery integration.
- Acceptance: accept is idempotent, transactional, and emits request/chat updates.

### Sprint 5 - Messaging, Read State, and Unread

- Implement paginated messages, send, read receipt, chat list, unread count.
- Update `lastMessage` transactionally with message insert.
- Emit WebSocket events and dispatch chat push after commit.
- Acceptance: unread count matches manual calculation and no non-participant can read/send.

### Sprint 6 - Appwrite Storage, Push Dispatch, and AI Classification

- Implement `/v1/media/confirm`.
- Implement Appwrite push delivery adapter.
- Implement BullMQ classification worker with OpenAI.
- Acceptance: Appwrite-uploaded avatar/cover can be confirmed and attached; push dispatch reaches test devices; classification updates category.

### Sprint 7 - Realtime, Entitlements, Admin, and Hardening

- Implement WebSocket gateway with Appwrite JWT auth.
- Implement RevenueCat webhook and entitlement cache.
- Add admin reports/suspension endpoints.
- Add rate limits, Sentry/error monitoring hooks, request IDs, and production security headers.
- Acceptance: Pro gates reflect RevenueCat webhook state and realtime works across two API instances.

### Sprint 8 - Mobile Cutover

- Mobile keeps Appwrite Auth and Storage SDKs.
- Mobile domain data calls move to backend `/v1`.
- Remove direct Appwrite TablesDB usage from domain flows.
- Acceptance: signup/login, onboarding, feed, request accept/decline, chat, unread, push routing, and file upload flows pass manually.

---

## 7. Mobile Integration Contract

Mobile responsibilities:

- Use Appwrite SDK for auth flows.
- Use Appwrite SDK for image upload.
- Send Appwrite JWT to backend for all `/v1` domain calls.
- Treat backend as source of truth for profile, feed, requests, messaging, limits, and entitlements.

Backend API client behavior:

- Add `Authorization: Bearer <Appwrite JWT>` to protected requests.
- On 401, refresh Appwrite session state and retry only once.
- Use stable response envelope:

```json
{
  "ok": true,
  "data": {}
}
```

Error envelope:

```json
{
  "ok": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You are not allowed to perform this action",
    "status": 403
  }
}
```

---

## 8. Testing Requirements

| Area | Minimum Coverage |
|------|------------------|
| Appwrite JWT verification and profile bootstrap | Valid token, missing token, invalid token, unverified email |
| Profile/referrals/moderation | Update profile, block idempotency, report create, referral edge cases |
| Feed | Exclusions, filters, pagination, Pro gates |
| Reactions/requests | Like limit, undo limit, accept transaction, decline, request visibility |
| Messaging | Send, paginate, read receipt, unread count, non-participant 403 |
| Storage | Confirm valid file, reject wrong bucket/type/missing file |
| Push | Dispatch after commit, skip missing target, preserve `leankId` routing |
| RevenueCat | Webhook signature, entitlement activate/deactivate |
| Realtime | JWT handshake, room authorization, message/request/unread events |

Manual Expo flows:

- Appwrite email signup, verification link, login, logout, recovery
- Google OAuth and Apple OAuth
- Avatar upload and cover upload through Appwrite Storage
- Feed like/skip/undo with free limits
- Request accept/decline
- Send/receive chat messages
- Unread badge updates without flicker
- Tap chat push notification
- RevenueCat purchase reflected in Pro gates

---

## 9. Manual Labor Checklist

### Appwrite

- Enable Email/Password auth.
- Configure Google and Apple OAuth providers.
- Add allowed redirect URLs:
  - `leankly://auth/callback`
  - `leankly://auth/verify`
  - `leankly://auth/recovery`
- Configure Appwrite Storage buckets for avatars and leank covers.
- Configure bucket permissions so users can upload their own files and backend can verify metadata.
- Configure Appwrite push delivery and provider credentials.
- Create backend Appwrite API key with only the permissions needed for JWT verification, file metadata checks, and push dispatch.

### Backend Infrastructure

- Provision PostgreSQL and Redis for staging and production.
- Configure backend environment:

```env
APPWRITE_ENDPOINT=
APPWRITE_PROJECT_ID=
APPWRITE_API_KEY=
APPWRITE_AVATAR_BUCKET_ID=
APPWRITE_LEANK_COVER_BUCKET_ID=
DATABASE_URL=
REDIS_URL=
REVENUECAT_WEBHOOK_SECRET=
REVENUECAT_ENTITLEMENT_ID=
OPENAI_API_KEY=
```

- Configure production API URL, WebSocket URL, and CORS allowlist.
- Configure Sentry/error monitoring and uptime checks.
- Configure DB backups and migration workflow.

### Mobile

- Keep Appwrite public env vars for Auth and Storage.
- Add backend API and WebSocket URLs.
- Remove Clerk env vars and dependencies.
- Remove direct Appwrite TablesDB usage after backend parity.
- Test on physical iOS and Android devices for OAuth and push.

### Launch

- Deploy backend to staging.
- Run full manual flow checklist.
- Restrict Appwrite TablesDB/domain permissions after mobile no longer depends on them.
- Deploy production backend.
- Point mobile to production API.
- Monitor logs, push delivery, realtime errors, DB load, and RevenueCat webhook events for 72 hours.

---

## 10. Non-Negotiable Boundaries

- Appwrite Auth is identity only; it does not decide Leankly business authorization.
- Appwrite Storage is file hosting only; backend validates and records media usage.
- Appwrite Push is delivery only; backend decides who receives what and when.
- PostgreSQL is the source of truth for domain data.
- Mobile never writes directly to domain tables in production.
- Messaging, requests, reactions, feed, limits, moderation, and entitlements remain backend-owned.
