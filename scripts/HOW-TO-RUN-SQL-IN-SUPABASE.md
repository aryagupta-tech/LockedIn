# How to run the SQL scripts (fix “syntax error at or near scripts”)

## What went wrong

Supabase **SQL Editor** only accepts **SQL statements** (like `ALTER TABLE ...`).

If you type or paste **`scripts/fix-users-profile.sql`** or **`scripts/supabase-profile-rls-and-rpc.sql`**, Postgres tries to run the word `scripts` as SQL → **syntax error**.

Those strings are **file paths on your computer**, not SQL code.

## What to do instead

1. In **Cursor** (or VS Code), open the file from the repo folder:
   - **`scripts/COPY-PASTE-INTO-SUPABASE-SQL-EDITOR.sql`** ← **easiest: one file, run once**
   - Or open `fix-users-profile.sql` and `supabase-profile-rls-and-rpc.sql` separately (run in that order if not using the combined file).
2. **Select all** in the file: **Ctrl+A** (Windows/Linux) or **Cmd+A** (Mac).
3. **Copy**.
4. In the browser: **Supabase Dashboard** → your project → **SQL Editor** → **New query**.
5. **Paste** into the big text area.
6. Click **Run**.

You should see many lines starting with `--` (comments) and real SQL like `ALTER TABLE` and `CREATE OR REPLACE FUNCTION` — **not** a single line that looks like `scripts/...`.

## Where in Supabase

**https://supabase.com/dashboard** → select your project → left sidebar **SQL Editor** → **New query**.
