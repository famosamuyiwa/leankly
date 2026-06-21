This audit covers the mobile app only (app/, appwrite/, components/, hooks/, lib/, constants/, etc.) — not the website/ folder. Findings are grouped by severity. Counts are approximate; many items overlap (e.g. a missing auth check is both a bug and a security gap).

Executive summary
The app has a solid UI shell and feature breadth (auth, feed, chat, subscriptions, referrals), but it is not production-ready today. The main blockers are:

No server-side trust model — Appwrite is called without Clerk JWTs, and business rules (limits, blocks, Pro status) live only on the client.
Broken or incomplete auth paths — mail login, forgot/reset password, Apple sign-in, and Google SSO edge cases leave users stuck or unsupported.
Silent failures everywhere — errors are logged to console; users see spinners, empty screens, or wrong data with no recovery.
No automated tests — zero _.test._ / _.spec._ files in the repo.
Your own SRS (docs/SRS-leankly-backend.md) already plans replacing Appwrite + Clerk with an owned API. These findings reinforce that migration is required for production-grade security, not optional polish.

P0 — Ship blockers (security & data integrity)

1. Appwrite client is never authenticated with Clerk

config.ts
Lines 54-57
const client = new Client()
.setEndpoint(appwriteConfig.endpoint)
.setProject(appwriteConfig.projectId)
.setPlatform(appwriteConfig.platform);
There is no setJWT() / session bridge anywhere. Every DB, storage, and function call runs as an unauthenticated client. If Appwrite permissions are open (typical during prototyping), anyone can read/write rows, spoof blockerId/reporterId/ownerId, trigger push functions, and upload files.

2. Authorization exists only on the client
   Area Location Problem
   Block/report
   appwrite/actions/user.actions.ts
   Accepts caller-supplied IDs; no server verification
   Free-tier limits
   lib/featureGates.ts
   Stored in device SecureStore; reset on reinstall; trivially bypassed
   Pro gating
   lib/PremiumContext.tsx, lib/revenuecat.ts
   Client-side only
   Chat access
   messages/[chat].tsx
   Loads/sends for any chatId in URL with no membership check
3. Push notification function is client-triggerable

config.ts
Lines 63-75
async function sendPushNotification(body: PushNotificationRequest) {
try {
// ...
const result = await functions.createExecution({ ... });
} catch (err) {
console.error("Error executing function:", err);
}
}
Any client can invoke this with arbitrary tokens/titles. Used from the home feed when liking a leank (index.tsx ~186–196). Errors are swallowed; result is unused.

4. Mail login skips Appwrite user provisioning
   Sign-up OTP correctly routes to /expo-auth-session (which calls saveUserToDB). Mail login does not:

mail-auth.tsx
Lines 126-128
if (signInAttempt.status === "complete") {
await setSignInActive({ session: signInAttempt.createdSessionId });
router.replace("/");
Google SSO also never routes through expo-auth-session (hooks/useGoogleSignIn.tsx). Users who exist in Clerk but not Appwrite hit the bootstrap retry loop and can get stuck on a spinner forever:

\_layout.tsx
Lines 43-51
if (attempts < maxAttempts) {
attempts++;
setTimeout(checkUser, 500);
} else {
console.error(
"❌ Failed to find user in Appwrite after multiple attempts",
);
}
isCurrentUserReady is never set true after max retries → infinite loading at lines 96–101.

5. saveUserToDB only creates users; never updates push tokens

user.actions.ts
Lines 24-43
if (total === 0) {
await db.createRow({ ... pushToken: expoPushToken || "" });
}
router.replace("/");
Returning users never get token updates. Combined with sign-in paths that skip this flow, push notifications will fail for most users.

6. Race conditions in read-modify-write (no transactions)
   Operation File Risk
   Like/create reaction
   leank.actions.ts 12–46
   Duplicate reactions on double-tap
   Bonus interest consume
   user.actions.ts 271–289
   Double-spend
   Referral apply + stats
   user.actions.ts 187–252
   Referrer rewarded even if referral row insert fails
   Array updates (participantIds)
   leank.actions.ts 159–208
   Lost updates under concurrency
7. Quota consumed even when reaction write fails
   recordLeankAction catches and logs errors without rethrowing:

leank.actions.ts
Lines 47-49
} catch (err) {
console.error("Failed to record reaction:", err);
}
But index.tsx still increments the daily interest counter after await recordLeankAction(...) (~200). Users lose quota on failed writes.

