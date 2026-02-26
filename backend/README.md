# LockedIn Backend

Production-grade backend for **LockedIn** — a verification-gated social network for developers. Built with Fastify, PostgreSQL, Redis, and BullMQ.

## Why Fastify (not NestJS)

Fastify was chosen over NestJS for these reasons:

- **Performance**: ~2x faster request throughput, lower memory.
- **Explicit composition**: Fastify's plugin system makes dependency flow visible. NestJS's decorators + DI container hide a lot of magic.
- **Native schema validation**: JSON Schema validation is built in and doubles as OpenAPI docs — one definition, zero drift.
- **Lighter footprint**: Smaller container images and faster cold starts.
- **No lock-in**: Plain functions and classes. No framework-specific decorators to unpick if you need to migrate.

## Architecture

```
src/
├── config/          # Zod-validated env config (12-factor)
├── lib/             # Shared infrastructure (prisma, redis, crypto, s3, queue)
├── plugins/         # Fastify plugins (auth, rate-limit, metrics, swagger)
├── modules/         # Feature modules, each with schemas + service + routes
│   ├── auth/        # Registration, login, JWT, GitHub OAuth
│   ├── application/ # Apply flow — submit proof, enqueue verification
│   ├── scoring/     # Pure scoring engine + external data providers
│   ├── admin/       # Admin endpoints for reviews, weights, appeals
│   ├── profile/     # User profiles, follow/unfollow
│   ├── post/        # Posts, likes, comments
│   ├── community/   # Community CRUD, gated join requests
│   ├── feed/        # Personalized feed (followed users + communities)
│   └── appeal/      # Appeal rejected applications
├── workers/         # BullMQ background jobs (separate process)
├── types/           # Fastify type augmentations
└── server.ts        # Bootstrap
```

## Quick start (local development)

### 1. Start dependencies

```bash
docker compose up postgres redis minio -d
```

### 2. Install and configure

```bash
npm install
cp .env.example .env    # edit JWT_SECRET, ENCRYPTION_KEY, GitHub OAuth creds
```

### 3. Set up the database

```bash
npx prisma migrate dev  # creates tables
npm run db:seed          # seeds scoring weights + admin user
```

### 4. Run the server

```bash
npm run dev              # http://localhost:4000
```

### 5. Run background workers (separate terminal)

```bash
npm run workers:dev
```

### 6. Open Swagger UI

