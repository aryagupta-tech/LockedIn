"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BuilderProgressCard } from "@/components/app/builder-progress-card";
import { api, type User } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

/** Wire to API / recommendations when the network has active users. */
const suggestedUsers: {
  name: string;
  username: string;
  color: string;
}[] = [];

/** Wire to real trending tags / analytics when there is usage. */
const trendingTopics: { tag: string; count: string }[] = [];

export function RightSidebar() {
  const { user } = useAuth();
  const [meBuilder, setMeBuilder] = useState<User["builder"]>(undefined);

  useEffect(() => {
    if (!user) {
      setMeBuilder(undefined);
      return;
    }
    let cancelled = false;
    api
      .get<User>("/profiles/me")
      .then((u) => {
        if (!cancelled) setMeBuilder(u.builder);
      })
      .catch(() => {
        if (!cancelled) setMeBuilder(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="sticky top-[calc(var(--app-nav-h)+12px)] space-y-5">
      {user && meBuilder && <BuilderProgressCard progress={meBuilder} variant="compact" />}

      {/* Suggested Profiles */}
      <div className="app-panel p-4">
        <h3 className="mb-3 text-[15px] font-bold text-app-fg">Suggested Profiles</h3>
        {suggestedUsers.length === 0 ? (
          <p className="text-[12px] leading-relaxed text-app-fg-muted">
            No suggestions yet. Once more builders join, we&apos;ll surface people you may
            want to follow here.
          </p>
        ) : (
          <div className="space-y-3">
            {suggestedUsers.map((u) => (
              <div key={u.username} className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${u.color} text-[11px] font-bold text-white`}
                >
                  {u.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-app-fg">{u.name}</p>
                <p className="truncate text-[12px] text-app-fg-muted">@{u.username}</p>
                </div>
                <Button variant="outline" size="sm" className="h-7 rounded-full px-3 text-[11px]">
                  Follow
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trending Topics */}
      <div className="app-panel p-4">
        <h3 className="mb-3 text-[15px] font-bold text-app-fg">Trending Topics</h3>
        {trendingTopics.length === 0 ? (
          <p className="text-[12px] leading-relaxed text-app-fg-muted">
            No trending topics yet. When the community is posting, popular tags will show
            up here.
          </p>
        ) : (
          <div className="space-y-2.5">
            {trendingTopics.map((t) => (
              <button
                key={t.tag}
                className="-mx-2 block w-full rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-app-surface-2"
              >
                <p className="text-[14px] font-semibold text-neon-light">{t.tag}</p>
                <p className="text-[12px] text-app-fg-muted">{t.count}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="px-2 text-[11px] text-app-fg-muted/70">
        Terms · Privacy · About
        <br />
        &copy; 2026 LockedIn
      </p>
    </div>
  );
}