P1 — High severity bugs
Authentication
Issue Location
Forgot password is a stub — onVerifyEmail body is entirely commented out
mail-auth.tsx 144–186
Reset password is a stub — empty try block; finally always navigates away
mail-auth.tsx 258–268
Reset button disabled logic is inverted — enabled when fields are empty
mail-auth.tsx 782–785
Apple Sign-In button does nothing
sign-in.tsx 44–45
Google SSO — MFA/additional steps only logged; no user feedback; redirectUrl missing from useCallback deps
useGoogleSignIn.tsx
Google sign-in not awaited
sign-in.tsx 42
OTP incomplete path leaves loading stuck — no setIsLoading(false) when status ≠ "complete"
mail-auth.tsx 200–207
Sign-up error assumes err.errors[0] exists — can throw on unexpected Clerk shape
mail-auth.tsx 247–252
expo-auth-session can run multiple times — no dedup; concurrent saveUserToDB on expoPushToken change
expo-auth-session.tsx 13–19
Sign-out doesn't reset RevenueCat — next user on shared device may inherit subscription state
profile/(settings)/index.tsx, PremiumContext.tsx
Chat & messaging
Issue Location
Stale chat data on navigation — messages not cleared when chatId changes; previous chat flashes
[chat].tsx 74–77, 217–237
MessagesContext.currentLeank never cleared on leave — settings/header can show wrong leank
MessagesContext.tsx, settings/[chat].tsx
Leave/close leank navigates even on API failure — router.dismissTo in finally
settings/[chat].tsx 157–219
Optimistic send + realtime refetch can duplicate/reorder messages
[chat].tsx 257–264, 341–346
Chat capped at 50 messages — no pagination
[chat].tsx ~199
Every realtime event triggers full refetch — performance cost
[chat].tsx 257–264
Fetch failures only console.log — user sees empty chat, no error UI
[chat].tsx 111–113, 212–214
Business logic
Issue Location
Interest limit inconsistent — gate uses FreeLimits.INTERESTS_PER_DAY (5) but dailyInterestLimit() accounts for referrals; profile UI shows wrong remaining count
index.tsx 131–134, featureGates.ts, profile/index.tsx
applyReferralCode returns { ok: true } even when referral row insert fails
user.actions.ts 238–252
Age validation mismatch — onboarding requires ≥18; profile save allows ≥16
onboarding.tsx 59, ProfileContext.tsx 134–138
Create leank with no guard on currentUser?.$id — can write rows with undefined owner
create.tsx 143–188
RevenueCat entitlement fallback too permissive — empty env var grants Pro for any active entitlement
revenuecat.ts 38–45
P2 — Medium severity (UX, reliability, incomplete features)
Missing loading / error states
Home feed: useLeanksFeed exposes error but home screen never displays it (index.tsx)
Messages list: no initial loading indicator (messages/index.tsx)
Profile save: errors only logged, no toast (ProfileContext.tsx 168–172)
Referrals: load errors swallowed (referrals.tsx)
Push notification provider stores error but never surfaces it (PushNotificationContext.tsx)
Accept/decline request errors only logged (messages/index.tsx)
Memory leaks / missing cleanup
setTimeout in keyboard listener not cleared on unmount ([chat].tsx 267–273)
Notification auto-dismiss timer not cleared on unmount (PushNotificationContext.tsx 70–83)
Onboarding navigation timer not cleared (onboarding.tsx 152–162)
Auth bootstrap retry setTimeout not cleared on unmount/sign-out (\_layout.tsx 45–46)
Realtime subscriptions recreated on large callback dep changes (messages/index.tsx, [chat].tsx)
Stale state / closure bugs
ProfileContext sync effect overwrites local edit state when currentUser refetches (ProfileContext.tsx 95–108)
AgeFilter / SingleSlider don't resync when parent props change (FilterContent.tsx, SingleSlider.tsx)
NavBar doesn't sync when params.nav changes externally (NavBar.tsx)
Deck index not reset when filters or blocked users change (index.tsx)
Null / crash risks
Image picker: no null check after cancel — result[0] can throw (onboarding.tsx, edit-profile.tsx)
setAge(Number(v)) → NaN on partial input
Settings avatar: source={avatar} (string) instead of { uri: avatar } (profile/(settings)/index.tsx)
blockUser uses currentUser! non-null assertion (GlobalContext.tsx)
Performance
useLeanksFeed.fetchReactedIds — unbounded while(true) pagination, no max page cap
Client-side location filter after fetch can yield empty pages while hasMore is true
Profile loadMore is a no-op — only first 10 leanks shown (profile/index.tsx)
Chat renderItem inline — all bubbles re-render on every keystroke
Mapbox geocoding has no debounce/abort — stale responses overwrite newer results (BottomSheet.tsx)
useBucket.ts: compressImage defined but never used before upload
Incomplete features
Feature Status
Forgot / reset password
Stubbed
Apple Sign-In
No-op button
Notifications settings
alertComingSoon()
Sex filter
Exported with empty handlers; commented out in data
Paywall reason param
Read but never displayed
Referrals share
"Link Copied" toast but clipboard line commented out
Cards.tsx
Hardcoded "Small group" regardless of peopleRequired
Account deletion
Partial cleanup; navigates to sign-in even if Clerk delete fails
Account deletion gaps (edit-profile.tsx)
Misses: leanks user joined (not owned), other users' chat meta, storage files, RevenueCat identity, etc.