Visit [http://localhost:4000/docs](http://localhost:4000/docs) for the full interactive API docs.

## Full stack (Docker)

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec api npx prisma migrate deploy
docker compose exec api npx tsx prisma/seed.ts
```

## Default credentials

After seeding:
- **Admin**: `admin@lockedin.local` / `admin123456`

## API overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | — | Register with email/password |
| POST | `/auth/login` | — | Log in |
| POST | `/auth/refresh` | — | Refresh access token |
| GET | `/auth/github` | — | Get GitHub OAuth URL |
| POST | `/auth/github/callback` | — | Exchange GitHub code for tokens |
| POST | `/applications` | JWT | Submit application with proof links |
| GET | `/applications/me` | JWT | List my applications |
| GET | `/feed` | JWT+Approved | Personalized feed |
| POST | `/posts` | JWT+Approved | Create a post |
| POST | `/posts/:id/like` | JWT+Approved | Like a post |
| POST | `/posts/:id/comments` | JWT+Approved | Comment on a post |
| GET | `/profiles/:username` | Optional | View a profile |
| POST | `/profiles/:id/follow` | JWT+Approved | Follow a user |
| POST | `/communities` | JWT+Approved | Create a community |
| POST | `/communities/:id/join` | JWT+Approved | Request to join |
| POST | `/appeals` | JWT | Appeal a rejected application |
| GET | `/admin/applications` | Admin | List all applications |
| PATCH | `/admin/applications/:id/review` | Admin | Approve/reject |
| GET | `/admin/scoring-weights` | Admin | View scoring weights |
| PUT | `/admin/scoring-weights/:key` | Admin | Edit a weight |
| POST | `/admin/scoring/backfill` | Admin | Re-score applications |
| GET | `/health` | — | Health check |
| GET | `/metrics` | — | Prometheus metrics |
| GET | `/docs` | — | Swagger UI |

## Scoring engine

The scoring engine is a pure, deterministic function with no side effects (easy to test).

**How it works:**

1. Each signal provider fetches a raw value from an external API:
   - **GitHub**: contribution count (GraphQL with user token, or REST fallback)
   - **Codeforces**: peak rating via public API
   - **LeetCode**: total problems solved via GraphQL

2. Each raw value is **linearly normalized** to 0–100:
   ```
   if value <= minimum:  0
   if value >= threshold: 100
   otherwise:            (value - minimum) / (threshold - minimum) × 100
   ```

3. **Weighted average** produces the final score:
   ```
   score = Σ(weight_i × normalized_i) / Σ(weight_i)
   ```

4. Auto-decision thresholds determine the outcome:
   - `>= SCORING_AUTO_APPROVE_THRESHOLD` → auto-approved
   - `< SCORING_AUTO_REJECT_THRESHOLD` → auto-rejected
   - Between → `UNDER_REVIEW` (needs human eyes)

Default weights (admin-editable via API):

| Signal | Weight | Minimum | Threshold (100%) |
|--------|--------|---------|-------------------|
| GitHub contributions | 0.35 | 100 | 1,000 |
| Codeforces rating | 0.25 | 1,200 | 2,100 |
| LeetCode problems | 0.25 | 50 | 500 |
| Portfolio quality | 0.15 | 20 | 100 |

Partial signals are supported — if a user only has GitHub, only that weight contributes.

## Background workers

Workers run as a **separate process** (`npm run workers`):

- **Verification worker**: Processes new applications. Fetches external data, computes score, updates application status. Retries 3× with exponential backoff.
- **Refresh-data worker**: Periodically refreshes external signal data for users. Per-provider exponential backoff state is stored in Redis (initial 30s, capped at 1 hour).

## Testing

```bash
# Unit tests (no DB/Redis needed)
npx vitest run test/scoring.test.ts

# Integration tests (needs postgres + redis running)
npm test
```

## Security considerations

### Implemented

- **JWT with refresh token rotation**: Access tokens are short-lived (15 min). Refresh tokens are SHA-256 hashed before storage. Reuse detection revokes all user sessions.
- **Rate limiting**: 100 req/min per user (or IP for unauthenticated), backed by Redis for distributed counting.
- **Input validation**: Every route uses JSON Schema validation via Typebox. Malformed requests are rejected before hitting any business logic.
- **SQL injection mitigation**: Prisma ORM uses parameterized queries exclusively. No raw SQL.
- **OAuth token encryption**: GitHub tokens are AES-256-GCM encrypted at rest. The encryption key is loaded from env, never committed.
- **Password hashing**: bcrypt with 12 rounds.
- **Security headers**: `@fastify/helmet` sets HSTS, X-Frame-Options, X-Content-Type-Options, etc.
- **CORS**: Configurable origin whitelist.
- **Secrets in env**: All secrets (JWT key, encryption key, OAuth creds, DB password) are environment variables. `.env` is gitignored.
- **Log redaction**: Authorization headers, cookies, and password fields are auto-redacted from structured logs.

### GDPR / CCPA checklist

If you ever deploy this publicly, you need to address:

- [ ] **Right to access**: Add `GET /me/data-export` that returns all personal data as JSON.
- [ ] **Right to deletion**: Add `DELETE /me` that cascades through all tables (Prisma's `onDelete: Cascade` handles FK relationships).
- [ ] **Consent logging**: Record when users agreed to ToS and what data they consented to share.
- [ ] **Data retention policy**: Auto-delete inactive accounts after N months. Purge refresh tokens on expiry (add a cron job).
- [ ] **Cookie disclosure**: If using cookies for refresh tokens, add a cookie banner.
- [ ] **Third-party data**: GitHub/Codeforces/LeetCode data is fetched and stored. Disclose this in your privacy policy.

### Fraud detection heuristics

- **Duplicate email detection**: Checked at registration. GitHub OAuth links by `githubId` to prevent multi-account abuse.
- **Refresh token reuse detection**: If a refresh token is used twice, all sessions for that user are revoked (indicates token theft).
- **Rate limiting**: Prevents brute-force login attempts and application spam.
- **Application deduplication**: Users cannot submit a new application while one is pending/processing.
- **Appeal limits**: Only one active appeal per rejected application.
- **Scoring transparency**: Full score breakdown is stored per application, making manual audit straightforward.

## Observability

- **Structured logging**: Pino (built into Fastify). JSON in production, pretty-printed in development. Log level configurable via `LOG_LEVEL`.
- **Sentry integration**: Set `SENTRY_DSN` to enable. Unhandled errors are automatically captured with request context.
- **Prometheus metrics**: `GET /metrics` exposes `http_request_duration_seconds`, `http_requests_total`, and default Node.js metrics (memory, CPU, event loop lag). Scrape with Prometheus, visualize with Grafana.
- **Health check**: `GET /health` returns `{ status: "ok" }` for load balancer probes.

## Environment variables

See `.env.example` for the complete list. All config is validated at startup with Zod — the server refuses to start if any required variable is missing or malformed.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API with hot reload |
| `npm run workers:dev` | Start workers with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server |
| `npm run workers` | Run compiled workers |
| `npm run db:migrate` | Create/apply Prisma migrations |
| `npm run db:seed` | Seed scoring weights + admin user |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm test` | Run all tests |
| `npm run typecheck` | Type-check without emitting |
