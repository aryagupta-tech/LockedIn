"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, PenLine, Rocket } from "lucide-react";
import { api, type Post, type FeedResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PostCard } from "@/components/app/post-card";
import { FeedSkeleton } from "@/components/app/feed-skeleton";
import { CreatePost } from "@/components/app/create-post";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function FeedPage() {
  const { user, refreshUser } = useAuth();
  const pendingProfileSync = useRef(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const isApproved = user?.status === "APPROVED";

  // If DB was updated to APPROVED but client still shows PENDING, refetch profile (once per PENDING stretch).
  useEffect(() => {
    if (user?.status === "APPROVED") {
      pendingProfileSync.current = false;
      return;
    }
    if (!user || user.status !== "PENDING") return;
    if (pendingProfileSync.current) return;
    pendingProfileSync.current = true;
    void refreshUser();
  }, [user, refreshUser]);

  const fetchFeed = useCallback(async (cursorParam?: string) => {
    try {
      const query = cursorParam ? `?cursor=${cursorParam}&limit=20` : "?limit=20";
      return await api.get<FeedResponse>(`/feed${query}`);
    } catch {
      return { items: [], nextCursor: null, hasMore: false };
    }
  }, []);

  useEffect(() => {
    if (!isApproved) { setLoading(false); return; }
    fetchFeed().then((data) => {
      setPosts(data.items);
      setCursor(data.nextCursor);
      setLoading(false);
    });
  }, [isApproved, fetchFeed]);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    const data = await fetchFeed(cursor);
    setPosts((prev) => [...prev, ...data.items]);
    setCursor(data.nextCursor);
    setLoadingMore(false);
  };

  const handlePostCreated = (post: Post) => setPosts((prev) => [post, ...prev]);
  const handleDelete = (id: string) => setPosts((prev) => prev.filter((p) => p.id !== id));

  if (!user) {
    if (loading) {
      return (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-neon" />
        </div>
      );
    }
    return null;
  }

  if (user.status === "PENDING") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-app bg-gradient-to-br from-neon/15 to-amber-600/15 ring-1 ring-app-border shadow-app">
          <Rocket className="h-9 w-9 text-neon" />
        </div>
        <h1 className="mb-2 text-[22px] font-bold text-app-fg">Welcome to LockedIn</h1>
        <p className="mb-8 max-w-sm text-[15px] leading-relaxed text-app-fg-muted">
          Submit your application to get verified and unlock full access to the network.
        </p>
        <Button asChild size="lg" className="rounded-full px-8">
          <Link href="/apply"><Sparkles className="mr-2 h-4 w-4" /> Submit Application</Link>
        </Button>
      </div>
    );
  }

  if (user.status === "REJECTED") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h1 className="mb-2 text-[22px] font-bold text-app-fg">Application Not Approved</h1>
        <p className="mb-8 max-w-sm text-[15px] text-app-fg-muted">
          You can submit an appeal for manual review.
        </p>
        <Button variant="outline" asChild className="rounded-full"><Link href="/apply">View Application</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <CreatePost onCreated={handlePostCreated} />

      {loading ? (
        <FeedSkeleton />
      ) : posts.length === 0 ? (
        <div className="post-card px-6 py-16 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-neon/15 to-blue-500/15">
            <PenLine className="h-7 w-7 text-neon" />
          </div>
          <h2 className="mb-2 text-[17px] font-bold text-app-fg">Your feed is empty</h2>
          <p className="mx-auto max-w-[280px] text-[14px] leading-relaxed text-app-fg-muted">
            Follow builders and join communities to see their posts here.
          </p>
          <Button variant="outline" size="sm" asChild className="mt-5 rounded-full">
            <Link href="/communities">Explore Communities</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-5">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onDelete={handleDelete} />
            ))}
          </div>
          {cursor && (
            <div className="flex justify-center pb-8">
              <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore} className="rounded-full">
                {loadingMore ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
