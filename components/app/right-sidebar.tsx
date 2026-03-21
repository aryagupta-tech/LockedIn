"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BuilderProgressCard } from "@/components/app/builder-progress-card";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { UserAvatar } from "@/components/ui/user-avatar";

type SuggestedUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

/** Wire to real trending tags / analytics when there is usage. */
const trendingTopics: { tag: string; count: string }[] = [];

export function RightSidebar() {
  const { user, refreshUser } = useAuth();
  const [suggested, setSuggested] = useState<SuggestedUser[]>([]);
  const [loadingSuggested, setLoadingSuggested] = useState(false);
  const [followBusy, setFollowBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setSuggested([]);
      return;
    }
    let cancelled = false;
    setLoadingSuggested(true);
    api
      .get<{ items: SuggestedUser[] }>("/profiles/suggested")
      .then((r) => {
        if (!cancelled) setSuggested(Array.isArray(r.items) ? r.items : []);
      })
      .catch(() => {
        if (!cancelled) setSuggested([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSuggested(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const followOne = async (target: SuggestedUser) => {
    if (followBusy) return;
    setFollowBusy(target.id);
    try {
      await api.post(`/profiles/${target.id}/follow`);
      setSuggested((prev) => prev.filter((u) => u.id !== target.id));
      void refreshUser();
    } catch {
      /* ignore */
    }
    setFollowBusy(null);
  };

  return (
    <div className="sticky top-[calc(var(--app-nav-h)+12px)] space-y-5">
      {user?.builder && <BuilderProgressCard progress={user.builder} variant="compact" />}

      {/* Suggested Profiles */}
      <div className="app-panel p-4">
        <h3 className="mb-3 text-[15px] font-bold text-app-fg">Suggested Profiles</h3>
        {!user ? (
          <p className="text-[12px] leading-relaxed text-app-fg-muted">Sign in to see builders you can follow.</p>
        ) : loadingSuggested ? (
          <p className="text-[12px] text-app-fg-muted">Loading…</p>
        ) : suggested.length === 0 ? (
          <p className="text-[12px] leading-relaxed text-app-fg-muted">
            No suggestions right now — you may already follow everyone, or other members are still pending
            approval.
          </p>
        ) : (
          <div className="space-y-3">
            {suggested.map((u) => (
              <div key={u.id} className="flex items-center gap-3">
                <Link href={`/u/${u.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <UserAvatar
                    avatarUrl={u.avatarUrl}
                    displayName={u.displayName}
                    username={u.username}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-app-fg">{u.displayName}</p>
                    <p className="truncate text-[12px] text-app-fg-muted">@{u.username}</p>
                  </div>
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 flex-shrink-0 rounded-full px-3 text-[11px]"
                  disabled={followBusy === u.id}
                  onClick={() => void followOne(u)}
                >
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
            No trending topics yet. When the community is posting, popular tags will show up here.
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
