"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function DevLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [status, setStatus] = useState("Logging you in...");

  useEffect(() => {
    const email = process.env.NEXT_PUBLIC_DEV_EMAIL;
    const password = process.env.NEXT_PUBLIC_DEV_PASSWORD;

    if (!email || !password) {
      setStatus("Dev login not configured. Set NEXT_PUBLIC_DEV_EMAIL and NEXT_PUBLIC_DEV_PASSWORD in .env");
      return;
    }

    login(email, password)
      .then(() => {
        document.cookie = "lockedin_logged_in=1; path=/; max-age=604800";
        setStatus("Success! Redirecting...");
        router.push("/feed");
      })
      .catch((err) => {
        setStatus(`Login failed: ${err.message}`);
      });
  }, [login, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-lg text-app-fg-muted">{status}</p>
    </div>
  );
}
