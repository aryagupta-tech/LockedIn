"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { AuthResponse } from "@/lib/api";

export default function DevLoginPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [status, setStatus] = useState("Logging you in...");

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      setStatus("Not available in production.");
      return;
    }

    fetch("/api/dev-login", { method: "POST" })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          accessToken?: string;
          refreshToken?: string;
          expiresIn?: number;
          user?: AuthResponse["user"];
        };
        if (!res.ok) {
          throw new Error(body.error || res.statusText);
        }
        if (
          !body.accessToken ||
          !body.refreshToken ||
          body.expiresIn === undefined ||
          !body.user
        ) {
          throw new Error("Invalid dev-login response");
        }
        const data: AuthResponse = {
          accessToken: body.accessToken,
          refreshToken: body.refreshToken,
          expiresIn: body.expiresIn,
          user: body.user,
        };
        await supabase.auth.setSession({
          access_token: data.accessToken,
          refresh_token: data.refreshToken,
        });
        setAuth(data);
        document.cookie = "lockedin_logged_in=1; path=/; max-age=604800";
        setStatus("Success! Redirecting...");
        router.push("/feed");
      })
      .catch((err: Error) => {
        setStatus(`Login failed: ${err.message}`);
      });
  }, [router, setAuth]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-lg text-app-fg-muted">{status}</p>
    </div>
  );
}
