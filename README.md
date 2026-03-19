# LockedIn

A private, gated social network for high-signal builders: developers, designers, creators, and founders. Quality over noise.

## Features

- **Gated access** - application-based entry with automated scoring (GitHub, Codeforces, LeetCode signals)
- **Feed** - post text and code snippets, like and comment
- **Communities** - create and join topic-based groups with moderated join requests
- **Profiles** - follow builders, view post history
- **Notifications** - real-time alerts for likes, comments, follows, and application updates
- **Appeals** - rejected applicants can submit appeals for re-review
- **Admin dashboard** - review applications, manage scoring weights, handle appeals
- **Auth** - email/password registration, login, token refresh, GitHub OAuth
- **Middleware** - route protection with automatic redirects for authenticated/unauthenticated users

## Tech Stack

- **Framework** - Next.js 15 (App Router) + React 19 + TypeScript
- **Styling** - Tailwind CSS + Radix UI primitives + Framer Motion
- **Backend** - Next.js API Routes (`app/api/`)
- **Database & Auth** - Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Scoring** - custom engine with configurable weights per signal provider
- **Validation** - Zod (frontend forms), server-side validation in API routes
- **Icons** - Lucide React

## Project Structure

```
lockedin/
├── app/
│   ├── (app)/                # Authenticated routes (behind middleware)
│   │   ├── feed/             # Main feed
│   │   ├── communities/      # List, create, detail pages
│   │   ├── notifications/    # Notification center
│   │   ├── settings/         # User settings
│   │   ├── u/[username]/     # User profiles
│   │   ├── post/[id]/        # Post detail + comments
│   │   ├── apply/            # Application form
│   │   └── admin/            # Admin dashboard
│   ├── api/
│   │   ├── auth/             # register, login, refresh, github oauth
│   │   ├── applications/     # submit + review applications
│   │   ├── posts/            # CRUD + likes + comments
│   │   ├── communities/      # CRUD + join + members
│   │   ├── profiles/         # view + follow
│   │   ├── feed/             # personalized feed
│   │   ├── appeals/          # submit + view appeals
│   │   ├── admin/            # application review, scoring weights, appeals
│   │   └── health/           # health check
│   ├── login/                # Login page
│   ├── register/             # Registration page
│   ├── not-found.tsx         # Custom 404
│   └── global-error.tsx      # Custom error boundary
├── components/
│   ├── app/                  # App components (navbar, post card, sidebar)
│   ├── ui/                   # Reusable UI primitives
│   └── landing-page.tsx      # Landing page
├── lib/
│   ├── scoring/              # Scoring engine + signal providers
│   │   ├── engine.ts         # Score computation + platform OR-thresholds
│   │   ├── fetch-application-signals.ts  # Orchestrates provider fetches
│   │   └── providers/        # GitHub, Codeforces, LeetCode fetchers
│   ├── api.ts                # Client-side API helper
│   ├── api-utils.ts          # Server-side auth + response helpers
│   ├── auth-context.tsx      # Auth provider (React context)
│   ├── supabase.ts           # Client-side Supabase client
│   ├── supabase-server.ts    # Server-side Supabase client (service role)
│   ├── notifications.ts      # Notification helpers
│   └── storage.ts            # Supabase storage helpers
├── middleware.ts              # Route protection
├── supabase-setup.sql         # Database setup (RLS, storage, seed data)
├── Dockerfile                 # Multi-stage production build
└── docker-compose.yml         # Production container
```

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone <repo-url> && cd lockedin
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in your Supabase project URL, anon key, and service role key. See `.env.example` for all required variables.

### 3. Set up the database

Run `supabase-setup.sql` in the Supabase SQL Editor to enable RLS, create the storage bucket, and seed scoring weights.

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docker

```bash
cp .env.example .env
# fill in your keys
docker compose up -d --build
```

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `ADMIN_KEY` | Secret key for admin operations |
| `SCORING_PASS_THRESHOLD` | Minimum score to pass (default: 70) |
| `SCORING_AUTO_APPROVE_THRESHOLD` | Auto-approve above this score (default: 90) |
| `SCORING_AUTO_REJECT_THRESHOLD` | Auto-reject below this score (default: 30) |
| `GITHUB_TOKEN` | Optional fine-grained/classic PAT for accurate GitHub contribution totals via GraphQL (higher rate limits; falls back to public contributions page if unset or invalid) |
| `LEETCODE_CSRF_TOKEN` | Optional: value of LeetCode `csrftoken` cookie if automated stats fetch fails with CSRF/bot protection in your region |

**Application verification (automated):** users are auto-approved when **any one** of these is true: GitHub ≥ **500** contributions (last year, from the public contributions calendar), LeetCode ≥ **100** accepted problems, or Codeforces **rating** ≥ **900** (max of current vs peak). **Impersonation is blocked:** applicants must sign in with **GitHub**; the GitHub URL must match that login; LeetCode must link the same GitHub on the LeetCode profile; Codeforces requires pasting a personal **Organization** phrase from `GET /api/verification/codeforces-phrase` (HMAC-derived from user id + GitHub login). Optional env **`LOCKEDIN_VERIFICATION_SECRET`** overrides the HMAC key (otherwise the service role key is used). Portfolio links are optional context only and do not count toward auto-approval.

All secrets are loaded from `.env` and are **never** committed to version control.

## License

All rights reserved.
