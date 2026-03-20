"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Lock, Globe, Compass } from "lucide-react";
import { api, type Community } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COMMUNITY_COLORS = [
  "from-purple-500 to-pink-400",
  "from-blue-500 to-cyan-400",
  "from-green-500 to-emerald-400",
  "from-orange-500 to-amber-400",
  "from-rose-500 to-red-400",
  "from-indigo-500 to-violet-400",
];

function getColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COMMUNITY_COLORS[Math.abs(hash) % COMMUNITY_COLORS.length];
}

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
    <div className="min-h-screen bg-app-bg">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-app-fg">Explore Communities</h1>
        <Button size="sm" asChild className="rounded-full">
          <Link href="/communities/create">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Create
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-app-fg-muted" />
        </div>
      ) : communities.length === 0 ? (
        <div className="app-panel px-8 py-20 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/30 to-cyan-500/30 shadow-app">
            <Compass className="h-10 w-10 text-app-fg-muted" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-app-fg">No communities yet</h2>
          <p className="mx-auto max-w-sm text-[15px] text-app-fg-muted">
            Create the first community and invite builders to join.
          </p>
          <Button size="sm" asChild className="mt-6 rounded-full">
            <Link href="/communities/create">Create Community</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {communities.map((c) => (
            <div
              key={c.id}
              className="app-panel p-6 transition-shadow duration-200 hover:shadow-app-hover"
            >
              <div className="flex items-start gap-5">
                <div
                  className={cn(
                    "flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-lg font-bold text-white shadow-app",
                    getColor(c.name),
                  )}
                >
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[17px] font-bold text-app-fg">{c.name}</h3>
                    {c.isPrivate ? (
                      <Lock className="h-4 w-4 flex-shrink-0 text-app-fg-muted" />
                    ) : (
                      <Globe className="h-4 w-4 flex-shrink-0 text-app-fg-muted" />
                    )}
                  </div>
                  <p className="mt-1 text-[14px] text-app-fg-muted">
                    {c.memberCount} member{c.memberCount !== 1 ? "s" : ""}
                  </p>
                  {c.description && (
                    <p className="mt-2 line-clamp-2 text-[15px] leading-relaxed text-app-fg-secondary">
                      {c.description}
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm" asChild className="flex-shrink-0 rounded-full text-[14px]">
                  <Link href={`/communities/${c.slug}`}>View</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
