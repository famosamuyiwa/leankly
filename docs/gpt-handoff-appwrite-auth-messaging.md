# GPT Handoff: Appwrite-Only Auth + Messaging-First Backend Refactor

## Purpose

This handoff translates `docs/executive-summary.md` into an implementation-ready plan for a GPT coding agent. The immediate target is **Appwrite-only auth** and a less client-heavy backend model, with maximum scrutiny on messaging because it is the core product surface.

Do **not** add test files in this pass. Use focused TypeScript/lint checks and manual verification notes only.

## Current Direction

The existing `docs/SRS-leankly-backend.md` describes replacing Appwrite + Clerk with a greenfield NestJS/Postgres backend. The current product direction is different:

- Remove Clerk.
- Use **Appwrite Auth** as the identity/session provider.
- Keep Appwrite data/storage/function primitives short term.
- Move business logic out of the mobile client behind REST-style API endpoints where practical.
- Keep UI route files presentation-focused; no database, auth-provider, realtime, notification, or business-rule logic should live directly in screen components.
- Prioritize messaging, requests, participants, read receipts, unread counts, and notifications.

This means the right near-term architecture is an **Appwrite Auth + API facade**:

```text
Expo App
  -> Appwrite Auth session for identity
  -> REST endpoints for business mutations and reads
  -> realtime channel only for lightweight event notifications

API Facade / Server Functions
  -> verifies Appwrite user identity
  -> owns authorization and business rules
  -> performs Appwrite DB writes server-side
  -> sends push notifications after successful persistence
```

## Refactor Extent

This is a **large refactor**, not a small patch.

Expected affected areas:

- Root providers: `app/_layout.tsx`
- Protected app layout: `app/(app)/_layout.tsx`
- Auth screens: `app/(app)/sign-in.tsx`, `app/(app)/mail-auth.tsx`
- Remove Clerk redirect shim: `app/expo-auth-session.tsx`
- Remove Clerk Google hook: `hooks/useGoogleSignIn.tsx`
- Appwrite client setup: `appwrite/config.ts`
- User provisioning: `appwrite/actions/user.actions.ts`
- Profile settings sign-out/delete: `app/(app)/(tabs)/profile/(settings)/index.tsx`, `app/(app)/(tabs)/profile/(settings)/edit-profile.tsx`
- Messaging list/chat/settings: `app/(app)/(tabs)/messages/index.tsx`, `app/(app)/(tabs)/messages/[chat].tsx`, `app/(app)/(tabs)/messages/settings/[chat].tsx`
- Global unread/current user state: `lib/GlobalContext.tsx`
- Push notification routing: `lib/PushNotificationContext.tsx`, root notification handler
- Dependency cleanup: `package.json`, `package-lock.json`, app config env references

The highest-risk refactor is messaging because several flows currently perform multi-step writes directly from the client.

## UI And Logic Separation Standard

The app should move toward a clear presentation/domain boundary. Route files under `app/` should become thin screens that render UI, read route params, and call hooks/controllers. They should not contain direct Appwrite calls, push calls, realtime subscription setup, or multi-step business workflows.

Recommended structure:

```text
lib/
  auth/
    appwriteAuth.ts
    AuthProvider.tsx
    useAuthSession.ts
  features/
    messaging/
      messaging.api.ts
      messaging.types.ts
      useChatList.ts
      useChatRoom.ts
      useChatMessages.ts
      useChatRealtime.ts
      useChatActions.ts
    requests/
      requests.api.ts
      useRequests.ts
      useRequestActions.ts
    leanks/
      leanks.api.ts
      useFeed.ts
      useLeankActions.ts
    profile/
      profile.api.ts
      useProfile.ts
```

Screen responsibility:

- render layout and components
- read route params
- call feature hooks/controllers
- display loading, error, empty, and success states
- wire UI events to named actions from hooks

Hook/controller responsibility:

- fetch data
- perform mutations
- subscribe/unsubscribe realtime listeners
- normalize Appwrite/API responses
- maintain screen-specific async state
- expose stable actions to the UI

