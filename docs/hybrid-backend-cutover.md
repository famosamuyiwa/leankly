# Hybrid backend cutover

The mobile cutover is complete. Appwrite remains in the application only for Auth, Storage, and native Messaging target registration. All domain reads, writes, pagination, limits, moderation, referrals, entitlements, and realtime events go through `leankly-api`.

## Ownership boundary

| Concern                          | Owner                     |
| -------------------------------- | ------------------------- |
| Accounts, sessions, JWT issuance | Appwrite Auth             |
| Avatar and leank-cover files     | Appwrite Storage          |
| APNs/FCM targets and delivery    | Appwrite Messaging        |
| Domain and moderation data       | PostgreSQL through NestJS |
| Jobs and event fan-out           | Redis/BullMQ              |
| Chat and feed events             | Socket.io                 |

The deleted Appwrite TablesDB actions and Functions are not deployment dependencies. No TablesDB migration runs: production starts with an empty PostgreSQL domain database while existing Appwrite Auth accounts bootstrap profiles on first authenticated API use.

## Manual production checklist

- Provision PostgreSQL and Redis, apply Prisma migrations, and configure backups.
- Deploy the API and worker from `leankly-api/` behind TLS.
- Create restricted Appwrite server credentials for Storage validation and Messaging delivery.
- Configure the avatar/leank-cover buckets plus APNs and FCM providers.
- Register the RevenueCat webhook and keep its bearer secret server-side.
- Set OpenAI classification credentials only on the worker environment.
- Set the mobile API and Socket.io origins; never ship an Appwrite API key.
- Verify CORS, rate limits, Sentry reporting, health checks, and admin IDs.

Provider credentials, webhooks, production infrastructure, and store configuration require owner-controlled accounts and remain manual.
