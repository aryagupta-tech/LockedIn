"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Github, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { LockedInMark } from "@/components/brand/locked-in-mark";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [error, setError] = useState("");
  const [oauthBusy, setOauthBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/feed");
    }
  }, [authLoading, user, router]);

  const handleGitHub = async () => {
    setError("");
    setOauthBusy(true);
    try {
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo: `${window.location.origin}/auth/github/callback` },
      });
      if (oauthErr) throw oauthErr;
    } catch {
      setError("Could not start GitHub sign-in. Try again.");
      setOauthBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-app-bg px-4 py-10 sm:py-14">
      <div className="hero-aurora pointer-events-none fixed inset-0 opacity-100" />
      <div className="relative z-10 mx-auto w-full max-w-[420px]">
        <header className="mb-8 text-center sm:mb-10">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2.5 font-[var(--font-geist)] text-2xl font-semibold text-app-fg"
          >
            <LockedInMark size={28} />
            <span className="text-brand-logo font-[var(--font-geist)] font-semibold">LockedIn</span>
          </Link>
          <p className="mt-3 text-sm text-app-fg-muted">Sign in with GitHub to continue</p>
        </header>

        <div className="app-panel p-6 backdrop-blur-xl sm:p-8">
          <p className="mb-5 text-center text-[14px] leading-relaxed text-app-fg-muted">
            New here? GitHub will create your account on first sign-in. You&apos;ll finish setup inside the app.
          </p>
          <Button className="w-full" disabled={oauthBusy} onClick={() => void handleGitHub()}>
            {oauthBusy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Github className="mr-2 h-4 w-4" />
            )}
            Continue with GitHub
          </Button>

          {error && (
            <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-sm text-app-fg-muted sm:mt-10">
          <Link href="/" className="text-neon transition-colors hover:text-neon-light">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
