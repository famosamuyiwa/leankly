# Leankly API

NestJS domain backend for Leankly. Appwrite remains the identity, storage, and push-delivery provider; PostgreSQL is the domain source of truth.

## Local setup

1. Copy `.env.example` to `.env` and provide Appwrite credentials.
2. Run `docker compose up postgres redis`.
3. Run `npm install`, `npm run prisma:generate`, and `npm run start:dev`.
4. Swagger is available at `http://localhost:3000/docs`.

The API and worker use the same image. Production should run `node dist/main.js` and `node dist/worker.js` as separate processes.
