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
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    isPrivate: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update =
    (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
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
      setError(
        err instanceof ApiError ? err.message : "Failed to create community"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000]">
      <Link
        href="/communities"
        className="mb-6 inline-flex items-center gap-2 text-[14px] text-[#888] transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Communities
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Create Community</h1>
        <p className="mt-1 text-[14px] text-[#888]">
          Start a new space for builders
        </p>
      </div>

      <div className="rounded-2xl border border-[#222] bg-[#111] p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block text-[13px] font-medium text-[#888]">
              Name
            </label>
            <Input
              placeholder="System Design"
              value={form.name}
              onChange={handleNameChange}
              required
              className="border-[#222] bg-[#0a0a0a] text-white placeholder-[#555] focus:border-[#333]"
            />
          </div>
          <div>
            <label className="mb-2 block text-[13px] font-medium text-[#888]">
              Slug
            </label>
            <Input
              placeholder="system-design"
              value={form.slug}
              onChange={update("slug")}
              required
              pattern="^[a-z0-9-]+$"
              className="border-[#222] bg-[#0a0a0a] text-white placeholder-[#555] focus:border-[#333]"
            />
            <p className="mt-1.5 text-[12px] text-[#666]">
              Lowercase letters, numbers, and hyphens only
            </p>
          </div>
          <div>
            <label className="mb-2 block text-[13px] font-medium text-[#888]">
              Description
            </label>
            <textarea
              placeholder="What's this community about?"
              value={form.description}
              onChange={update("description")}
              rows={3}
              className="w-full rounded-xl border border-[#222] bg-[#0a0a0a] px-4 py-3 text-[15px] text-[#e4e4e4] placeholder-[#555] outline-none transition-colors focus:border-[#333]"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={form.isPrivate}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, isPrivate: e.target.checked }))
              }
              className="h-4 w-4 rounded border-[#333] bg-[#0a0a0a] accent-[#888]"
            />
            <span className="text-[14px] text-[#e4e4e4]">
              Private community (members must be approved)
            </span>
          </label>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[14px] text-red-400">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full rounded-full"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Users2 className="mr-2 h-4 w-4" />
            )}
            Create Community
          </Button>
        </form>
      </div>
    </div>
  );
}