API/service responsibility:

- own HTTP/Appwrite calls
- map server errors into app errors
- avoid leaking raw Appwrite response shapes into UI components

This separation should be introduced **after Appwrite auth is established and before the messaging API facade migration**. Doing it earlier creates churn while auth is still changing; doing it later makes the messaging refactor harder because screens remain entangled with DB calls.

## Code Comment Standard

Comment code during implementation, but keep comments purposeful. Add short comments for non-obvious logic only:

- auth/session bootstrap decisions
- route guards and fallback states
- idempotent mutations
- realtime filtering and subscription cleanup
- unread-count ownership
- server/API facade boundaries
- retry/backoff behavior
- places where Appwrite limitations force careful ordering

Do not add comments that simply repeat what a line of code does. Prefer naming functions and variables clearly, then comment the reasoning or invariant the next developer needs to preserve.

## Current Dirty Worktree Warning

Before implementing, inspect `git status --short`. At handoff time, unrelated local changes existed in:

- `app.config.js`
- `package-lock.json`
- `.env`
- `docs/` may be untracked depending on the branch

Do not stage or revert unrelated user work. Stage only files changed for the current checkpoint.

## Priority Bugs From Executive Summary

### P0. Authentication Trust Model Is Broken

**Symptoms**

- Clerk is the active auth provider.
- Appwrite client is initialized without a user session bridge.
- Appwrite rows are accessed directly from the mobile client.
- Business rules rely on caller-supplied IDs and client checks.

**Fix**

- Remove Clerk provider and hooks.
- Add Appwrite `Account` usage in `appwrite/config.ts`.
- Introduce an app auth/session context backed by Appwrite Auth.
- Fetch current Appwrite user from `account.get()`.
- Use the Appwrite Auth user id as the canonical `users.$id`.
- Upsert the user profile row after auth success.
- Lock down Appwrite table/function permissions so authenticated users cannot spoof cross-user writes.

### P0. Messaging Authorization Is Client-Only

**Symptoms**

- `messages/[chat].tsx` can load/send for any URL `chatId`.
- Chat membership checks are implicit and client-side.
- Accept/decline, participant mutation, system message creation, last-message updates, read receipts, and notifications are spread across screens.

**Fix**

- Move chat and request mutations behind API facade endpoints.
- Every endpoint must derive `userId` from the Appwrite-authenticated request, not from request body.
- Validate owner/participant membership server-side before read/write.
- Make accept/decline/leave/remove/send/read idempotent where possible.
- Send push notifications only after DB writes succeed.

### P0. Multi-Step DB Mutations Are Not Atomic

**Symptoms**

- Accept request: update `participantIds`, create participant row, update reaction, send push.
- Send message: create message, update `lastMessage`, send push.
- Leave/remove/close: update participants/status, create system messages, navigate even on failure.

**Fix**

- Wrap each business operation in one server-owned endpoint.
- If staying on Appwrite without DB transactions, enforce idempotency and strict ordering:
  - check existing participant before create
  - use deterministic or unique constraints where available
  - only update UI after server confirms
  - make notification delivery best-effort after persistence

### P0. Push Notification Function Is Client-Triggerable

**Symptoms**

- Mobile client calls `sendPushNotification` directly.
- Arbitrary client payloads could trigger pushes if function permissions are open.
- Errors are swallowed.

**Fix**

- Remove direct push function calls from app screens.
- Push is sent by API facade/server after validating action and persistence.
- Function/API must derive recipients server-side.

### P1. Auth Flows Are Incomplete

**Symptoms**

- Forgot/reset password flows are stubs.
- Apple sign-in does nothing.
- Google SSO is Clerk-only.
- Mail login bypasses Appwrite provisioning.
- Returning users do not update push tokens.

**Fix**

- Implement Appwrite email/password session creation.
- Implement Appwrite email verification and password recovery.
- Implement Appwrite OAuth for Google and Apple if supported by the current Expo/Appwrite flow.
- Upsert user profile and push token after every successful auth/session refresh.
- Remove `expo-auth-session.tsx` Clerk provisioning path.

