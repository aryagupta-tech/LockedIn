"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Bookmark } from "lucide-react";
import Link from "next/link";
import { api, type Post, type FeedResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PostCard } from "@/components/app/post-card";
import { FeedSkeleton } from "@/components/app/feed-skeleton";
import { Button } from "@/components/ui/button";

export default function BookmarksPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const isApproved = user?.status === "APPROVED";

  const fetchBookmarks = useCallback(async (cursorParam?: string) => {
    try {
      const query = cursorParam ? `?cursor=${encodeURIComponent(cursorParam)}&limit=20` : "?limit=20";
      return await api.get<FeedResponse>(`/bookmarks${query}`);
    } catch {
      return { items: [], nextCursor: null, hasMore: false };
    }
  }, []);

  useEffect(() => {
    if (!isApproved) {
      setLoading(false);
      return;
    }
    fetchBookmarks().then((data) => {
      setPosts(data.items);
      setCursor(data.nextCursor);
      setLoading(false);
    });
  }, [isApproved, fetchBookmarks]);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    const data = await fetchBookmarks(cursor);
    setPosts((prev) => [...prev, ...data.items]);
    setCursor(data.nextCursor);
    setLoadingMore(false);
  };

  const removeFromList = (id: string) => setPosts((prev) => prev.filter((p) => p.id !== id));

  if (!user) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-neon" />
      </div>
    );
  }

  if (!isApproved) {
    return (
      <div className="post-card px-6 py-16 text-center">
        <p className="text-[15px] text-app-fg-muted">Bookmarks are available after your account is approved.</p>
        <Button variant="outline" size="sm" asChild className="mt-5 rounded-full">
          <Link href="/apply">View application</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-app-fg">Saved posts</h1>
        <p className="mt-1 text-[14px] text-app-fg-muted">Posts you bookmark from the feed.</p>
      </div>

      {loading ? (
        <FeedSkeleton />
      ) : posts.length === 0 ? (
        <div className="post-card px-6 py-16 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-neon/15 to-amber-600/15">
            <Bookmark className="h-7 w-7 text-neon" />
          </div>
          <h2 className="mb-2 text-[17px] font-bold text-app-fg">No saved posts yet</h2>
          <p className="mx-auto max-w-[280px] text-[14px] leading-relaxed text-app-fg-muted">
            Tap the bookmark on any post to save it here.
          </p>
          <Button variant="outline" size="sm" asChild className="mt-5 rounded-full">
            <Link href="/feed">Back to feed</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-5">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={{ ...post, hasBookmarked: true }}
                onBookmarkRemoved={removeFromList}
              />
            ))}
          </div>
          {cursor && (
            <div className="flex justify-center pb-8">
              <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore} className="rounded-full">
                {loadingMore ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
