"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Users2, Lock, Globe } from "lucide-react";
import { api, type Community } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Community[] | { communities: Community[] }>("/communities?limit=50")
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.communities || []);
        setCommunities(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-geist)] text-2xl font-semibold text-white">Communities</h1>
          <p className="mt-1 text-sm text-zinc-500">Find your tribe</p>
        </div>
        <Button size="sm" asChild>
          <Link href="/communities/create">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Create
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-neon" />
        </div>
      ) : communities.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-surface/40 py-16 text-center">
          <Users2 className="mx-auto mb-3 h-8 w-8 text-zinc-600" />
          <p className="text-sm text-zinc-500">No communities yet. Create the first one!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {communities.map((c) => (
            <Link
              key={c.id}
              href={`/communities/${c.slug}`}
              className="group rounded-2xl border border-white/[0.06] bg-surface/60 p-5 transition-all hover:border-white/[0.1] hover:shadow-neon"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-neon/20 to-purple-500/20 text-sm font-bold text-white">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium text-white group-hover:text-neon-light">{c.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    {c.isPrivate ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                    <span>{c.memberCount} member{c.memberCount !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              </div>
              {c.description && (
                <p className="line-clamp-2 text-sm text-zinc-400">{c.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