### P1. Unread Badges And Realtime Are Fragile

**Symptoms**

- Badge state has been driven by multiple clients/listeners.
- Realtime event payloads may be sparse.
- Broad refetches can cause lag/flicker.
- Chat screen and message list both compete with global unread state.

**Fix**

- Make unread count server-owned.
- Client should call `GET /me/unread-count` on launch/focus.
- Realtime should emit lightweight invalidation events like `unread.changed`, not force local recomputation from partial payloads.
- Chat read endpoint should return the updated unread count.

### P1. Chat Lifecycle Bugs

**Symptoms**

- Previous chat can flash during route changes.
- `MessagesContext.currentLeank` can remain stale.
- Chat capped at 50 messages with no pagination.
- Send + realtime refetch can duplicate/reorder messages.
- Fetch failures show empty screens.

**Fix**

- Reset chat state when `chatId` changes.
- Clear `currentLeank` on chat unmount or mismatch.
- Add cursor pagination.
- Use server-generated message ids/timestamps as source of truth.
- Avoid optimistic insertion until server response is returned, or reconcile by id.
- Add user-visible error and retry states.

### P2. Profile, Feed, Referral, Subscription Rules Are Client-Heavy

**Symptoms**

- Feature gates, referrals, bonus interests, Pro checks, and age rules are partly client-only.
- Quota can be consumed when writes fail.
- Referral rewards can be inconsistent.

**Fix**

- Move limits/referrals/bonus-interest consumption behind API facade endpoints.
- Keep RevenueCat on device for purchases, but sync entitlement server-side.
- Server decides whether action is allowed.

## Target API Facade

Use Appwrite Auth as identity. The API facade can be Appwrite Functions, a small Node/Fastify service, or a NestJS service. The key is that the mobile app calls business endpoints rather than composing DB writes itself.

### Auth Endpoints / Client Methods

If using Appwrite Auth directly from the client:

- `account.createEmailPasswordSession(email, password)`
- `account.create(ID.unique(), email, password, name)`
- `account.createVerification(url)`
- `account.updateVerification(userId, secret)`
- `account.createRecovery(email, url)`
- `account.updateRecovery(userId, secret, password)`
- `account.createOAuth2Session(provider, successUrl, failureUrl)`
- `account.get()`
- `account.deleteSession("current")`

Keep these in a dedicated Appwrite auth adapter/context. Do not scatter `account.*` calls across screens.

### Messaging / Request REST Endpoints

These should be owned by the API facade.

```text
GET    /v1/chats
GET    /v1/chats/:chatId
GET    /v1/chats/:chatId/messages?cursor=&limit=
POST   /v1/chats/:chatId/messages
PATCH  /v1/chats/:chatId/read
GET    /v1/me/unread-count

GET    /v1/requests
POST   /v1/requests/:requestId/accept
POST   /v1/requests/:requestId/decline

POST   /v1/chats/:chatId/leave
POST   /v1/chats/:chatId/close
DELETE /v1/chats/:chatId/participants/:userId
```

Every endpoint must:

- authenticate the Appwrite user
- derive actor id from auth
- verify owner/participant access
- validate request body
- perform writes in safe order
- return canonical updated state
- never trust `ownerId`, `senderId`, or `userId` from the client body

### Realtime Strategy

Use realtime only as an invalidation/event layer:

```text
chat.updated        -> refresh one chat row
message.created     -> append one server message if chat is open
request.updated     -> refresh requests list or remove accepted/declined row
unread.changed      -> update unread count from event payload or refetch count
participant.updated -> refresh chat/settings participants
```

Avoid broad refetches on every event. Avoid deriving unread count from sparse realtime payloads.

## Chronological Commit Checkpoints

### Commit 1: `document appwrite auth and messaging handoff`

Scope:

- Add this handoff document.
- No code changes.
- No test files.

Verification:

- `git status --short`
- Confirm only intended doc is staged.

### Commit 2: `add appwrite account auth adapter`

Scope:

