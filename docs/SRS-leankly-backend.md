# Software Requirements Specification (SRS)
## Leankly Production Backend

| Field | Value |
|-------|-------|
| **Project** | Leankly |
| **Document** | Backend SRS — NestJS REST API |
| **Version** | 1.0 |
| **Status** | Draft for implementation |
| **Audience** | AI agents / backend engineers |
| **Context** | Greenfield production backend. No existing production users. Mobile UI exists; backend and auth are net-new. |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [Scope](#3-scope)
4. [Definitions & Enums](#4-definitions--enums)
5. [Functional Requirements](#5-functional-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Database Schema](#7-database-schema)
8. [API Conventions](#8-api-conventions)
9. [Sprint Plan & Endpoint Delivery](#9-sprint-plan--endpoint-delivery)
10. [Mobile Client Integration Requirements](#10-mobile-client-integration-requirements)
11. [Background Jobs & Realtime Events](#11-background-jobs--realtime-events)
12. [Testing Requirements](#12-testing-requirements)
13. [Manual Labor Checklist](#13-manual-labor-checklist)

---

## 1. Introduction

### 1.1 Purpose

This document specifies the requirements for a **production-grade NestJS REST backend** that powers the Leankly mobile application. The backend must own:

- User identity and authentication (email/password, Google OAuth, Apple Sign In)
- All application data (users, events, reactions, chat, moderation)
- File storage (avatars, event cover images)
- Push notification delivery
- AI-powered event categorization
- Realtime updates for messaging

The existing Expo/React Native mobile app will be adapted to consume this API instead of Appwrite and Clerk. **There are no pre-existing production users and no data migration is required.**

### 1.2 Product Summary

Leankly is a social activity-matching app. Users create **Leanks** (group events/activities). Other users swipe through a feed to express interest. Leank hosts review join **Requests** and accept or decline. Accepted users join a **group chat** tied to the Leank.

### 1.3 Goals

| # | Goal |
|---|------|
| G1 | Replace Appwrite TablesDB with PostgreSQL + NestJS REST API |
| G2 | Replace Clerk with owned JWT-based auth (access + refresh tokens) |
| G3 | Replace Appwrite Storage with S3-compatible object storage |
| G4 | Replace Appwrite Functions with NestJS BullMQ workers |
| G5 | Replace Appwrite Realtime with WebSocket gateway |
| G6 | Enforce authorization and business rules server-side |
| G7 | Expose stable `/v1` API contract pluggable into existing mobile UI |
| G8 | Meet production NFRs: security, observability, rate limiting, CI/CD |

---

## 2. System Overview

### 2.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Expo Mobile App (existing)                │
│  AuthContext │ apiClient │ WebSocket │ Existing Screens      │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / WSS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     NestJS API (leankly-api)                 │
│  AuthModule │ UsersModule │ LeanksModule │ MessagesModule   │
│  ReactionsModule │ MediaModule │ NotificationsModule        │
│  ClassificationModule │ RealtimeGateway │ AdminModule       │
└──────┬──────────────┬──────────────┬──────────────┬───────────┘
       │              │              │              │
       ▼              ▼              ▼              ▼
  PostgreSQL       Redis         S3/R2       Email Provider
                                      │
                               BullMQ Workers
                               (Push, Classify)
```

### 2.2 Technology Stack (Required)

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20 LTS |
| Framework | NestJS 11 |
| Language | TypeScript 5 |
| ORM | Prisma |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7 + BullMQ |
| Auth | JWT (access + refresh), argon2id passwords |
| OAuth | google-auth-library, Apple JWKS verification |
| Email | Resend (or SendGrid / AWS SES) |
| Storage | AWS S3 or Cloudflare R2 |
| Push | expo-server-sdk |
| AI | OpenAI API (gpt-4o-mini) |
| Realtime | Socket.io + Redis adapter |
| API Docs | Swagger / OpenAPI 3.1 |
| Container | Docker + docker-compose (local) |

### 2.3 Repository Structure (Required)

```
leankly-api/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   ├── guards/jwt-auth.guard.ts
│   │   ├── filters/http-exception.filter.ts
│   │   ├── interceptors/logging.interceptor.ts
│   │   ├── pipes/validation.pipe.ts
│   │   └── decorators/current-user.decorator.ts
│   ├── auth/
│   ├── users/
│   ├── moderation/
│   ├── referrals/
│   ├── leanks/
│   ├── reactions/
│   ├── messages/
│   ├── media/
│   ├── notifications/
│   ├── classification/
│   ├── realtime/
│   ├── entitlements/
│   ├── health/
│   └── prisma/
├── test/
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── README.md
```

---

## 3. Scope

### 3.1 In Scope

- Full REST API under `/v1`
- WebSocket realtime for messaging-related updates
- Email OTP verification and password reset
- Google and Apple OAuth
- Presigned media uploads
- Server-triggered Expo push notifications
- Async leank category classification
- Server-side daily usage limits (interests, undos)
- RevenueCat webhook endpoint (entitlement sync)
- Health checks, Swagger, integration tests, Docker

### 3.2 Out of Scope (v1)

- Admin web dashboard UI (API-only admin endpoints acceptable)
- In-app payment processing (RevenueCat handles purchases on device)
- Mapbox geocoding (remains client-side)
- Website backend (`website/` folder)
- Multi-region deployment
- Data migration from Appwrite/Clerk

---

## 4. Definitions & Enums

### 4.1 Domain Terms

| Term | Definition |
|------|------------|
| **Leank** | A user-created group event/activity; also serves as a chat room |
| **Reaction** | A user's swipe action (like/skip) on a leank; likes with `PENDING` status become join requests |
| **Request** | A pending liked reaction on a leank owned by another user |
| **Participant** | A user accepted into a leank/chat |
| **System message** | Chat message with `senderId = "system"` (leave, remove, close events) |

### 4.2 Enums

```typescript
enum LeankStatus { ACTIVE = 'Active', COMPLETED = 'Completed', CANCELED = 'Canceled' }

enum LeankCategory {
  FITNESS = 'Fitness & Sports',
  STUDY = 'Study & Learning',
  SOCIAL = 'Social & Nightlife',
  VOLUNTEERING = 'Volunteering & Causes',
  HEALTH = 'Health & Wellness',
  CREATIVE = 'Creative & Arts',
  FOOD = 'Food & Drinks',
  TRAVEL = 'Travel & Outdoors',
  CAREER = 'Career & Networking',
  GAMING = 'Gaming & Esports',
  OTHER = 'Other',
}

enum ReactionStatus { PENDING = 'PENDING', ACCEPTED = 'ACCEPTED', DECLINED = 'DECLINED' }

enum MessageType { USER = 'user', SYSTEM = 'system' }

enum AuthProvider { EMAIL = 'email', GOOGLE = 'google', APPLE = 'apple' }

enum OtpPurpose { EMAIL_VERIFY = 'email_verify', PASSWORD_RESET = 'password_reset' }

enum PushNotificationType { SYSTEM = 'System', ALERT = 'Alert', CHAT = 'Chat' }
```

### 4.3 Free Tier Limits (Server-Enforced)

| Feature | Free Limit | Pro (RevenueCat) |
|---------|------------|------------------|
| Interests (likes) per day | 5 (+ bonus pool from referrals) | Unlimited |
| Undos per day | 1 | Unlimited |
| Visible pending requests (host) | 1 | All |
| Feed filters (category, age, today, week) | Locked | All |
| Location filter | Free | Free |

---

## 5. Functional Requirements

### 5.1 Authentication (FR-AUTH)

| ID | Requirement |
|----|-------------|
| FR-AUTH-01 | Users register with email + password; system sends 6-digit OTP |
| FR-AUTH-02 | Email must be verified before accessing protected routes |
| FR-AUTH-03 | Login returns JWT access token (15 min) + refresh token (30 days) |
| FR-AUTH-04 | Refresh tokens rotate on use; reuse revokes all user sessions |
| FR-AUTH-05 | Google Sign In: client sends `idToken`; server verifies and creates/links account |
| FR-AUTH-06 | Apple Sign In: client sends `identityToken` + optional name; server verifies and creates/links account |
| FR-AUTH-07 | Forgot password sends OTP; reset password with OTP + new password |
| FR-AUTH-08 | Logout revokes current refresh session |
| FR-AUTH-09 | Passwords hashed with argon2id; never stored or returned in plaintext |
| FR-AUTH-10 | Rate limit auth endpoints: 10 req/min/IP for login/register; 5 OTP attempts per code |

### 5.2 User Profile (FR-USER)

| ID | Requirement |
|----|-------------|
| FR-USER-01 | User profile fields: name, email, avatar, age, sex, location, lat/lng, pushToken |
| FR-USER-02 | Onboarding complete when: name ≥ 2 chars, age > 0, location non-empty, lat/lng set |
| FR-USER-03 | Profile save validates age ≥ 16 (onboarding UI requires ≥ 18 client-side) |
| FR-USER-04 | Push token updatable independently of profile save |
| FR-USER-05 | Account deletion soft-deletes user and cascades all related data in one transaction |
| FR-USER-06 | Referral code auto-generated: `{NAME_PREFIX}-{4digits}`, unique |
| FR-USER-07 | Apply referral: invalid/self-referral rejected; idempotent; referrer +10 bonusInterests, +1 referralCount |

### 5.3 Leanks (FR-LEANK)

| ID | Requirement |
|----|-------------|
| FR-LEANK-01 | Create leank: title, description, cover URL, date, time, location, lat/lng, online flag |
| FR-LEANK-02 | New leanks default to status `Active`, category `Other`; classification job updates category async |
| FR-LEANK-03 | Feed excludes: own leanks, participated leanks, reacted leanks, non-Active, blocked owners |
| FR-LEANK-04 | Feed supports filters: today, this week, categories[], age range (owner age), location (online/nearby) |
| FR-LEANK-05 | Feed uses cursor pagination, default page size 10 |
| FR-LEANK-06 | Host can close leank → status `Completed` |
| FR-LEANK-07 | `peopleRequired` defaults to 1 on create |

### 5.4 Reactions & Requests (FR-REACTION)

| ID | Requirement |
|----|-------------|
| FR-REACTION-01 | Like creates/updates reaction: `isLiked=true`, `status=PENDING` |
| FR-REACTION-02 | Skip creates/updates reaction: `isLiked=false` |
| FR-REACTION-03 | Undo deletes reaction row (only if exists) |
| FR-REACTION-04 | Like enforces daily interest limit unless Pro or bonusInterests > 0 |
| FR-REACTION-05 | Using bonus interest decrements `bonusInterests` atomically |
| FR-REACTION-06 | Host sees pending requests where `leank.ownerId = me`, `isLiked=true`, `status=PENDING` |
| FR-REACTION-07 | Accept: add participant, set reaction `ACCEPTED`, notify requester via push — single DB transaction |
| FR-REACTION-08 | Decline: set reaction `DECLINED` only |
| FR-REACTION-09 | Free hosts see only 1 pending request in API (return count + locked flag for rest) |

### 5.5 Messaging (FR-MSG)

| ID | Requirement |
|----|-------------|
| FR-MSG-01 | Only leank owner or participants can read/send messages on Active leanks |
| FR-MSG-02 | Send message updates denormalized `lastMessage` snapshot on leank |
| FR-MSG-03 | Send message triggers CHAT push to other participants (exclude sender) |
| FR-MSG-04 | Support optional reply metadata fields |
| FR-MSG-05 | System messages on leave/remove/close with `senderId = "system"` |
| FR-MSG-06 | Read receipt: upsert `userChatMeta.readAt` when user views chat |
| FR-MSG-07 | Unread count: chats where `lastMessage.createdAt > readAt` and sender ≠ current user |

### 5.6 Moderation (FR-MOD)

| ID | Requirement |
|----|-------------|
| FR-MOD-01 | Block user: idempotent; blocked users hidden from feed server-side |
| FR-MOD-02 | Report user: requires reason; stores reporter, reported, reason, notes |
| FR-MOD-03 | Blocked users excluded from chat lists |

### 5.7 Media (FR-MEDIA)

| ID | Requirement |
|----|-------------|
| FR-MEDIA-01 | Presigned upload URL for images (avatar, leank cover) |
| FR-MEDIA-02 | Allowed types: `image/jpeg`, `image/png`, `image/webp`; max 10 MB |
| FR-MEDIA-03 | Confirm upload returns public CDN URL |

### 5.8 Notifications (FR-PUSH)

| ID | Requirement |
|----|-------------|
| FR-PUSH-01 | ALERT push when user likes a leank → notify leank owner |
| FR-PUSH-02 | ALERT push when host accepts request → notify requester |
| FR-PUSH-03 | CHAT push when message sent → notify other participants |
| FR-PUSH-04 | Push sent server-side only; mobile must NOT call push endpoint directly |
| FR-PUSH-05 | Skip push if recipient has no pushToken |

### 5.9 Realtime (FR-RT)

| ID | Requirement |
|----|-------------|
| FR-RT-01 | WebSocket auth via JWT on handshake |
| FR-RT-02 | Events: leank updated/deleted, message created, reaction updated, chatMeta updated |
| FR-RT-03 | Clients subscribe to rooms: `leank:{id}`, `user:{id}` |

---

## 6. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Performance | p95 REST latency < 300ms for feed under 10k leanks |
| NFR-02 | Availability | 99.9% uptime target |
| NFR-03 | Security | All protected routes require valid JWT; ownership checks on every mutation |
| NFR-04 | Security | HTTPS only in production; secrets in env / secret manager |
| NFR-05 | Security | CORS restricted to known origins in production |
| NFR-06 | Scalability | Stateless API; horizontal scaling via load balancer |
| NFR-07 | Observability | Structured JSON logs with request ID |
| NFR-08 | Observability | Health endpoints: `/health`, `/health/db`, `/health/redis` |
| NFR-09 | Testing | ≥ 80% coverage on auth and transaction services |
| NFR-10 | Documentation | OpenAPI spec auto-generated from NestJS decorators |
| NFR-11 | Versioning | All routes prefixed `/v1` |
| NFR-12 | Errors | Consistent error shape (see §8.3) |

---

## 7. Database Schema

Implement via Prisma. PostgreSQL with UUID primary keys (`gen_random_uuid()`).

### 7.1 Tables

| Table | Purpose |
|-------|---------|
| `users` | Profile + referral stats + soft delete |
| `user_credentials` | Email/password hash (email auth only) |
| `auth_identities` | OAuth provider links (google/apple sub) |
| `refresh_sessions` | Rotating refresh tokens (hashed) |
| `otp_codes` | OTP audit trail (codes stored hashed) |
| `leanks` | Events/chat rooms |
| `participants` | Accepted membership (source of truth) |
| `reactions` | Swipes and join request state |
| `messages` | Chat messages |
| `user_chat_meta` | Read receipts |
| `referrals` | Referral ledger |
| `blocks` | User blocks |
| `reports` | User reports |
| `daily_usage` | Server-side interest/undo counters |
| `user_entitlements` | Pro status cache from RevenueCat webhook |

### 7.2 Key Constraints

- `users.email` unique among non-deleted users
- `users.referral_code` unique
- `auth_identities(provider, provider_user_id)` unique
- `reactions(user_id, leank_id)` unique
- `participants(leank_id, user_id)` unique
- `user_chat_meta(leank_id, user_id)` unique
- `blocks(blocker_id, blocked_id)` unique
- `referrals(referrer_id, referred_id)` unique
- `daily_usage(user_id, feature, usage_date)` unique

### 7.3 Prisma Schema Reference

AI implementer: generate full `schema.prisma` from this SRS. Critical relations:

```
users 1──* leanks (owner_id)
users 1──* reactions (user_id)
leanks 1──* reactions (leank_id)
leanks 1──* participants (leank_id)
users 1──* participants (user_id)
leanks 1──* messages (leank_id)
leanks 1──* user_chat_meta (leank_id)
users 1──* user_chat_meta (user_id)
users 1──* blocks (blocker_id, blocked_id)
users 1──* reports (reporter_id, reported_id)
users 1──* referrals (referrer_id, referred_id)
users 1──o user_credentials
users 1──* auth_identities
users 1──* refresh_sessions
users 1──o user_entitlements
```

### 7.4 Denormalization

- `leanks.last_message_id`, `leanks.last_message_at` updated in same transaction as message insert
- Message sender name/photo denormalized on insert (matches current mobile behavior)
- API may expose computed `participantIds: string[]` derived from `participants` table for mobile compatibility

---

## 8. API Conventions

### 8.1 Base URL

```
Production: https://api.leankly.app/v1
Staging:    https://staging-api.leankly.app/v1
Local:      http://localhost:3000/v1
```

WebSocket: `wss://api.leankly.app` (same host, no `/v1` prefix)

### 8.2 Authentication Header

```
Authorization: Bearer <accessToken>
```

### 8.3 Error Response Shape

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [{ "field": "email", "message": "Invalid email" }],
  "requestId": "uuid"
}
```

### 8.4 Pagination (Cursor)

Query params: `cursor` (opaque string), `limit` (default 10, max 50)

Response wrapper:

```json
{
  "data": [],
  "meta": {
    "nextCursor": "opaque-string-or-null",
    "hasMore": true,
    "total": null
  }
}
```

### 8.5 Standard User Object

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "emailVerified": true,
  "name": "Jane Doe",
  "avatar": "https://cdn.leankly.app/avatars/uuid.jpg",
  "age": 25,
  "sex": "",
  "location": "Brooklyn, NY",
  "locationLat": 40.6782,
  "locationLng": -73.9442,
  "pushToken": "ExponentPushToken[...]",
  "referralCode": "JANE-4821",
  "referralCount": 2,
  "bonusInterests": 20,
  "referredBy": "uuid-or-null",
  "onboardingComplete": true,
  "createdAt": "2026-06-18T12:00:00.000Z",
  "updatedAt": "2026-06-18T12:00:00.000Z"
}
```

### 8.6 Mobile Compatibility Note

Existing mobile types use Appwrite conventions (`$id`, `$createdAt`). The mobile adapter layer (Sprint 10) maps:

```
API id         → $id
API createdAt  → $createdAt
API owner      → nested User with $id
```

Backend returns standard camelCase JSON; adapter handles legacy shape.

---

## 9. Sprint Plan & Endpoint Delivery

**Sprint length:** 2 weeks each  
**Total:** 10 sprints (~20 weeks solo; ~12 weeks with parallel mobile work from Sprint 8)

Each sprint lists: **Goal**, **Deliverables**, **Endpoints**, **Acceptance Criteria**, **Dependencies**

---

### Sprint 1 — Foundation & Infrastructure

**Goal:** Runnable NestJS project with database, Redis, health checks, CI skeleton.

**Deliverables:**
- `leankly-api` repository scaffold
- Docker Compose: PostgreSQL 16, Redis 7
- Prisma initialized with empty migration baseline
- Global validation pipe, exception filter, request ID middleware
- Swagger at `/docs`
- GitHub Actions: lint + build

**Endpoints:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | `{ status: "ok", uptime, version }` |
| GET | `/health/db` | No | PostgreSQL connectivity |
| GET | `/health/redis` | No | Redis connectivity |

**Acceptance Criteria:**
- [ ] `docker compose up` starts API + Postgres + Redis
- [ ] All health endpoints return 200
- [ ] Swagger UI loads
- [ ] `.env.example` documents all required vars

**Dependencies:** None

---

### Sprint 2 — Authentication

**Goal:** Complete owned auth system. No domain logic yet.

**Deliverables:**
- `AuthModule`, `MailModule`, `OtpService`
- Prisma models: `users`, `user_credentials`, `auth_identities`, `refresh_sessions`, `otp_codes`
- argon2id password hashing
- JWT access + refresh with rotation
- Google + Apple token verification services
- Rate limiting on auth routes
- Integration tests for full auth flows

**Endpoints:**

| Method | Path | Auth | Request Body | Response |
|--------|------|------|--------------|----------|
| POST | `/auth/register` | No | `{ email, password, name? }` | `{ message: "OTP sent" }` |
| POST | `/auth/verify-email` | No | `{ email, code }` | `{ accessToken, refreshToken, expiresIn, user }` |
| POST | `/auth/resend-otp` | No | `{ email, purpose: "email_verify" }` | `{ message: "OTP sent" }` |
| POST | `/auth/login` | No | `{ email, password }` | `{ accessToken, refreshToken, expiresIn, user }` |
| POST | `/auth/refresh` | No | `{ refreshToken }` | `{ accessToken, refreshToken, expiresIn }` |
| POST | `/auth/logout` | Yes | `{ refreshToken? }` | `{ message: "Logged out" }` |
| POST | `/auth/forgot-password` | No | `{ email }` | `{ message: "OTP sent" }` |
| POST | `/auth/reset-password` | No | `{ email, code, newPassword }` | `{ message: "Password reset" }` |
| POST | `/auth/oauth/google` | No | `{ idToken, pushToken? }` | `{ accessToken, refreshToken, expiresIn, user }` |
| POST | `/auth/oauth/apple` | No | `{ identityToken, fullName?, pushToken? }` | `{ accessToken, refreshToken, expiresIn, user }` |

**Business Rules:**
- Register: reject duplicate email; password min 8 chars
- OTP: 6 digits, 10-min TTL, max 5 attempts, stored hashed
- OAuth register: create user + auth_identity; set emailVerified=true for trusted providers
- OAuth login: match by `(provider, providerUserId)` or link by verified email
- Unverified users receive 403 on all non-auth routes

**Acceptance Criteria:**
- [ ] Register → verify → login → refresh → logout flow passes integration tests
- [ ] Google idToken verified against Google certs (mock in tests)
- [ ] Apple identityToken verified against Apple JWKS (mock in tests)
- [ ] Refresh token reuse triggers session revocation
- [ ] Rate limits return 429 after threshold

**Dependencies:** Sprint 1

---

### Sprint 3 — Users, Profile, Moderation & Referrals

**Goal:** User profile management and social safety features.

**Deliverables:**
- `UsersModule`, `ModerationModule`, `ReferralsModule`
- Prisma models: `blocks`, `reports`, `referrals`
- Account deletion transactional service
- Onboarding completion computed field

**Endpoints:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users/me` | Yes | Current user profile + `onboardingComplete` |
| PATCH | `/users/me` | Yes | Update name, age, sex, location, lat/lng, avatar |
| PATCH | `/users/me/push-token` | Yes | `{ pushToken }` |
| DELETE | `/users/me` | Yes | Soft delete + cascade all user data |
| GET | `/users/me/referral` | Yes | `{ referralCode, referralCount, bonusInterests }` (auto-create code) |
| POST | `/users/me/referral/apply` | Yes | `{ code }` → `{ ok, reason? }` |
| POST | `/users/me/bonus-interests/consume` | Yes | Atomically decrement; `{ ok, remaining }` |
| GET | `/blocks` | Yes | List blocked user IDs |
| POST | `/blocks` | Yes | `{ blockedId }` — idempotent |
| POST | `/reports` | Yes | `{ reportedId, reason, notes? }` |

**PATCH /users/me validation:**
- `name`: min 2 chars if provided
- `age`: integer ≥ 16 if provided
- `location`, `locationLat`, `locationLng`: all required together for onboarding completion

**DELETE /users/me cascade (single transaction):**
1. Delete owned leanks → participants, reactions, messages, chat meta for each
2. Delete user's participations, reactions, messages, chat meta
3. Delete blocks, reports involving user
4. Revoke all refresh sessions
5. Soft delete user row (`deleted_at`, `is_active=false`)

**Referral apply reasons:** `INVALID_CODE`, `SELF_REFERRAL`, `ALREADY_APPLIED`, `ERROR`

**Acceptance Criteria:**
- [ ] Profile PATCH updates and returns correct `onboardingComplete`
- [ ] Referral code generated on first GET
- [ ] Apply referral idempotent; referrer stats increment correctly
- [ ] Block idempotent; blocked user excluded from subsequent feed queries
- [ ] Account deletion removes all related rows

**Dependencies:** Sprint 2

---

### Sprint 4 — Leanks CRUD & Feed

**Goal:** Create leanks and paginated discovery feed with filters.

**Deliverables:**
- `LeanksModule`, `FeedService`
- Prisma model: `leanks`
- Feed query service porting logic from `hooks/useLeanksFeed.ts`
- Block list integrated into feed exclusion

**Endpoints:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/leanks` | Yes | Create leank |
| GET | `/leanks/:id` | Yes | Get leank detail (owner + participants only for private fields) |
| PATCH | `/leanks/:id` | Yes | Update status (owner only): `{ status: "Completed" \| "Canceled" }` |
| GET | `/leanks/feed` | Yes | Paginated discovery feed |
| GET | `/leanks/hosted` | Yes | Leanks where `ownerId = me` |
| GET | `/leanks/attended` | Yes | Leanks where user is participant |
| GET | `/leanks/chats` | Yes | Active leanks where owner or participant (chat list) |

**POST /leanks body:**
```json
{
  "title": "string (required)",
  "description": "string",
  "cover": "string URL (required)",
  "date": "ISO8601 (required)",
  "time": "7:00 PM",
  "isOnline": false,
  "location": "Brooklyn, NY",
  "locationLat": 40.6782,
  "locationLng": -73.9442,
  "peopleRequired": 1
}
```

**POST /leanks behavior:**
- Set `ownerId` from JWT
- Default `status=Active`, `category=Other`
- If `isOnline=true`: location=`"Online"`, lat/lng=null
- Enqueue classification job (Sprint 7; stub no-op until then)

**GET /leanks/feed query params:**

| Param | Type | Description |
|-------|------|-------------|
| cursor | string | Opaque pagination cursor |
| limit | number | Default 10, max 50 |
| today | boolean | Filter date to today |
| thisWeek | boolean | Filter date to next 7 days |
| categories | string[] | LeankCategory values |
| ageMin | number | Filter by owner age |
| ageMax | number | Filter by owner age |
| includeOnline | boolean | Include online leanks |
| nearbyLat | number | User latitude |
| nearbyLng | number | User longitude |
| radiusKm | number | Default 25 |

**Feed exclusion rules:**
- `ownerId !== currentUserId`
- User not in participants
- No existing reaction by user for leank
- `status === Active`
- Leank owner not in user's block list
- Pro-only filters rejected with 403 if user not Pro (check `user_entitlements` or header)

**Feed response item shape:**
```json
{
  "id": "uuid",
  "cover": "...",
  "title": "...",
  "description": "...",
  "category": "Food & Drinks",
  "date": "...",
  "time": "7:00 PM",
  "location": "Online",
  "locationLat": null,
  "locationLng": null,
  "ownerId": "uuid",
  "owner": { "id": "uuid", "name": "...", "age": 25, "avatar": "..." },
  "participantIds": ["uuid"],
  "peopleRequired": 1,
  "status": "Active",
  "createdAt": "..."
}
```

**Acceptance Criteria:**
- [ ] Create leank returns 201 with defaults
- [ ] Feed excludes own/participated/reacted leanks
- [ ] All filter combinations match specified behavior
- [ ] Cursor pagination stable under concurrent inserts
- [ ] Non-Pro users get 403 when using Pro-only filters

**Dependencies:** Sprint 3

---

### Sprint 5 — Reactions, Requests & Participants

**Goal:** Swipe actions, join requests, accept/decline, membership management.

**Deliverables:**
- `ReactionsModule`, `ParticipantsService`
- Prisma models: `reactions`, `participants`, `daily_usage`
- Transactional accept/decline/leave/remove/close flows
- Daily usage enforcement

**Endpoints:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/reactions` | Yes | Record like or skip |
| DELETE | `/reactions/:leankId` | Yes | Undo reaction |
| GET | `/reactions/requests` | Yes | Pending join requests on owned leanks |
| POST | `/reactions/:id/accept` | Yes | Accept request (owner only) |
| POST | `/reactions/:id/decline` | Yes | Decline request (owner only) |
| GET | `/leanks/:id/participants` | Yes | Participant list with user preview |
| POST | `/leanks/:id/leave` | Yes | Participant leaves |
| DELETE | `/leanks/:id/participants/:userId` | Yes | Owner removes participant |

**POST /reactions body:**
```json
{ "leankId": "uuid", "action": "like" | "skip" }
```

**POST /reactions (like) enforcement:**
1. Check Pro OR `daily_usage.interest` < 5 OR `bonusInterests > 0`
2. If using bonus: call consume atomically
3. If free daily limit hit: return 402 `{ code: "INTEREST_LIMIT" }`
4. Upsert reaction row
5. Enqueue ALERT push to leank owner (Sprint 7; log until then)

**DELETE /reactions/:leankId (undo) enforcement:**
1. Check Pro OR `daily_usage.undo` < 1; else 402 `{ code: "UNDO_LIMIT" }`
2. Delete reaction; increment undo usage

**GET /reactions/requests response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "leankId": "uuid",
      "user": { "id", "name", "age", "avatar" },
      "leank": { "id", "title", "ownerId" },
      "createdAt": "..."
    }
  ],
  "meta": {
    "totalPending": 5,
    "visibleCount": 1,
    "isPro": false
  }
}
```

**POST /reactions/:id/accept (transaction):**
1. Verify caller is leank owner
2. Insert participant if not exists
3. Update reaction status → ACCEPTED
4. Enqueue ALERT push to requester

**POST /leanks/:id/leave:**
1. Remove participant row
2. Create system message: `"{name} left the leank"`

**DELETE /leanks/:id/participants/:userId:**
1. Owner only
2. Remove participant
3. System message: `"{name} was removed from the leank"`

**GET /users/me/usage:**

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/users/me/usage` | Yes | `{ interestsUsedToday, undosUsedToday, bonusInterests, limits: { interests, undos } }` |

**Acceptance Criteria:**
- [ ] Like/skip upsert idempotent per (user, leank)
- [ ] Accept creates participant + updates reaction atomically
- [ ] Free user sees 1 request; meta reflects locked count
- [ ] Daily limits reset at UTC midnight
- [ ] Leave/remove create system messages

**Dependencies:** Sprint 4

---

### Sprint 6 — Messaging & Read State

**Goal:** Group chat, read receipts, unread counts.

**Deliverables:**
- `MessagesModule`
- Prisma models: `messages`, `user_chat_meta`
- Denormalized lastMessage update in transaction
- Unread count aggregation endpoint

**Endpoints:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/leanks/:id/messages` | Yes | Paginated messages (cursor by createdAt) |
| POST | `/leanks/:id/messages` | Yes | Send message |
| PATCH | `/leanks/:id/read` | Yes | Mark chat read `{ readAt?: ISO8601 }` |
| GET | `/users/me/unread-count` | Yes | Total unread across all active chats |

**Authorization:** caller must be leank owner or participant; leank must be Active (except Completed leanks read-only).

**POST /leanks/:id/messages body:**
```json
{
  "content": "Hello!",
  "replyToMessageId": "uuid-or-null",
  "replyToSenderId": "uuid-or-null",
  "replyToSenderName": "string-or-null",
  "replyToContent": "string-or-null"
}
```

**POST behavior:**
1. Insert message with denormalized sender name/photo from user profile
2. Update `leanks.last_message_id`, `last_message_at`
3. Enqueue CHAT push to other participants (Sprint 7)

**GET /leanks/:id/messages:** return newest-first or oldest-first — **use oldest-first (asc) to match chat UI**; support `cursor` + `limit`

**PATCH /leanks/:id/read:** upsert `user_chat_meta`; default `readAt = now()`

**GET /users/me/unread-count logic:**
- Fetch all active chats for user
- Count where `lastMessage.senderId !== me` AND (`readAt` is null OR `lastMessage.createdAt > readAt`)

**Acceptance Criteria:**
- [ ] Non-participant receives 403
- [ ] Message list paginates correctly
- [ ] lastMessage denormalized on leank after send
- [ ] Unread count matches manual calculation
- [ ] Reply fields stored when provided

**Dependencies:** Sprint 5

---

### Sprint 7 — Media, Push Notifications & AI Classification

**Goal:** File uploads, background workers for push and category tagging.

**Deliverables:**
- `MediaModule` with presigned S3/R2 uploads
- `NotificationsModule` + BullMQ `push` queue
- `ClassificationModule` + BullMQ `classify` queue
- expo-server-sdk integration
- OpenAI classification (port from `appwrite/functions/classify-leank.md`)

**Endpoints:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/media/presign` | Yes | `{ filename, contentType, purpose: "avatar" \| "leank_cover" }` |
| POST | `/media/confirm` | Yes | `{ key }` → `{ url }` |

**POST /media/presign response:**
```json
{
  "uploadUrl": "https://s3...",
  "key": "avatars/uuid/timestamp.jpg",
  "publicUrl": "https://cdn.leankly.app/avatars/uuid/timestamp.jpg",
  "expiresIn": 300
}
```

**Background Jobs (not HTTP):**

| Job | Trigger | Action |
|-----|---------|--------|
| `push.send` | Reaction like, request accept, message send | Send Expo push |
| `leank.classify` | Leank created | OpenAI classify → PATCH leank category |

**Push payloads (match existing mobile handler):**

```typescript
// ALERT
{ type: "Alert", data: { title: string, content: string, token: string } }

// CHAT
{ type: "Chat", data: { /* full message object */ } }
```

**Classification input:**
```json
{ "title": "...", "description": "...", "categories": ["Fitness & Sports", ...] }
```
**Output:** update leank `category` to matched enum or `Other`

**Wire up deferred triggers from Sprints 5–6:**
- Like → push owner
- Accept → push requester
- Message → push participants

**Acceptance Criteria:**
- [ ] Presign → upload to S3 → confirm returns public URL
- [ ] Push job delivers to Expo test token
- [ ] Classification updates category within 30s of create
- [ ] Failed push/classify jobs retry 3x with exponential backoff

**Dependencies:** Sprint 6

---

### Sprint 8 — Realtime WebSocket Gateway

**Goal:** Live updates for messages screens.

**Deliverables:**
- `RealtimeModule` with Socket.io gateway
- Redis adapter for multi-instance support
- JWT authentication on handshake
- Room-based subscriptions

**WebSocket Events (server → client):**

| Event | Room | Payload |
|-------|------|---------|
| `leank.updated` | `leank:{id}` | Full leank object |
| `leank.deleted` | `leank:{id}` | `{ id }` |
| `message.created` | `leank:{id}` | Message object |
| `reaction.updated` | `user:{ownerId}` | Reaction + nested user/leank |
| `chatMeta.updated` | `user:{userId}` | `{ leankId, readAt }` |

**Client → server:**

| Event | Payload |
|-------|---------|
| `subscribe.leank` | `{ leankId }` |
| `subscribe.user` | `{}` (uses JWT userId) |
| `unsubscribe.leank` | `{ leankId }` |

**Acceptance Criteria:**
- [ ] Invalid JWT rejected on connect
- [ ] Message create emits to leank room within 100ms
- [ ] Accept request emits to owner's user room
- [ ] Redis adapter supports 2+ API instances

**Dependencies:** Sprint 6 (events emitted from services)

---

### Sprint 9 — Entitlements, Admin & Production Hardening

**Goal:** RevenueCat sync, admin ops, security polish, observability.

**Deliverables:**
- `EntitlementsModule`
- `AdminModule` (API key or role-guarded)
- Rate limiting global + per-route
- Request logging with Pino
- Sentry/error tracking hooks
- RevenueCat webhook handler

**Endpoints:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/webhooks/revenuecat` | Webhook secret | Sync Pro entitlement |
| GET | `/users/me/entitlements` | Yes | `{ isPro, expiresAt }` |
| GET | `/admin/reports` | Admin | List recent reports |
| PATCH | `/admin/users/:id/suspend` | Admin | `{ suspended: true }` |

**RevenueCat webhook:** update `user_entitlements.is_pro` based on entitlement ID from env `REVENUECAT_ENTITLEMENT_ID`

**Production hardening checklist:**
- Helmet middleware
- Throttler: 100 req/min global, stricter on auth
- Graceful shutdown
- DB connection pooling
- OpenAPI exported to `openapi.json` artifact

**Acceptance Criteria:**
- [ ] RevenueCat test webhook updates isPro
- [ ] Pro user bypasses feed filter 403 and usage limits
- [ ] Admin routes reject non-admin JWT
- [ ] Rate limit returns 429 with Retry-After

**Dependencies:** Sprint 5 (usage limits), Sprint 7

---

### Sprint 10 — Mobile Client Integration

**Goal:** Replace Appwrite + Clerk in existing Expo app with owned API client.

**Deliverables (mobile repo `leankly/`):**

```
lib/
├── auth/
│   ├── AuthContext.tsx
│   ├── auth.api.ts
│   ├── tokenStorage.ts
│   └── useAuth.ts
├── api/
│   ├── client.ts          # fetch + auth header + 401 refresh
│   ├── mappers.ts         # id → $id compatibility
│   ├── users.api.ts
│   ├── leanks.api.ts
│   ├── reactions.api.ts
│   ├── messages.api.ts
│   ├── media.api.ts
│   └── realtime.ts
```

**Files to refactor:**

| File | Change |
|------|--------|
| `app/_layout.tsx` | Remove ClerkProvider; add AuthProvider |
| `app/(app)/_layout.tsx` | useAuth + GET /users/me bootstrap |
| `app/expo-auth-session.tsx` | Remove or repurpose for OAuth redirect |
| `hooks/useGoogleSignIn.tsx` | idToken → POST /auth/oauth/google |
| `app/(app)/sign-in.tsx` | Wire Apple auth |
| `app/(app)/mail-auth.tsx` | All auth via auth.api.ts |
| `appwrite/*` | Delete after parity |
| `hooks/useLeanksFeed.ts` | Wrap GET /leanks/feed |
| `hooks/useBucket.ts` | Presigned upload flow |
| `lib/GlobalContext.tsx` | API calls for unread, blocks |
| `lib/ProfileContext.tsx` | PATCH /users/me |
| `app/(app)/(tabs)/messages/*` | API + WebSocket |
| `app/(app)/(tabs)/index.tsx` | POST /reactions |
| `app/(app)/(tabs)/create.tsx` | POST /leanks |
| `lib/PremiumContext.tsx` | Purchases.logIn(user.id) |

**Remove packages:** `@clerk/clerk-expo`, `react-native-appwrite`

**Env vars (mobile):**
```
EXPO_PUBLIC_API_BASE_URL=
EXPO_PUBLIC_WS_URL=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
```

**Acceptance Criteria:**
- [ ] Full app smoke test passes against staging API
- [ ] No imports from appwrite or clerk remain
- [ ] Token refresh works after 15-min access expiry
- [ ] Realtime updates work on messages screens

**Dependencies:** Sprints 2–9 deployed to staging

---

### Sprint 11 — QA, Load Testing & Production Launch

**Goal:** Ship production backend and mobile release.

**Deliverables:**
- End-to-end test suite (Detox or Maestro optional)
- Load test script (k6): 500 concurrent feed requests
- Production deployment manifests
- Runbook document
- Staging → production promotion

**No new endpoints.** Stabilization sprint.

**Acceptance Criteria:**
- [ ] All §12 test cases pass
- [ ] k6 p95 < 300ms on feed at 500 VUs
- [ ] Zero critical bugs in 48h staging soak
- [ ] Production deployed with monitoring alerts
- [ ] Mobile app submitted or OTA published

**Dependencies:** Sprint 10

---

## 10. Mobile Client Integration Requirements

### 10.1 Auth Flow (Target)

```
App Launch
  → read refreshToken from SecureStore
  → if exists: POST /auth/refresh
  → GET /users/me
  → if !onboardingComplete: /onboarding
  → else: /(tabs)

Sign In (email)
  → POST /auth/login
  → store tokens
  → GET /users/me

Sign Up (email)
  → POST /auth/register
  → OTP screen
  → POST /auth/verify-email
  → store tokens

Google
  → native Google sign-in → idToken
  → POST /auth/oauth/google
  → store tokens
```

### 10.2 API Client Requirements

- Attach `Authorization: Bearer` on all protected requests
- On 401: attempt refresh once; retry original request; on failure logout
- Parse error body for toast messages
- Base URL from `EXPO_PUBLIC_API_BASE_URL`

### 10.3 Screens → Endpoint Map

| Screen | Endpoints Used |
|--------|----------------|
| sign-in, mail-auth | `/auth/*` |
| onboarding | PATCH `/users/me`, POST `/users/me/referral/apply` |
| (tabs)/index | GET `/leanks/feed`, POST/DELETE `/reactions`, GET `/users/me/usage` |
| (tabs)/create | POST `/media/*`, POST `/leanks` |
| (tabs)/messages/index | GET `/reactions/requests`, GET `/leanks/chats`, POST accept/decline, WS |
| (tabs)/messages/[chat] | GET/POST messages, PATCH read, WS |
| (tabs)/messages/settings/[chat] | GET participants, leave, remove, PATCH leank status |
| (tabs)/profile | GET hosted/attended |
| profile/settings | PATCH `/users/me`, DELETE `/users/me`, GET referral |
| paywall | RevenueCat (unchanged) + GET `/users/me/entitlements` |

---

## 11. Background Jobs & Realtime Events

### 11.1 Queue Configuration

```typescript
// Queue names
'push-notifications'
'leank-classification'

// Retry: 3 attempts, exponential backoff 1s/4s/16s
// Failed jobs → dead letter log
```

### 11.2 Push Notification Service

Use `expo-server-sdk`. Batch messages. Drop invalid tokens and optionally clear `users.push_token`.

### 11.3 Classification Service

Model: `gpt-4o-mini`, temperature: 0. Prompt per `appwrite/functions/classify-leank.md`. Normalize response to `LeankCategory` enum.

---

## 12. Testing Requirements

### 12.1 Integration Tests (Required per Sprint)

| Area | Min Tests |
|------|-----------|
| Auth register/verify/login/refresh/logout | 10 |
| OAuth google/apple (mocked) | 4 |
| Referral apply edge cases | 5 |
| Feed exclusion + filters | 8 |
| Accept request transaction | 3 |
| Message send + unread | 5 |
| Account deletion cascade | 2 |
| Daily usage limits | 4 |

### 12.2 Manual QA Checklist (Pre-Launch)

- [ ] Email register + OTP + login
- [ ] Google sign-in iOS + Android
- [ ] Apple sign-in iOS
- [ ] Forgot password + reset
- [ ] Onboarding profile save
- [ ] Referral code apply
- [ ] Create leank with cover upload
- [ ] Feed swipe like/skip/undo with limits
- [ ] Pro filters (with test entitlement)
- [ ] Accept/decline request + push
- [ ] Group chat send/receive + realtime
- [ ] Read receipts + tab badge
- [ ] Leave/remove/close leank + system messages
- [ ] Block user → hidden from feed
- [ ] Report user
- [ ] Account deletion
- [ ] Token refresh after 15 min
- [ ] RevenueCat purchase → isPro reflected

---

## 13. Manual Labor Checklist

Execute in this order. These are human tasks that AI/agents cannot complete autonomously.

### Phase A — Accounts & Credentials (Before Sprint 1)

- [ ] **A1.** Create GitHub repository `leankly-api`
- [ ] **A2.** Create cloud provider account (Railway / Fly.io / AWS — pick one)
- [ ] **A3.** Register domain `leankly.app` (or chosen domain) and create DNS records:
  - `api.leankly.app` → API load balancer
  - `staging-api.leankly.app` → staging
  - `cdn.leankly.app` → S3/R2 CDN (optional CNAME)
- [ ] **A4.** Create PostgreSQL instance (staging + production)
- [ ] **A5.** Create Redis instance (staging + production)

### Phase B — Third-Party Services (Before Sprint 2)

- [ ] **B1.** Create Resend (or SendGrid) account; verify sending domain; add SPF, DKIM, DMARC DNS records
- [ ] **B2.** Generate JWT secrets (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`); store in secret manager
- [ ] **B3.** Google Cloud Console:
  - Create OAuth 2.0 credentials for iOS, Android, and Web (token verification)
  - Note Client IDs for mobile env vars
- [ ] **B4.** Apple Developer:
  - Enable Sign In with Apple on App ID `com.barrakudadev.leankly`
  - Create Services ID + Key (.p8); note Team ID, Key ID, Client ID
- [ ] **B5.** Create S3 bucket (or Cloudflare R2 bucket) with CORS policy allowing mobile uploads
- [ ] **B6.** Create CDN/public access policy for uploaded media

### Phase C — External Keys (Before Sprint 7)

- [ ] **C1.** Create OpenAI API key; set spending limit
- [ ] **C2.** Create Expo push access token (if using enhanced push features)
- [ ] **C3.** Confirm RevenueCat project exists; note Apple/Google API keys and entitlement ID

### Phase D — Environment Configuration (During Sprint 1)

- [ ] **D1.** Fill `.env` for local development from `.env.example`
- [ ] **D2.** Configure staging environment variables in hosting provider
- [ ] **D3.** Configure production environment variables (leave disabled until Sprint 11)

### Phase E — Mobile Configuration (During Sprint 10)

- [ ] **E1.** Update `app.config.js`: remove Clerk/Appwrite keys; add API/WS URLs
- [ ] **E2.** Add Google OAuth client IDs to iOS `Info.plist` / Android `google-services` as required
- [ ] **E3.** Configure Apple Sign In capability in Xcode / EAS build profile
- [ ] **E4.** Test on physical iOS device (push + Apple auth require real device)
- [ ] **E5.** Test on physical Android device (push + Google auth)

### Phase F — Deployment (During Sprint 9–11)

- [ ] **F1.** Set up CI/CD pipeline (GitHub Actions → deploy on merge to `main`)
- [ ] **F2.** Configure RevenueCat webhook URL → `https://api.leankly.app/v1/webhooks/revenuecat`
- [ ] **F3.** Set up error monitoring (Sentry) for API and mobile
- [ ] **F4.** Set up uptime monitoring on `/health`
- [ ] **F5.** Configure DB automated backups (daily, 30-day retention)
- [ ] **F6.** Run staging soak test (48 hours) before production cutover

### Phase G — Launch (Sprint 11)

- [ ] **G1.** Production deploy of `leankly-api`
- [ ] **G2.** Point mobile app to production API URL
- [ ] **G3.** Submit App Store / Play Store build (or EAS OTA update)
- [ ] **G4.** Monitor logs and error rates for 72 hours post-launch
- [ ] **G5.** Remove Appwrite and Clerk accounts/subscriptions (no migration needed)

---

## Appendix A — Environment Variables Reference

### Backend `.env`

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/leankly
REDIS_URL=redis://localhost:6379

JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=2592000

GOOGLE_CLIENT_ID_IOS=
GOOGLE_CLIENT_ID_ANDROID=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY=
APPLE_CLIENT_ID=

RESEND_API_KEY=
EMAIL_FROM=noreply@leankly.app

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=leankly-media
CDN_BASE_URL=https://cdn.leankly.app

OPENAI_API_KEY=
EXPO_ACCESS_TOKEN=

REVENUECAT_WEBHOOK_SECRET=
REVENUECAT_ENTITLEMENT_ID=

ADMIN_API_KEY=

CORS_ORIGINS=http://localhost:8081,exp://
```

### Mobile `.env`

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/v1
EXPO_PUBLIC_WS_URL=ws://localhost:3000
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY=
EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY=
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=
```

---

## Appendix B — Sprint Endpoint Summary

| Sprint | New Endpoints |
|--------|---------------|
| 1 | `GET /health`, `GET /health/db`, `GET /health/redis` |
| 2 | 10 `/auth/*` routes |
| 3 | 10 `/users/me/*`, `/blocks`, `/reports` |
| 4 | 7 `/leanks/*` routes |
| 5 | 8 `/reactions/*`, participants, leave, `/users/me/usage` |
| 6 | 4 messages/read/unread routes |
| 7 | 2 `/media/*` + background jobs |
| 8 | WebSocket events (no REST) |
| 9 | 4 webhook/admin/entitlements routes |
| 10 | Mobile integration (no new backend routes) |
| 11 | Production launch (no new routes) |

**Total REST endpoints: 46 + 3 health + WebSocket gateway**

---

*End of SRS v1.0*
