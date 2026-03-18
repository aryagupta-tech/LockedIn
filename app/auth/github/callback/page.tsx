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
    async function syncBackend(session: any) {
      if (!session) return;
      try {
        const result = await api.post<AuthResponse>(
          "/auth/github/callback",
          { access_token: session.access_token, refresh_token: session.refresh_token },
          { skipAuth: true }
        );
        setAuth(result);
        document.cookie = "lockedin_logged_in=1; path=/; max-age=604800";
        router.push("/feed");
      } catch (err) {
        setError((err as Error).message || "GitHub backend sync failed");
      }
    }

    // Give Supabase client a moment to parse the URL hash from GitHub
    setTimeout(() => {
      supabase.auth.getSession().then(({ data, error: sessionErr }) => {
        if (sessionErr || !data.session) {
          setError("No session tokens received from GitHub. Please try again.");
          return;
        }
        syncBackend(data.session);
      });
    }, 1000);
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