- Update `appwrite/config.ts` to export `account`.
- Create an auth adapter/context for Appwrite Auth session state.
- Keep current UI behavior unchanged where possible.
- Do not remove Clerk yet; bridge behind a temporary interface if needed.

Fixes:

- Creates a single place for Appwrite Auth calls.
- Starts removing auth logic from screens.

Verification:

- `npx tsc --noEmit --pretty false`
- focused lint on changed files

### Commit 3: `replace clerk root providers with appwrite auth`

Scope:

- Remove `ClerkProvider` from `app/_layout.tsx`.
- Replace `useAuth()` in `app/(app)/_layout.tsx` with Appwrite auth context.
- Remove Clerk publishable key dependency from root layout.
- Ensure protected routes use Appwrite session readiness.
- Fix bootstrap failure: never leave app stuck on infinite spinner.

Fixes:

- Removes dual-auth model.
- Makes Appwrite user id canonical.

Verification:

- Launch unauthenticated app; confirm sign-in routes show.
- Launch authenticated app; confirm app routes show.
- Confirm missing profile row routes to provisioning/onboarding, not infinite loader.

### Commit 4: `migrate email auth flows to appwrite`

Scope:

- Replace `useSignIn`, `useSignUp`, `useUser` in `mail-auth.tsx`.
- Implement email/password login.
- Implement signup and verification flow using Appwrite Auth.
- Implement forgot/reset password using Appwrite recovery.
- Remove Clerk-specific `expo-auth-session` provisioning route if unused.
- Upsert profile row and push token after successful auth.

Fixes:

- Mail login provisioning gap.
- Forgot/reset stubs.
- OTP incomplete loading bug.
- Returning user push-token drift.

Verification:

- Sign up with email.
- Verify email.
- Log out and log in.
- Forgot/reset password.
- Verify current user row exists and push token updates.

### Commit 5: `migrate oauth buttons to appwrite`

Scope:

- Remove Clerk Google hook.
- Implement Appwrite OAuth for Google.
- Implement Appwrite OAuth for Apple or explicitly hide Apple until configured.
- Await OAuth promises and surface user-facing errors.
- Remove remaining `@clerk/clerk-expo` imports.

Fixes:

- Google provisioning gap.
- Apple no-op.
- Clerk dependency removal.

Verification:

- Google sign-in success and cancel paths.
- Apple sign-in success/cancel on iOS if configured.
- `rg "@clerk|Clerk|useAuth|useUser|useSignIn|useSignUp" app hooks lib components`

### Commit 6: `separate ui from domain logic`

Scope:

- Move auth, messaging, request, feed, and profile screen logic into feature hooks/controllers.
- UI route files should stop calling `db.*`, `account.*`, `client.subscribe`, `sendPushNotification`, or API clients directly.
- Start with messaging screens because they are the core feature:
  - `messages/index.tsx` uses `useChatList()` and `useRequests()`
  - `messages/[chat].tsx` uses `useChatRoom()`, `useChatMessages()`, `useChatActions()`
  - `messages/settings/[chat].tsx` uses `useChatSettings()`
- Keep behavior equivalent before replacing data sources with REST endpoints.
- Add comments around non-obvious hook invariants, especially realtime cleanup and unread ownership.

Fixes:

- Reduces screen complexity before the messaging backend refactor.
- Makes later API facade migration safer because data access is centralized.
- Creates a repeatable pattern for future domains.

Verification:

- `rg "db\\.|account\\.|client\\.subscribe|sendPushNotification" app`
- Confirm any remaining matches in `app/` are intentional temporary exceptions and documented in this handoff or commit message.
- Open chat list, chat room, settings, feed, profile, and auth screens.
- Focused lint on changed files.

### Commit 7: `move chat reads to api facade`

Scope:

- Add API client module for REST endpoints.
- Replace direct DB reads in message list/chat/settings with:
  - `GET /v1/chats`
  - `GET /v1/chats/:chatId`
  - `GET /v1/chats/:chatId/messages`
