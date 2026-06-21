# Release verification — 2026-06-21

## Passed locally

- Mobile API retry tests: 3 passed.
- App-only TypeScript check: passed.
- Expo lint: passed with zero warnings.
- Backend lint: passed with zero warnings.
- Backend service tests: 24 passed across 13 suites.
- Supertest HTTP contract tests: 2 passed.
- NestJS production build: passed.
- Prisma schema validation: passed.
- OpenAPI 3.1 export: generated with 34 paths.
- Compose YAML: parsed with `postgres`, `redis`, `api`, and `worker` services.

## External release gates

- Docker/Compose is not installed in the verification environment, so image build, migrations, and container health checks require a Docker-capable host.
- PostgreSQL, k6, and a valid Appwrite JWT are not available in the verification environment. Run the committed 10,000-row seed and 500-VU feed test before promotion; p95 must remain below 300 ms.
- Complete the iOS and Android physical-device matrix in `docs/release-readiness.md` with production-equivalent provider configuration.
- Provider credentials, RevenueCat webhook registration, staging soak, monitoring alerts, and store submission remain owner-operated gates.
