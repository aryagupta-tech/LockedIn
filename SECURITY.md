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

## Dev auto-login (`/dev-login`)

- Uses **`DEV_LOGIN_EMAIL` / `DEV_LOGIN_PASSWORD`** in `.env` **only on your machine**.
- **`/api/dev-login` returns 404 in production** (`NODE_ENV=production`).
- **`/dev-login` redirects to `/login` in production** via middleware.

## Supabase

- Turn on **Row Level Security** for sensitive tables; use policies that match your threat model.
- Prefer the **SQL scripts** in `scripts/` for one-off DB setup rather than embedding credentials in code.

## GitHub

- Enable **secret scanning** (default on public repos).
- If you use **GitHub Actions**, store tokens in **repository secrets**, not in workflow files.

## Reporting issues

- Do not open public issues with live keys or passwords. Rotate leaked credentials immediately.
