"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Save, Upload, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { uploadAvatar } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const [form, setForm] = useState({
    displayName: user?.displayName || "",
    bio: "",
    avatarUrl: user?.avatarUrl || "",
  });
  const [usernameDraft, setUsernameDraft] = useState(user?.username || "");

  useEffect(() => {
    if (user?.username) setUsernameDraft(user.username);
  }, [user?.username]);
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
      const body: Record<string, unknown> = {
        displayName: form.displayName || undefined,
        bio: form.bio || undefined,
        avatarUrl: form.avatarUrl || undefined,
      };
      const draftNorm = usernameDraft.trim().toLowerCase();
      const currentNorm = user?.username?.trim().toLowerCase() ?? "";
      const mayChangeUsername = user?.canChangeUsername !== false;
      if (mayChangeUsername && draftNorm && draftNorm !== currentNorm) {
        body.username = draftNorm;
      }

      await api.patch("/profiles/me", body);
      await refreshUser();
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    document.cookie = "lockedin_logged_in=; path=/; max-age=0";
    logout();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-app-bg">
      <div className="border-b border-app-border pb-4">
        <h1 className="text-xl font-bold text-app-fg">Settings</h1>
        <p className="mt-1 text-sm text-app-fg-muted">Manage your profile and account</p>
      </div>

      {/* Profile Section */}
      <div className="mt-6">
        <h2 className="mb-3 text-[15px] font-semibold text-app-fg-secondary">Profile</h2>
        <div className="app-panel p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-5">
              <UserAvatar
                avatarUrl={form.avatarUrl}
                displayName={form.displayName || user?.displayName || "?"}
                username={user?.username || "?"}
                size="xl"
              />
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
                <p className="mt-1.5 text-xs text-app-fg-muted">JPG, PNG under 2MB</p>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-app-fg-muted">
                Display Name
              </label>
              <Input value={form.displayName} onChange={update("displayName")} />
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-app-fg-muted">Bio</label>
              <textarea
                value={form.bio}
                onChange={update("bio")}
                placeholder="Tell people about yourself..."
                rows={4}
                className="neo-field w-full resize-y rounded-app-md bg-app-input px-4 py-3 text-[15px] text-app-fg placeholder:text-app-fg-muted outline-none focus-visible:outline-none"
              />
            </div>

            {error && (
              <div className="rounded-app-md border border-red-500/25 bg-red-500/10 px-4 py-3 text-[14px] text-red-400">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-app-md border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-[14px] text-emerald-400">
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

      {/* Account Section */}
      <div className="mt-8">
        <h2 className="mb-3 text-[15px] font-semibold text-app-fg-secondary">Account</h2>
        <div className="app-panel space-y-5 p-6">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-app-fg-muted">Email</label>
            <Input value={user?.email || ""} disabled className="opacity-50" />
            <p className="mt-1.5 text-xs text-app-fg-muted">Email cannot be changed</p>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-app-fg-muted">Username</label>
            <Input
              value={usernameDraft}
              onChange={(e) =>
                setUsernameDraft(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
              }
              disabled={user?.canChangeUsername === false}
              className={user?.canChangeUsername === false ? "opacity-50" : ""}
              autoComplete="username"
              spellCheck={false}
            />
            <p className="mt-1.5 text-xs text-app-fg-muted">
              3–30 characters: lowercase letters, numbers, underscores. Your public profile is at{" "}
              <span className="text-app-fg-secondary">/u/{usernameDraft || user?.username}</span>.
            </p>
            {user?.canChangeUsername === false && user?.nextUsernameChangeAt && (
              <p className="mt-2 text-xs text-amber-400/90">
                You can change your username again after{" "}
                {new Date(user.nextUsernameChangeAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                . After a change, your previous handle stays reserved for 30 days before anyone else can take it.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mb-10 mt-8">
        <h2 className="mb-3 text-[15px] font-semibold text-red-400">Danger Zone</h2>
        <div className="rounded-app border border-red-500/20 bg-red-500/[0.06] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[14px] font-medium text-app-fg">Sign out of your account</p>
              <p className="mt-0.5 text-[13px] text-app-fg-muted">You will be redirected to the home page</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="w-full shrink-0 rounded-full border-red-500/35 text-red-400 hover:bg-red-500/10 hover:text-red-300 sm:w-auto"
            >
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
