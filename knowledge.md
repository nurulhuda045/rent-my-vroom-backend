# RentMyVroom Backend — Project Knowledge

Production NestJS 11 REST API for a vehicle rental marketplace (Merchants, Renters, Admin). PostgreSQL via Prisma 7, JWT auth (+ refresh tokens), Cloudflare R2 uploads, WhatsApp/OTP onboarding, KYC, bookings with auto-expiry cron, messaging, reviews, and Swagger docs.

## Quickstart

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

- API: http://localhost:3000
- Swagger: http://localhost:3000/api
- Port configurable via `PORT` env var (Docker image exposes 4000).

### Required env vars
`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRATION`, `JWT_REFRESH_EXPIRATION`,
`R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT`, `R2_PUBLIC_URL`,
`EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
`PORT`, `FRONTEND_URL`. WhatsApp/OTP modules also require their own credentials — check `src/whatsapp` and `src/otp`.

## Common Commands

| Task | Command |
| --- | --- |
| Dev server (watch) | `npm run start:dev` |
| Prod build | `npm run build` |
| Start prod | `npm run start:prod` |
| Lint (auto-fix) | `npm run lint` |
| Format | `npm run format` |
| Unit tests | `npm run test` |
| E2E tests | `npm run test:e2e` |
| Coverage | `npm run test:cov` |
| Prisma client | `npm run prisma:generate` |
| Migrate (dev) | `npm run prisma:migrate` |
| Prisma Studio | `npm run prisma:studio` |

Docker: `docker compose up --build` (runs `prisma migrate deploy` then `node dist/main.js`, exposes port 4000).

## Architecture

NestJS modular structure. Each domain is a self-contained module (controller + service + DTOs) wired in `src/app.module.ts`.

- `src/auth/` — JWT auth, Passport strategy, guards (`JwtAuthGuard`), refresh tokens.
- `src/users/` — profile, admin approval workflows.
- `src/vehicles/` — CRUD, availability, location/date search.
- `src/bookings/` — booking lifecycle (create, accept, reject, complete, cancel), price calc, license/KYC gating.
- `src/booking-expiry/` — cron job that auto-cancels bookings past merchant response deadline (`@nestjs/schedule`).
- `src/messages/` — booking-scoped chat threads.
- `src/reviews/` — post-rental ratings.
- `src/uploads/` — Cloudflare R2 presigned URLs (`@aws-sdk/*`).
- `src/notifications/` — Nodemailer SMTP emails.
- `src/whatsapp/`, `src/otp/` — WhatsApp OTP auth onboarding flow (see `.agent/artifacts/whatsapp-*` docs).
- `src/kyc/` — KYC submission/approval incl. holder photo + resubmission on rejection.
- `src/system-config/` — runtime-configurable settings (stored in DB).
- `src/common/` — shared: `PrismaExceptionFilter`, `AllExceptionsFilter`, `RolesGuard`, `@Roles`, `@GetUser`, helpers, geo utils, prisma selects, messages/config constants. Re-exported via `src/common/index.ts`.
- `src/prisma/` — `PrismaService` wrapping the generated client.
- `src/generated/prisma/` — **generated** Prisma client output (custom output path). Do NOT edit by hand; regenerate via `npm run prisma:generate`.
- `prisma/schema.prisma` + `prisma/migrations/` — DB schema & migration history.
- `prisma.config.ts` — Prisma config (uses `@prisma/adapter-pg`).

### Request lifecycle defaults (set in `src/main.ts`)
- Global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, `transform`.
- Global filters (order matters): `PrismaExceptionFilter` → `AllExceptionsFilter`.
- CORS restricted to `FRONTEND_URL` with credentials.
- `ThrottlerModule` configured app-wide: 10 req/min default (see `app.module.ts`).
- Swagger mounted at `/api` with Bearer auth.

## Conventions

- **Language/Tooling:** TypeScript (ES2021, CommonJS). `strictNullChecks` and `noImplicitAny` are **off** — be defensive about `null`/`undefined` manually.
- **Formatting:** Prettier — single quotes, trailing commas, 100-char width, 2-space tabs, semicolons.
- **Linting:** Flat ESLint config (`eslint.config.mjs`); `@typescript-eslint/no-explicit-any` is off, but avoid `any` unless truly needed.
- **DTOs:** Use `class-validator` + `class-transformer`. Keep DTOs in `<module>/dto/*.dto.ts`. Document with `@nestjs/swagger` decorators.
- **Auth:** Protect routes with `JwtAuthGuard` + `@Roles(...)` + `RolesGuard`. Use `@GetUser()` to access the authenticated user.
- **Prisma selects:** Reuse reusable `select` objects from `src/common/constants/prisma-selects.ts` to keep responses consistent.
- **Errors:** Throw NestJS HTTP exceptions; let global filters format responses. Prisma errors are mapped by `PrismaExceptionFilter`.
- **Tests:** Co-located `*.spec.ts` alongside sources (Jest `rootDir: src`, regex `.*\.spec\.ts$`).
- **Module wiring:** When adding a module, register it in `src/app.module.ts`.
- **Constants/messages:** Put user-facing strings and config keys in `src/common/constants/`.

## Gotchas

- **Prisma client output is custom** (`src/generated/prisma`) — import from there if needed, but prefer injecting `PrismaService`. Never commit hand edits to generated files.
- **Port mismatch:** App defaults to `PORT=3000`, but Dockerfile exposes `4000` and docker-compose maps `4000:4000`. Set `PORT=4000` when running in Docker or adjust the compose mapping.
- **README Dockerfile snippet is outdated** — actual `Dockerfile` uses multi-stage build (`node:18-alpine` build → `node:22-alpine` runtime) and runs `prisma migrate deploy` on start. Trust the real `Dockerfile`.
- **README tech stack lists NestJS 10 / Prisma 5** — real versions are **NestJS 11** and **Prisma 7** (`@prisma/adapter-pg`). See `.agent/artifacts/PRISMA-7-MIGRATION.md`.
- **Relaxed TS strictness:** null checks and implicit any are disabled project-wide. Guard inputs manually and prefer explicit types on public APIs.
- **Throttling is global:** heavy endpoints may need `@SkipThrottle()` or a per-route `@Throttle()` override.
- **Bookings cron:** `BookingExpiryModule` depends on `ScheduleModule.forRoot()` (already registered). Don't remove it from `AppModule`.
- **WhatsApp/OTP/KYC flows:** see design notes under `.agent/artifacts/` (`whatsapp-otp-auth-plan.md`, `whatsapp-implementation-guide.md`, `IMPLEMENTATION_COMPLETE.md`) before modifying auth/onboarding.
- **Migrations are dated 2026+** — that's intentional existing history; keep new migrations chronological with `prisma migrate dev --name <desc>`.
- **Windows dev:** project path uses backslashes; default shell here is bash, so standard unix commands work, but PowerShell users should adjust.

## Key Files

- `src/main.ts` — bootstrap, global pipes/filters, Swagger, CORS.
- `src/app.module.ts` — module registry, throttler, schedule.
- `prisma/schema.prisma` — DB schema source of truth.
- `src/common/index.ts` — shared exports (filters, guards, decorators, helpers).
- `postman_collection.json` — importable API collection for manual testing.
