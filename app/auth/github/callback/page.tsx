"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api, type AuthResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Suspense } from "react";

function GitHubCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { setAuth } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const code = params.get("code");
    if (!code) {
      setError("No authorization code received from GitHub");
      return;
    }

    api.post<AuthResponse>("/auth/github/callback", { code }, { skipAuth: true })
      .then((data) => {
        setAuth(data);
        document.cookie = "lockedin_logged_in=1; path=/; max-age=604800";
        router.push("/feed");
      })
      .catch((err) => {
        setError(err.message || "GitHub authentication failed");
      });
  }, [params, router, setAuth]);

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
