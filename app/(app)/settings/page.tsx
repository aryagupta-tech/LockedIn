"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    displayName: user?.displayName || "",
    bio: "",
    avatarUrl: user?.avatarUrl || "",
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);
    try {
      await api.patch("/profiles/me", {
        displayName: form.displayName || undefined,
        bio: form.bio || undefined,
        avatarUrl: form.avatarUrl || undefined,
      });
      await refreshUser();
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[var(--font-geist)] text-2xl font-semibold text-white">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">Update your profile information</p>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-surface/60 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Display Name</label>
            <Input value={form.displayName} onChange={update("displayName")} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Bio</label>
            <textarea
              value={form.bio}
              onChange={update("bio")}
              placeholder="Tell people about yourself..."
              rows={4}
              className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-neon/30 transition-colors"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Avatar URL</label>
            <Input value={form.avatarUrl} onChange={update("avatarUrl")} placeholder="https://..." />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Email</label>
            <Input value={user?.email || ""} disabled className="opacity-50" />
            <p className="mt-1 text-[11px] text-zinc-600">Email cannot be changed</p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Username</label>
            <Input value={user?.username || ""} disabled className="opacity-50" />
            <p className="mt-1 text-[11px] text-zinc-600">Username cannot be changed</p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</div>
          )}
          {success && (
            <div className="rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-sm text-green-400">Profile updated!</div>
          )}

          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </form>
      </div>
    </div>
  );
}