P3 — Production polish & App Store readiness
Configuration & build
Issue Location
eas.json has no env blocks — all secrets must be manually set in EAS dashboard
eas.json
Required env vars throw at import — missing config crashes app immediately with no graceful degradation
appwrite/config.ts 4–26
Push function ID required at startup even on screens that never send pushes
appwrite/config.ts 20–22
.env not in .gitignore — only .env\*.local ignored; .env is untracked and at risk of commit
.gitignore
google-services.json gitignored — Android builds need it locally/EAS secret with no documented CI fallback
.gitignore, app.config.js
Clerk key not validated before ClerkProvider — undefined key fails at runtime
app/\_layout.tsx 84–86
iOS / security config

app.config.js
Lines 18-22
NSAppTransportSecurity: {
NSAllowsArbitraryLoads: true,
NSAllowsArbitraryLoadsForMedia: true,
NSAllowsArbitraryLoadsInWebContent: true,
Disables TLS requirements globally — App Store review risk and MITM exposure.

Mapbox token is embedded in client URLs (BottomSheet.tsx) — must be URL-restricted in Mapbox dashboard.

Paywall / subscriptions (App Store)
No Terms of Service or Privacy Policy links on paywall (paywall.tsx)
Purchase cancel returns false with no user feedback
Weekly price shown via pricePerWeekString even for non-weekly plans
Observability & code quality
No automated tests — zero test files in the repo
50+ console.log/warn/error calls in production paths, several logging PII (emails, user names, Clerk payloads)
Heavy any usage across auth, chat, hooks, and Appwrite actions — hides shape bugs
GlobalContext.alertComingSoon uses browser-style alert() instead of in-app toast
ESLint suppressions for immutability in MessageBubble ([chat].tsx)
Filters not persisted across app restarts (FiltersContext.tsx)
Foreground notifications auto-dismiss after 2s — user may never see them (PushNotificationContext.tsx)
Recommended fix order
P0: Server auth + Appwrite permissions
P0: Fix sign-in → saveUserToDB routing
P0: Auth bootstrap failure UX
P1: Push token lifecycle
P1: Chat lifecycle + settings error handling
P1: Complete auth flows
P2: Error/loading UX across screens
P2: Pagination + performance
P3: Tests, logging, App Store compliance
Wire Clerk JWT → Appwrite (or migrate to owned API per SRS) and lock down all table/bucket/function permissions.
Fix all sign-in paths to provision/sync Appwrite users and push tokens.
Handle bootstrap failure — redirect, retry UI, or auto-provision after max attempts.
Move limits, blocks, Pro checks server-side.
Fix chat lifecycle — reset state on chatId change; navigate only on successful leave/close.
Complete auth — forgot/reset password, Apple sign-in, Google MFA handling.
Add error/loading UX — chat, messages, profile save, home feed.
Add tests for auth flows, feature gates, and critical Appwrite actions.
App Store prep — ATS, paywall legal links, strip debug logs, document EAS env.
Summary counts
Severity Approx. count Examples
P0 — Block release
7 areas
Unauthenticated Appwrite, client-only authz, broken sign-in provisioning, quota/reaction races
P1 — Before beta
20+
Broken password flows, chat stale data, push token sync, interest limit bugs
P2 — Production polish
35+
Missing error states, memory leaks, pagination, incomplete features
P3 — Ship hygiene
15+
No tests, debug logging, config gaps, App Store compliance
If you want to tackle this systematically, the highest-leverage starting point is auth + Appwrite provisioning (items 1–3 above) — most other bugs (spinner, push, chat access) stem from that foundation. I can turn any section into a concrete fix plan or start implementing in priority order if you switch to Agent mode.
