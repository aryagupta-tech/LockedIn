import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth, errorResponse, now } from "@/lib/api-utils";
import { ensurePublicUserRow } from "@/lib/ensure-public-user";
import { getBuilderProgressForUser } from "@/lib/gamification-queries";
import {
  extractGitHubLoginFromSupabaseUser,
  sessionHasGithubIdentity,
} from "@/lib/github-auth-metadata";
import { resolveGithubAvatarForUser } from "@/lib/github-avatar-resolve";
import { validateUsername } from "@/lib/validation";
import {
  canChangeUsernameNow,
  insertUsernameHold,
  isUsernameAvailable,
  nextUsernameChangeAllowedAt,
} from "@/lib/username-holds";

const USER_SELECT =
  "id, email, username, displayName, avatarUrl, role, status, createdAt, usernameChangedAt";

const PATCH_SELECT =
  "id, email, username, displayName, avatarUrl, bio, githubUsername, codeforcesHandle, leetcodeHandle, role, status, createdAt, usernameChangedAt";

function profileExtras(
  authUser: import("@supabase/supabase-js").User,
  usernameChangedAt: string | null | undefined,
) {
  const gh = sessionHasGithubIdentity(authUser);
  const canChange = canChangeUsernameNow(usernameChangedAt);
  const nextAt = !canChange
    ? nextUsernameChangeAllowedAt(usernameChangedAt)?.toISOString() ?? null
    : null;
  return {
    githubSignIn: gh,
    canChangeUsername: canChange,
    nextUsernameChangeAt: nextAt,
  };
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const supabase = createServiceClient();
    await ensurePublicUserRow(supabase, auth.user);

    const { data: user } = await supabase
      .from("users")
      .select(USER_SELECT)
      .eq("id", auth.user.id)
      .single();

    if (!user) return errorResponse("User not found", "NOT_FOUND", 404);

    let profile = user;
    if (
      (!profile.avatarUrl || !String(profile.avatarUrl).trim()) &&
      sessionHasGithubIdentity(auth.user)
    ) {
      const url = await resolveGithubAvatarForUser(
        auth.user,
        extractGitHubLoginFromSupabaseUser(auth.user),
      );
      if (url) {
        await supabase
          .from("users")
          .update({ avatarUrl: url, updatedAt: now() })
          .eq("id", auth.user.id);
        profile = { ...profile, avatarUrl: url };
      }
    }

    const builder = await getBuilderProgressForUser(
      supabase,
      profile.id,
      { status: profile.status, createdAt: profile.createdAt },
    );

    return NextResponse.json({
      ...profile,
      builder,
      ...profileExtras(auth.user, profile.usernameChangedAt as string | null | undefined),
    });
  } catch (e) {
    console.error("Get profile error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const supabase = createServiceClient();

    const allowed = ["displayName", "bio", "avatarUrl", "codeforcesHandle", "leetcodeHandle"];
    const update: Record<string, unknown> = { updatedAt: now() };
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    const hasOtherFields = Object.keys(update).some((k) => k !== "updatedAt");
    if (hasOtherFields) {
      const { error: patchErr } = await supabase
        .from("users")
        .update(update)
        .eq("id", auth.user.id);
      if (patchErr) {
        console.error("Profile patch failed:", patchErr);
        return errorResponse("Could not update profile.", "INTERNAL_ERROR", 500);
      }
    }

    if (body.username !== undefined) {
      const v = validateUsername(String(body.username));
      if (!v.ok) {
        return errorResponse(v.error, "VALIDATION_ERROR", 400);
      }
      const newUsername = v.username;

      const { data: row, error: rowErr } = await supabase
        .from("users")
        .select("id, username, usernameChangedAt")
        .eq("id", auth.user.id)
        .single();

      if (rowErr || !row) {
        return errorResponse("User not found", "NOT_FOUND", 404);
      }

      const oldUsername = String(row.username || "").trim().toLowerCase();

      if (newUsername !== oldUsername) {
        if (!canChangeUsernameNow(row.usernameChangedAt as string | null | undefined)) {
          const next = nextUsernameChangeAllowedAt(
            row.usernameChangedAt as string | null | undefined,
          );
          return errorResponse(
            `You can change your username again on or after ${next?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`,
            "USERNAME_COOLDOWN",
            403,
          );
        }

        const avail = await isUsernameAvailable(supabase, newUsername, {
          ignoreUserId: auth.user.id,
        });
        if (!avail.ok) {
          return errorResponse(avail.message, "CONFLICT", 409);
        }

        const hold = await insertUsernameHold(supabase, oldUsername, auth.user.id);
        if (!hold.ok) {
          return errorResponse(hold.message, "INTERNAL_ERROR", 500);
        }

        const ts = now();
        const { error: upErr } = await supabase
          .from("users")
          .update({
            username: newUsername,
            usernameChangedAt: ts,
            updatedAt: ts,
          })
          .eq("id", auth.user.id);

        if (upErr) {
          console.error("Username update failed:", upErr);
          return errorResponse("Could not update username.", "INTERNAL_ERROR", 500);
        }

        const meta = { ...(auth.user.user_metadata || {}), username: newUsername };
        const { error: authUpErr } = await supabase.auth.admin.updateUserById(auth.user.id, {
          user_metadata: meta,
        });
        if (authUpErr) {
          console.error("Auth metadata username sync failed:", authUpErr);
        }
      }
    }

    const { data: user, error: fetchErr } = await supabase
      .from("users")
      .select(PATCH_SELECT)
      .eq("id", auth.user.id)
      .single();

    if (fetchErr || !user) {
      return errorResponse("User not found", "NOT_FOUND", 404);
    }

    const builder = await getBuilderProgressForUser(
      supabase,
      user.id,
      { status: user.status, createdAt: user.createdAt },
    );

    return NextResponse.json({
      ...user,
      builder,
      ...profileExtras(auth.user, user.usernameChangedAt as string | null | undefined),
    });
  } catch (e) {
    console.error("Update profile error:", e);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
