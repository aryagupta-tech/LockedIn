import type { SupabaseClient } from "@supabase/supabase-js";
import { validateUsername } from "@/lib/validation";

export const USERNAME_CHANGE_COOLDOWN_DAYS = 30;
export const USERNAME_RELEASE_HOLD_DAYS = 30;

const MS_PER_DAY = 86400000;
export const USERNAME_CHANGE_COOLDOWN_MS = USERNAME_CHANGE_COOLDOWN_DAYS * MS_PER_DAY;
export const USERNAME_RELEASE_HOLD_MS = USERNAME_RELEASE_HOLD_DAYS * MS_PER_DAY;

function holdsTableMissing(err: { code?: string; message?: string }) {
  const msg = err.message || "";
  return (
    err.code === "42P01" ||
    msg.includes("username_holds") && msg.includes("does not exist")
  );
}

/**
 * Whether `normalized` can be assigned: not held (recent release) and not taken by another user.
 */
export async function isUsernameAvailable(
  supabase: SupabaseClient,
  normalized: string,
  options?: { ignoreUserId?: string },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const holdRes = await supabase
    .from("username_holds")
    .select("heldUntil")
    .eq("username", normalized)
    .maybeSingle();

  if (holdRes.error && !holdsTableMissing(holdRes.error)) {
    return { ok: false, message: "Could not verify username availability." };
  }

  if (holdRes.data?.heldUntil) {
    const until = new Date(holdRes.data.heldUntil as string).getTime();
    if (until > Date.now()) {
      return {
        ok: false,
        message:
          "That username was recently used on LockedIn. It opens up again after the hold period.",
      };
    }
  }

  let q = supabase.from("users").select("id").eq("username", normalized).limit(1);
  if (options?.ignoreUserId) {
    q = q.neq("id", options.ignoreUserId);
  }
  const { data: taken, error: userErr } = await q.maybeSingle();
  if (userErr) {
    return { ok: false, message: "Could not verify username availability." };
  }
  if (taken) {
    return { ok: false, message: "That username is already taken." };
  }

  return { ok: true };
}

export async function insertUsernameHold(
  supabase: SupabaseClient,
  username: string,
  releasedByUserId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const normalized = username.trim().toLowerCase();
  const heldUntil = new Date(Date.now() + USERNAME_RELEASE_HOLD_MS).toISOString();
  const { error } = await supabase.from("username_holds").upsert(
    {
      username: normalized,
      heldUntil,
      releasedByUserId,
    },
    { onConflict: "username" },
  );
  if (error) {
    if (holdsTableMissing(error)) {
      return { ok: false, message: "Username holds are not configured (run scripts/username-change-and-holds.sql)." };
    }
    return { ok: false, message: error.message || "Could not reserve previous username." };
  }
  return { ok: true };
}

function sanitizeUsernameBase(raw: string, authId: string): string {
  const idCompact = authId.replace(/-/g, "");
  const s = raw
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  if (s.length >= 3) return s.slice(0, 30);
  return `user_${idCompact.slice(0, 8)}`;
}

/**
 * Pick a username for a new OAuth/public row: respects holds + collisions.
 */
export async function pickAvailableUsername(
  supabase: SupabaseClient,
  preferredRaw: string,
  authId: string,
): Promise<string> {
  const idCompact = authId.replace(/-/g, "");
  const base = sanitizeUsernameBase(preferredRaw || "user", authId);
  const candidates = [
    base,
    `${base}_${idCompact.slice(0, 6)}`,
    `${base}_${idCompact.slice(0, 8)}`,
    `user_${idCompact.slice(0, 8)}`,
    `user_${idCompact.slice(0, 12)}`,
  ];

  for (const c of candidates) {
    const v = validateUsername(c);
    if (!v.ok) continue;
    const avail = await isUsernameAvailable(supabase, v.username);
    if (avail.ok) return v.username;
  }

  const fallback = `u_${idCompact.slice(0, 12)}`;
  const v = validateUsername(fallback);
  if (v.ok) {
    const avail = await isUsernameAvailable(supabase, v.username);
    if (avail.ok) return v.username;
  }
  const last = `${fallback}_${Date.now().toString(36)}`.slice(0, 30);
  const v2 = validateUsername(last);
  if (v2.ok) return v2.username;
  return `u_${idCompact.slice(0, 6)}_${Date.now().toString(36)}`.slice(0, 30);
}

export function nextUsernameChangeAllowedAt(
  usernameChangedAt: string | null | undefined,
): Date | null {
  if (!usernameChangedAt) return null;
  return new Date(new Date(usernameChangedAt).getTime() + USERNAME_CHANGE_COOLDOWN_MS);
}

export function canChangeUsernameNow(usernameChangedAt: string | null | undefined): boolean {
  const next = nextUsernameChangeAllowedAt(usernameChangedAt);
  if (!next) return true;
  return Date.now() >= next.getTime();
}
