# LockedIn

A private, invite-style social network for high-signal builders — developers, designers, creators, and founders. Think of it as a gated community where quality matters more than follower count.

This is a personal side project. The landing page collects waitlist applications and includes an interactive "gate simulator" that demos the vetting flow.

## What it does

- **Landing page** with animated hero, feature sections, and an apply form
- **Waitlist API** — applications are saved to a local JSON file (`data/waitlist.json`)
- **Admin endpoint** — view all applications at `/api/admin/waitlist?key=YOUR_KEY`
- **Gate simulator** — interactive modal that mocks the GitHub connect → resume upload → AI scoring flow

## Stack

- Next.js 15 (App Router, standalone output)
- TypeScript
- Tailwind CSS
- Radix UI primitives (shadcn-style)
- Framer Motion
- React Hook Form + Zod
- Lucide React icons

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docker

```bash
cp .env.example .env   # set your ADMIN_KEY
docker compose up -d --build
```

## Project structure

```
app/
  layout.tsx            # root layout, fonts, metadata
  page.tsx              # home page
  globals.css           # global styles, aurora gradients, animations
  api/apply/route.ts    # POST waitlist application, GET count
  api/admin/waitlist/   # GET all entries (key-protected)
components/
  landing-page.tsx      # main landing page (navbar, hero, sections, form)
  ui/                   # button, card, badge, input, dialog, label, progress, select
lib/
  waitlist.ts           # file-based JSON waitlist storage
  utils.ts              # cn() helper
```
