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

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({ email: "", username: "", displayName: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
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
              <Input placeholder="John Doe" value={form.displayName} onChange={update("displayName")} required />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-app-fg-muted">Username</label>
              <Input placeholder="johndoe" value={form.username} onChange={update("username")} required />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-app-fg-muted">Email</label>
              <Input type="email" placeholder="you@example.com" value={form.email} onChange={update("email")} required />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-app-fg-muted">Password</label>
              <Input type="password" placeholder="Min 8 characters" value={form.password} onChange={update("password")} required minLength={8} />
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

