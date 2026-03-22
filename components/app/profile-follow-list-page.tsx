"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { UserAvatar } from "@/components/ui/user-avatar";

type Row = { id: string; username: string; displayName: string; avatarUrl?: string | null };

export function ProfileFollowListPage({ kind }: { kind: "followers" | "following" }) {
  const params = useParams();
  const username = params.username as string;
  const [items, setItems] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setFailed(false);
    const path =
      kind === "followers" ? `/profiles/${username}/followers` : `/profiles/${username}/following`;
    api
      .get<{ items: Row[] }>(path)
      .then((d) => {
        if (!cancelled) setItems(Array.isArray(d.items) ? d.items : []);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [username, kind]);

  const title = kind === "followers" ? "Followers" : "Following";
  const empty =
    kind === "followers" ? "No followers yet." : "Not following anyone yet.";

  return (
    <div className="min-h-screen bg-app-bg">
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <Link
          href={`/u/${username}`}
          prefetch
          className="inline-flex items-center gap-2 text-[14px] text-app-fg-muted transition-colors hover:text-app-fg"
        >
          <ArrowLeft className="h-4 w-4" /> Back to profile
        </Link>

        <div className="app-panel p-6 sm:p-8">
          <h1 className="text-lg font-semibold text-app-fg">{title}</h1>
          <p className="mt-1 text-[14px] text-app-fg-muted">@{username}</p>

          {items === null && !failed && (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-app-fg-muted" />
            </div>
          )}

          {failed && (
            <p className="mt-8 text-center text-[15px] text-app-fg-muted">Couldn&apos;t load this list.</p>
          )}

          {items && items.length === 0 && (
            <p className="mt-8 text-center text-[15px] text-app-fg-muted">{empty}</p>
          )}

          {items && items.length > 0 && (
            <ul className="mt-6 divide-y divide-app-border/60">
              {items.map((u) => (
                <li key={u.id} className="py-3 first:pt-0">
                  <Link
                    href={`/u/${u.username}`}
                    prefetch
                    className="flex items-center gap-3 rounded-app px-1 py-1 transition-colors hover:bg-app-surface-2/50"
                  >
                    <UserAvatar
                      avatarUrl={u.avatarUrl}
                      displayName={u.displayName}
                      username={u.username}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-app-fg">{u.displayName}</p>
                      <p className="truncate text-[13px] text-app-fg-muted">@{u.username}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
