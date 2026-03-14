"use client";

import { useState, useRef } from "react";
import { Loader2, Save, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { uploadAvatar } from "@/lib/storage";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  "from-violet-500 to-fuchsia-500",
  "from-blue-500 to-cyan-400",
  "from-orange-500 to-rose-500",
  "from-emerald-500 to-teal-400",
  "from-pink-500 to-rose-400",
  "from-amber-500 to-orange-400",
  "from-indigo-500 to-blue-400",
  "from-teal-500 to-emerald-400",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

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
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setSuccess(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Avatar must be under 2MB");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const url = await uploadAvatar(user.id, file);
      setForm((prev) => ({ ...prev, avatarUrl: url }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
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
    <div className="min-h-screen bg-[#000]">
      <div className="border-b border-[#222] pb-4">
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-[#888]">Update your profile information</p>
      </div>

      <div className="mt-6 rounded-2xl border border-[#222] bg-[#111] p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-5">
            <div
              className={cn(
                "flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br text-2xl font-bold text-white",
                user?.username ? getAvatarColor(user.username) : "from-violet-500 to-fuchsia-500"
              )}
            >
              {form.avatarUrl ? (
                <img src={form.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                user?.displayName?.charAt(0).toUpperCase() || "?"
              )}
            </div>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="rounded-full"
              >
                {uploading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-2 h-3.5 w-3.5" />}
                {uploading ? "Uploading..." : "Change Avatar"}
              </Button>
              <p className="mt-1.5 text-xs text-[#666]">JPG, PNG under 2MB</p>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#e4e4e4]">
              Display Name
            </label>
            <Input value={form.displayName} onChange={update("displayName")} />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#e4e4e4]">Bio</label>
            <textarea
              value={form.bio}
              onChange={update("bio")}
              placeholder="Tell people about yourself..."
              rows={4}
              className="w-full rounded-xl border border-[#222] bg-[#0a0a0a] px-4 py-3 text-[15px] text-white placeholder-[#555] outline-none transition-colors focus:border-[#333] focus:ring-1 focus:ring-[#333]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#e4e4e4]">Email</label>
            <Input value={user?.email || ""} disabled className="opacity-50" />
            <p className="mt-1.5 text-xs text-[#666]">Email cannot be changed</p>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#e4e4e4]">Username</label>
            <Input value={user?.username || ""} disabled className="opacity-50" />
            <p className="mt-1.5 text-xs text-[#666]">Username cannot be changed</p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[14px] text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-[14px] text-green-400">
              Profile updated successfully!
            </div>
          )}

          <Button type="submit" disabled={loading} className="rounded-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </form>
      </div>
    </div>
  );
}
