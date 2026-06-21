# Release readiness

## Automated verification

Run before promotion:

```sh
npm run verify
cd leankly-api
npm run verify
npm run openapi
docker compose config
docker compose up --build
```

The API contract is exported to `leankly-api/openapi.json`. Health acceptance requires successful responses from `/health`, `/health/db`, and `/health/redis` after Compose startup.

## Feed performance

The target is p95 below 300 ms with 10,000 leanks and 500 concurrent feed clients. Use a non-seed Appwrite account JWT because the feed excludes the actor's own leanks.

```sh
cd leankly-api
npm run perf:seed
APPWRITE_JWT=... npm run perf:load
```

`PERF_LEANK_COUNT`, `API_BASE_URL`, `VUS`, and `DURATION` can override the defaults. Store the k6 summary with the release evidence; a failed threshold blocks promotion.

## Physical-device QA

Record pass/fail, build identifier, device/OS, tester, and timestamp for each item on both iOS and Android:

- Email OTP plus Apple/Google OAuth callback and session restoration.
- Onboarding/profile update and avatar upload.
- Leank cover upload, create, feed pagination, filtering, like, skip, and undo.
- Request visibility, accept/decline, participant leave/remove, and closed-leank state.
- Chat history pagination, send/reply, unread badges, and two-device Socket.io updates.
- APNs/FCM delivery while foregrounded, backgrounded, and terminated; notification opens the correct leank.
- Purchase, entitlement refresh, restore, expiration/cancellation, and Pro gates.
- Block/report behavior, account deletion, suspended-user rejection, and referral redemption.

Production provider credentials, device testing, staging soak, and store submission are owner-operated release gates and cannot be completed by repository automation.