- Keep Appwrite DB implementation behind the API facade if the server is not fully extracted yet.
- Add pagination shape for messages even if UI initially loads first page only.

Fixes:

- Client no longer assembles chat access rules.
- Enables server-side membership checks.
- Prepares for unread count centralization.

Verification:

- Open chat list.
- Open chat directly by URL.
- Confirm unauthorized chat id returns a handled error.

### Commit 8: `move message send and read receipts to api facade`

Scope:

- Replace `db.createRow(messages)`, `db.updateRow(leanks.lastMessage)`, `sendPushNotification` from chat screen with `POST /v1/chats/:chatId/messages`.
- Replace client read receipt upsert with `PATCH /v1/chats/:chatId/read`.
- Server returns canonical message and unread count.
- Client reconciles by message id.

Fixes:

- Duplicate/reordered messages.
- Client-triggered chat push.
- Read receipt duplicate writes.
- Last-message race.

Verification:

- Send one message.
- Receive message in another client.
- Read message and confirm unread count decrements once.
- Confirm push is not sent to sender.

### Commit 9: `move request and participant mutations to api facade`

Scope:

- Replace accept/decline direct writes in `messages/index.tsx`.
- Replace leave/remove/close direct writes in `messages/settings/[chat].tsx`.
- Server endpoint owns:
  - participant row idempotency
  - `participantIds` update
  - reaction status
  - system message
  - push notification
  - final response state

Fixes:

- Partial accept/decline failures.
- Navigation after failed leave/close.
- Duplicate participant rows.
- Client-triggered accept push.

Verification:

- Accept request twice; only one participant.
- Decline request.
- Leave chat.
- Remove participant.
- Close leank.

### Commit 10: `centralize unread badge and realtime invalidation`

Scope:

- Add `GET /v1/me/unread-count`.
- Remove local unread count derivation from message list.
- Realtime updates should carry either:
  - authoritative unread count, or
  - scoped invalidation that triggers only `/me/unread-count`
- Suppress badge update for currently open chat.
- Avoid broad chat list refetch on every message.

Fixes:

- Badge flicker.
- Device lag from repeated refetches.
- Multiple unread state writers.

Verification:

- Receive unread message outside messages tab.
- Receive message while already inside that chat.
- Mark chat read.
- Switch tabs repeatedly and confirm no refetch loop.

### Commit 11: `move feed and quota writes to api facade`

Scope:

- Move like/skip/undo into API endpoints.
- Server enforces daily interest limit, bonus interest decrement, Pro status.
- Server returns updated feed/quota metadata.
- Do not increment local quota unless server confirms.

Fixes:

- Quota consumed on failed writes.
- Bonus interest double-spend.
- Client-only Pro/free gate bypass.

Verification:

- Like within free limit.
- Hit free limit.
- Use bonus interest.
- Undo.

### Commit 12: `remove client push function calls`

Scope:

- Remove `sendPushNotification` from app screens.
- Keep push registration/token update in client.
- Server/facade sends all pushes after validated actions.
- Surface push token registration errors in UI or logs suitable for production diagnostics.

Fixes:

- Client-triggerable push function.
- Silent push failures.

Verification:

- Request like notifies owner.
- Request accept notifies requester.
- Message notifies participants except sender.

### Commit 13: `cleanup clerk dependency and stale auth files`

Scope:

- Remove `@clerk/clerk-expo` from `package.json`.
- Remove `hooks/useGoogleSignIn.tsx` if replaced.
- Remove `app/expo-auth-session.tsx` if unused.
- Update comments/docs that still reference Clerk.
- Remove Clerk env config from `app.config.js` only if no longer needed.

Fixes:

- Dead auth dependency.
- Confusing dual-auth code.

Verification:

- `rg "Clerk|clerk|@clerk" .`
- `npx tsc --noEmit --pretty false`
- `npm run lint`

### Commit 14: `harden production config`

Scope:

- Ensure `.env` is ignored.
- Remove global iOS arbitrary loads unless a specific exception is required.
- Avoid requiring push/classification function IDs at import time if the screen does not need them.
- Add graceful config validation and user-safe error behavior.

