"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { ThemeToggle } from "@/components/theme-toggle";

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
    <div className="relative flex min-h-screen items-center justify-center bg-app-bg px-4">
      <ThemeToggle className="fixed right-4 top-4 z-20 sm:right-6 sm:top-6" />
      <div className="hero-aurora pointer-events-none fixed inset-0 opacity-60 dark:opacity-100" />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 font-[var(--font-geist)] text-2xl font-semibold text-app-fg">
            <BrandMark />
            LockedIn
          </Link>
          <p className="mt-3 text-sm text-app-fg-muted">Create your account</p>
        </div>

        <div className="app-panel p-8 backdrop-blur-xl">
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

        <p className="mt-6 text-center text-sm text-app-fg-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-neon hover:text-neon-light transition-colors">
            Sign in <ArrowRight className="ml-0.5 inline h-3 w-3" />
          </Link>
        </p>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <span className="relative inline-flex h-7 w-7 items-center justify-center">
      <span className="absolute inset-0 rounded-[9px] bg-gradient-to-br from-[#7b9dff] via-[#6e78ff] to-[#f3c680] opacity-90" />
      <span className="absolute inset-[1.5px] rounded-[8px] bg-app-bg" />
      <span className="absolute h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#a5d4ff] to-[#f0c670]" />
      <span className="absolute h-3.5 w-3.5 rounded-full border border-white/20" />
    </span>
  );
}
