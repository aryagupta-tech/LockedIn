"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api, type AuthResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function GitHubCallbackInner() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    async function handleCallback() {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.replace("#", "?"));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (!accessToken || !refreshToken) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          try {
            const result = await api.post<AuthResponse>(
              "/auth/github/callback",
              { access_token: session.access_token, refresh_token: session.refresh_token },
              { skipAuth: true },
            );
            await supabase.auth.setSession({
              access_token: result.accessToken,
              refresh_token: result.refreshToken,
            });
            setAuth(result);
            document.cookie = "lockedin_logged_in=1; path=/; max-age=604800";
            router.push("/feed");
            return;
          } catch (err) {
            setError((err as Error).message || "GitHub authentication failed");
            return;
          }
        }
        setError("No authorization tokens received from GitHub");
        return;
      }

      try {
        const result = await api.post<AuthResponse>(
          "/auth/github/callback",
          { access_token: accessToken, refresh_token: refreshToken },
          { skipAuth: true },
        );
        await supabase.auth.setSession({
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
        });
        setAuth(result);
        document.cookie = "lockedin_logged_in=1; path=/; max-age=604800";
        router.push("/feed");
      } catch (err) {
        setError((err as Error).message || "GitHub authentication failed");
      }
    }

    handleCallback();
  }, [router, setAuth]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-400">
          <p className="mb-4">{error}</p>
          <a href="/login" className="text-sm text-neon underline">Back to login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-neon" />
        <p className="text-zinc-400">Authenticating with GitHub...</p>
      </div>
    </div>
  );
}

export default function GitHubCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neon" />
      </div>
    }>
      <GitHubCallbackInner />
    </Suspense>
  );
}