Fixes:

- Secret leak risk.
- App Store review risk.
- Import-time crashes.

Verification:

- Clean install with env present.
- Missing optional env does not crash unrelated screens.

## Messaging Implementation Notes

Messaging should be treated as a server-owned domain. The mobile app should not be responsible for:

- deciding whether a user can enter a chat
- creating participant rows
- mutating `participantIds`
- updating `lastMessage`
- deciding push recipients
- calculating global unread counts from raw chat/message rows
- resolving duplicate realtime events

Recommended server-side messaging transaction shape:

```text
sendMessage(actorId, chatId, content, replyMetadata)
  1. load leank/chat
  2. assert status Active
  3. assert actor is owner or participant
  4. create message with server timestamp and sender snapshot
  5. update leank lastMessage / lastMessageAt
  6. enqueue push to owner + participants excluding sender
  7. emit message.created to chat room
  8. emit unread.changed to affected users
  9. return canonical message + chat meta
```

Recommended read receipt shape:

```text
markRead(actorId, chatId, readAt = now)
  1. assert actor is owner or participant
  2. upsert user_chat_meta by (chatId, actorId)
  3. emit chatMeta.updated / unread.changed only for actor
  4. return unreadCount
```

Recommended accept request shape:

```text
acceptRequest(actorId, requestId)
  1. load reaction + leank
  2. assert actor owns leank
  3. if already accepted, return current state
  4. create participant if missing
  5. add participant id to leank membership
  6. update reaction ACCEPTED
  7. enqueue accepted push
  8. emit request.updated + participant.updated
  9. return updated request/chat
```

## Manual Labor To Present After Plan Execution

Do not stop mid-phase asking the user to perform these. Collect them and present them after the implementation plan has been executed or when explicitly blocked.

Manual tasks likely required:

1. Appwrite Console: enable Email/Password auth.
2. Appwrite Console: configure Google OAuth provider.
3. Appwrite Console / Apple Developer: configure Apple Sign In provider and redirect URLs.
4. Appwrite Console: configure allowed redirect URLs for Expo dev, preview, and production schemes.
5. Appwrite Console: review table, bucket, and function permissions after Clerk removal.
6. Appwrite Console: restrict push notification function execution to server/API only.
7. Appwrite Console: add composite indexes/unique constraints where available:
   - reactions `(userId, leankId)`
   - participants `(leank, user)`
   - userChatMeta `(leankId, userId)`
   - blocks `(blockerId, blockedId)`
   - referrals `(referrerId, referredId)`
8. EAS / environment: remove Clerk publishable key if no longer used.
9. EAS / environment: add API base URL if API facade is external.
10. Google Cloud Console: configure OAuth client ids for Appwrite.
11. Apple Developer: configure services id / bundle id / return URLs for Appwrite.
12. Expo push credentials: verify production push credentials.
13. App Store config: add Privacy Policy and Terms links before release.

## Final Verification Checklist

No test files should be added in this pass. Use:

```bash
npx tsc --noEmit --pretty false
npm run lint
rg "Clerk|clerk|@clerk" app hooks lib components appwrite
rg "sendPushNotification\\(" app lib components
rg "db\\.(createRow|updateRow|deleteRow)" "app/(app)/(tabs)/messages" "app/(app)/(tabs)/index.tsx"
```

Manual flows:

- Email sign up and verification.
- Email login.
- Forgot/reset password.
- Google sign-in.
- Apple sign-in on iOS if enabled.
- Push token update after login.
- Open messages tab.
- Receive chat request in realtime.
- Accept request.
- Decline request.
- Open chat directly by route.
- Send message.
- Receive message from another user.
- Mark unread message as read.
- Leave chat.
- Remove participant.
- Close leank.
- Tap chat notification.

## Non-Goals For This Pass

- Do not create test files.
- Do not migrate to Postgres yet.
- Do not implement a full admin dashboard.
- Do not rewrite the entire UI.
- Do not preserve Clerk compatibility after the final auth cleanup commit.
