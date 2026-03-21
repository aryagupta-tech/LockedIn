-- Run once in Supabase → SQL Editor
-- GitHub users can change username (app-enforced cooldown + old-handle hold).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS "usernameChangedAt" timestamptz;

-- Released usernames cannot be claimed until heldUntil (30 days after change).
CREATE TABLE IF NOT EXISTS public.username_holds (
  username text PRIMARY KEY,
  "heldUntil" timestamptz NOT NULL,
  "releasedByUserId" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE INDEX IF NOT EXISTS username_holds_held_until ON public.username_holds ("heldUntil");

ALTER TABLE public.username_holds ENABLE ROW LEVEL SECURITY;
