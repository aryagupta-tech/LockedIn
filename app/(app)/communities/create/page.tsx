"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, type Community } from "@/lib/api";
import { ApiError } from "@/lib/api";

export default function CreateCommunityPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", slug: "", description: "", isPrivate: false });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    setForm((prev) => ({ ...prev, name, slug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const community = await api.post<Community>("/communities", {
        name: form.name,
        slug: form.slug,
        description: form.description || undefined,
        isPrivate: form.isPrivate,
      });
      router.push(`/communities/${community.slug}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create community");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link href="/communities" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300">
        <ArrowLeft className="h-4 w-4" /> Communities
      </Link>

      <div>
        <h1 className="font-[var(--font-geist)] text-2xl font-semibold text-white">Create Community</h1>
        <p className="mt-1 text-sm text-zinc-500">Start a new space for builders</p>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-surface/60 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Name</label>
            <Input placeholder="System Design" value={form.name} onChange={handleNameChange} required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Slug</label>
            <Input placeholder="system-design" value={form.slug} onChange={update("slug")} required pattern="^[a-z0-9-]+$" />
            <p className="mt-1 text-[11px] text-zinc-600">Lowercase letters, numbers, and hyphens only</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Description</label>
            <textarea
              placeholder="What's this community about?"
              value={form.description}
              onChange={update("description")}
              rows={3}
              className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-neon/30 transition-colors"
            />
          </div>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.isPrivate}
              onChange={(e) => setForm((prev) => ({ ...prev, isPrivate: e.target.checked }))}
              className="h-4 w-4 rounded border-white/10 bg-white/5 accent-neon"
            />
            <span className="text-sm text-zinc-300">Private community (members must be approved)</span>
          </label>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users2 className="mr-2 h-4 w-4" />}
            Create Community
          </Button>
        </form>
      </div>
    </div>
  );
}
