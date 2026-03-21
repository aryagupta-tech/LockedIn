/**
 * Validates that SUPABASE_SERVICE_ROLE_KEY is the real service_role JWT from Supabase.
 * If the anon key is pasted by mistake, PostgREST applies RLS and inserts into
 * `public.users` fail with "new row violates row-level security policy".
 */
export function getServiceRoleKeyMisconfigurationError(): string | null {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (raw === undefined || raw === null) return null;
  const key = raw.trim();
  if (!key) return null;

  const parts = key.split(".");
  if (parts.length !== 3) return null;

  try {
    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson) as { role?: string };
    const role = payload.role;

    if (role === "service_role") return null;

    if (role === "anon") {
      return "SUPABASE_SERVICE_ROLE_KEY is the anon (public) key. In Supabase → Project Settings → API, copy the service_role secret into Vercel — not the anon public key.";
    }

    return `SUPABASE_SERVICE_ROLE_KEY is not the service_role secret (JWT role is "${role ?? "missing"}"). Use the service_role key from Supabase → Settings → API.`;
  } catch {
    return null;
  }
}
