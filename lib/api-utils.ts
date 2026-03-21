import { NextResponse } from "next/server";
import { createServiceClient } from "./supabase-server";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(
  message: string,
  code: string,
  status: number,
  extras?: Record<string, unknown>,
) {
  return NextResponse.json(
    { error: message, code, ...extras },
    { status },
  );
}

type AuthSuccess = { user: SupabaseUser };
type AuthFailure = { error: NextResponse };
type AuthResult = AuthSuccess | AuthFailure;

export async function getAuthUser(
  request: Request,
): Promise<SupabaseUser | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const supabase = createServiceClient();
  const { data, error } = await supabase.auth.getUser(authHeader.slice(7));
  if (error || !data.user) return null;
  return data.user;
}

export async function requireAuth(request: Request): Promise<AuthResult> {
  const user = await getAuthUser(request);
  if (!user)
    return { error: errorResponse("Unauthorized", "UNAUTHORIZED", 401) };
  return { user };
}

export async function requireApproved(request: Request): Promise<AuthResult> {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth;

  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("users")
    .select("status, role")
    .eq("id", auth.user.id)
    .single();

  if (!profile || profile.status !== "APPROVED") {
    return {
      error: errorResponse("Account not yet approved", "NOT_APPROVED", 403),
    };
  }

  return { user: auth.user };
}

export async function requireAdmin(request: Request): Promise<AuthResult> {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth;

  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (!profile || profile.role !== "ADMIN") {
    return { error: errorResponse("Forbidden", "FORBIDDEN", 403) };
  }

  return { user: auth.user };
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}
