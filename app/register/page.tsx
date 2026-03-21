"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { LockedInMark } from "@/components/brand/locked-in-mark";
import {
  isValidEmail,
  validateDisplayName,
  validatePassword,
  validateUsername,
} from "@/lib/validation";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({ email: "", username: "", displayName: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      let v = e.target.value;
      if (field === "username") v = v.toLowerCase().replace(/[^a-z0-9_]/g, "");
      setForm((prev) => ({ ...prev, [field]: v }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isValidEmail(form.email)) {
      setError("Enter a valid email address.");
      return;
    }
    const u = validateUsername(form.username);
    if (!u.ok) {
      setError(u.error);
      return;
    }
    const pw = validatePassword(form.password);
    if (pw) {
      setError(pw);
      return;
    }
    const dn = validateDisplayName(form.displayName);
    if (dn) {
      setError(dn);
      return;
    }

    setLoading(true);
    try {
      await register({
        email: form.email.trim(),
        username: u.username,
        displayName: form.displayName.trim(),
        password: form.password,
      });
      document.cookie = "lockedin_logged_in=1; path=/; max-age=604800";
      router.push("/feed");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-app-bg px-4 py-10 sm:py-14">
      <div className="hero-aurora pointer-events-none fixed inset-0 opacity-60 dark:opacity-100" />
      <div className="relative z-10 mx-auto w-full max-w-[420px]">
        <header className="mb-8 text-center sm:mb-10">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2.5 font-[var(--font-geist)] text-2xl font-semibold text-app-fg"
          >
            <LockedInMark size={28} />
            LockedIn
          </Link>
          <p className="mt-3 text-sm text-app-fg-muted">Create your account</p>
        </header>

        <div className="app-panel p-6 backdrop-blur-xl sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-app-fg-muted">Display Name</label>
              <Input placeholder="John Doe" value={form.displayName} onChange={update("displayName")} required maxLength={80} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-app-fg-muted">Username</label>
              <Input
                placeholder="john_doe"
                value={form.username}
                onChange={update("username")}
                required
                minLength={3}
                maxLength={30}
                autoComplete="username"
                spellCheck={false}
              />
              <p className="mt-1 text-[11px] text-app-fg-muted">
                3–30 characters: lowercase letters, numbers, underscores only. Must be unique.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-app-fg-muted">Email</label>
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={update("email")}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-app-fg-muted">Password</label>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="Strong password"
                value={form.password}
                onChange={update("password")}
                required
                minLength={10}
              />
              <ul className="mt-1.5 list-inside list-disc text-[11px] text-app-fg-muted">
                <li>At least 10 characters</li>
                <li>Lowercase, uppercase, number, and a special character</li>
              </ul>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Create Account
            </Button>
          </form>
        </div>

        <p className="mt-8 text-center text-sm text-app-fg-muted sm:mt-10">
          Already have an account?{" "}
          <Link href="/login" className="text-neon hover:text-neon-light transition-colors">
            Sign in <ArrowRight className="ml-0.5 inline h-3 w-3" />
          </Link>
        </p>
      </div>
    </div>
  );
}
