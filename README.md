# LockedIn

A private, invite-style social network for high-signal builders — developers, designers, creators, and founders. A gated community where quality matters more than follower count.

## Features

- **Gated access** — application-based onboarding with automated scoring
- **Feed** — post text and code snippets, like, comment, and bookmark
- **Communities** — create and join topic-based groups
- **Profiles** — follow other builders, view post history
- **Notifications** — real-time alerts for likes, comments, and follows (powered by Supabase Realtime)
- **Admin dashboard** — review and approve/reject applications
- **Dark-mode UI** — card-based, text-focused design with gold accent

## Tech Stack

### Frontend

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Radix UI primitives
- Framer Motion
- Supabase JS (auth sessions, realtime notifications)
- Lucide icons

### Backend

- Fastify 4
- Prisma ORM (PostgreSQL)
- Supabase (Auth, Database, Realtime)
- Redis + BullMQ (task queues)
- TypeBox (schema validation)

## Project Structure

```
├── app/                    # Next.js pages (App Router)
│   ├── (app)/              # Authenticated routes
│   │   ├── feed/           # Main feed
│   │   ├── communities/    # Communities list + detail
│   │   ├── notifications/  # Notification center
│   │   ├── settings/       # User settings
│   │   ├── u/[username]/   # User profiles
│   │   ├── post/[id]/      # Post detail + comments
│   │   ├── apply/          # Application form
│   │   └── admin/          # Admin dashboard
│   ├── login/              # Login page
│   └── register/           # Registration page
├── components/
│   ├── app/                # App-specific components
│   └── ui/                 # Reusable UI primitives
├── lib/                    # Shared utilities, API client, hooks
├── backend/
│   ├── src/                # Fastify server source
│   │   ├── modules/        # Feature modules (auth, posts, etc.)
│   │   ├── lib/            # Supabase admin client, helpers
│   │   └── config/         # Environment config
│   └── prisma/             # Schema + migrations
└── supabase-setup.sql      # Initial Supabase database setup
```

## Getting Started

### Prerequisites

- Node.js 20+
- Redis (for backend task queues)
- A [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone <repo-url> && cd lockedin
npm install
cd backend && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Fill in your Supabase project URL, anon key, service role key, and database connection string in both `.env` files. See the `.env.example` files for the full list of variables.

### 3. Set up the database

Run `supabase-setup.sql` in the Supabase SQL Editor to create tables and enable RLS.

Then run `supabase-notifications.sql` to set up the notifications system (table, triggers, realtime).

Generate the Prisma client:

```bash
cd backend && npx prisma generate && cd ..
```

### 4. Start the servers

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docker

```bash
cp .env.example .env
cp backend/.env.example backend/.env
docker compose up -d --build
```

## Environment Variables

All sensitive keys (Supabase URLs, API keys, database credentials) are loaded from `.env` files and are **not** committed to version control. See `.env.example` and `backend/.env.example` for the required variables.

## License

This is a personal side project. All rights reserved.
