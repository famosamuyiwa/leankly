# Leankly API

NestJS backend for Leankly. PostgreSQL is the domain source of truth. Appwrite remains the identity, file-storage, and push-delivery provider.

## Local startup

```sh
cp .env.example .env
npm install
npm run prisma:generate
docker compose up --build
```

The API is available at `http://localhost:3000`; Swagger is at `/docs`. Docker runs database migrations before starting the API and runs the BullMQ worker as a separate process.

For host development, start `postgres` and `redis` with Docker, then run `npm run start:dev` and `npm run start:worker:dev` in separate terminals.

## Manual provider setup

- Create an Appwrite API key with Storage read and Messaging write access. Keep it server-side as `APPWRITE_API_KEY`.
- Create separate Appwrite Storage buckets for avatars and leank covers. Enable file security and image MIME types; configure their IDs in both server and mobile environments.
- Configure APNs and FCM Messaging providers in Appwrite. Put provider IDs in the mobile environment so native device targets are registered against the correct provider.
- Register the RevenueCat webhook at `POST /v1/webhooks/revenuecat` with `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>`. RevenueCat App User IDs must be Appwrite Auth user IDs.
- Configure `OPENAI_API_KEY` and optionally `OPENAI_CLASSIFICATION_MODEL`; classification runs only in the worker.
- Set `ADMIN_APPWRITE_USER_IDS` to the Appwrite IDs that should bootstrap as administrators.
- Configure production CORS, TLS termination, `SENTRY_DSN`, PostgreSQL backups, and Redis persistence/availability outside this repository.

## Release commands

```sh
npm run lint
npm test
npm run build
npm run prisma:deploy
```

Provider credentials, webhook registration, production databases, and store provisioning remain manual because they require owner-controlled accounts and secrets.
