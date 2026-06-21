# Leankly

Expo mobile client backed by `leankly-api/`. Appwrite is retained only for Auth, Storage, and Messaging device targets. PostgreSQL is the only domain datastore; Socket.io is the only domain realtime channel.

## Development

1. Copy `.env.example` to a local environment file and fill in the Appwrite project, two storage buckets, Messaging providers, API URL, and RevenueCat keys.
2. Start PostgreSQL, Redis, the API, and worker using the backend instructions in `leankly-api/README.md`.
3. Install mobile dependencies with `npm install`.
4. Run `npm start` and use a development build for native push and RevenueCat testing.

Checks:

```sh
npm run test:api
npm run typecheck
npm run lint
```

## Data ownership

- Appwrite Auth: account/session identity and short-lived JWTs.
- Appwrite Storage: avatar and leank-cover files only.
- Appwrite Messaging: APNs/FCM targets and push delivery only.
- NestJS/PostgreSQL: profiles, leanks, reactions, participants, messages, moderation, referrals, usage, and entitlements.
- Redis/BullMQ: realtime fan-out and background jobs.

The client must never receive an Appwrite API key or write domain rows directly.
