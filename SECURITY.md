# Security guidelines (before pushing to GitHub)

## Never commit secrets

- **Do not commit** `.env`, `.env.local`, `.env.production`, or any file containing real API keys or passwords.
- This repo’s `.gitignore` ignores `.env` and `.env.*` (except `.env.example`).
- **Rotate** any secret that was ever committed or pasted in a ticket/chat before pushing.

## Environment variables

| Variable                         | Where it lives    | Notes |
|----------------------------------|-------------------|--------|
| `SUPABASE_SERVICE_ROLE_KEY`      | Server / Vercel only | **Secret.** Full database access. Never `NEXT_PUBLIC_*`. |
| `GITHUB_TOKEN`                   | Server / Vercel only | **Secret.** |
| `ADMIN_KEY`, `LOCKEDIN_VERIFICATION_SECRET` | Server only | **Secret.** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Client + server   | Public by design; still protect your Supabase RLS. |
| `LOCKEDIN_SEED_*_EMAILS`         | Server only       | Not public unless you wrongly prefix with `NEXT_PUBLIC_`. |

## Client bundle (`NEXT_PUBLIC_*`)

- Anything prefixed with `NEXT_PUBLIC_` is **embedded in the browser**.  
- **Never** use `NEXT_PUBLIC_` for passwords, service role keys, or admin tokens.

## Supabase

The **anon key is public** (it ships in `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Anyone can call your project’s PostgREST URL with it. **RLS is the main gate** that stops them from reading/writing everyone’s data. **Service role** (server-only) bypasses RLS — it must never reach the browser.

### What this repo does in code

- **Notification list / mark read** goes through **`/api/notifications/*`** with a **Bearer** session token; the server uses **service role** to query Postgres. The browser no longer uses `supabase.from("notifications")` for reads/writes (only **Realtime** still uses the client, which should be constrained by RLS on the server).
- Keep **`SUPABASE_SERVICE_ROLE_KEY`** only in server env (Vercel, etc.), never `NEXT_PUBLIC_*`.

### Step-by-step: what you should do in Supabase

1. **Open** Supabase Dashboard → your project → **SQL Editor**.

2. **Run your existing setup scripts** in a sensible order (if you haven’t already), for example:
   - `supabase-setup.sql` (or your main schema)
   - `scripts/supabase-profile-rls-and-rpc.sql` (or `scripts/COPY-PASTE-INTO-SUPABASE-SQL-EDITOR.sql`)
   - `supabase-notifications.sql`
   - `scripts/post-bookmarks-and-counters.sql`, `scripts/post-views-count.sql`, etc., as documented in `README.md`

3. **Run hardening** — `scripts/supabase-security-hardening.sql`  
   This turns **RLS on** for all `public` tables and **revokes INSERT/DELETE on `notifications`** for `anon` / `authenticated` so rows are only created by triggers / service role.

4. **Verify RLS** (run as queries in SQL Editor):
   ```sql
   SELECT c.relname, c.relrowsecurity AS rls_on
   FROM pg_class c
   JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind = 'r'
   ORDER BY c.relname;
   ```
   Every important table should show `rls_on = true`.

5. **Verify policies** — no table should be wide open. List policies:
   ```sql
   SELECT tablename, policyname, roles, cmd
   FROM pg_policies
   WHERE schemaname = 'public'
   ORDER BY tablename, policyname;
   ```

6. **Audit RPCs** (Database → Functions, or SQL): anything **SECURITY DEFINER** or granted to **`PUBLIC` / `anon`** is high risk. Prefer:
   - `REVOKE ALL ON FUNCTION ... FROM PUBLIC;`
   - `GRANT EXECUTE ... TO service_role;` (and only to `authenticated` when the function is intentionally user-callable, e.g. `lockedin_ensure_my_profile`).

7. **Realtime** — If notifications use **Realtime** in the app, ensure the table is in the publication and **RLS** applies (see comment in `supabase-security-hardening.sql`).

8. **Production secrets** — In **Vercel (or host) env**, confirm **service role** is the real **service_role** JWT from Supabase → Settings → API (this repo’s startup checks warn if you pasted the anon key by mistake).

9. **If a key ever leaked** — Rotate **anon** and **service_role** in Supabase, redeploy env, and audit logs.

### References in this repo

- `scripts/supabase-security-hardening.sql` — RLS-on-all + notification privilege tightening  
- `scripts/` — other RLS and RPC scripts  
- Prefer the **SQL scripts** in `scripts/` for one-off DB setup rather than embedding credentials in code.

## GitHub

- Enable **secret scanning** (default on public repos).
- If you use **GitHub Actions**, store tokens in **repository secrets**, not in workflow files.

## Reporting issues

- Do not open public issues with live keys or passwords. Rotate leaked credentials immediately.
