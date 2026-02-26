"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { api, type Post, type FeedResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PostCard } from "@/components/app/post-card";
import { CreatePost } from "@/components/app/create-post";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const isApproved = user?.status === "APPROVED";

  const fetchFeed = useCallback(async (cursorParam?: string) => {
    try {
      const query = cursorParam ? `?cursor=${cursorParam}&limit=20` : "?limit=20";
      const data = await api.get<FeedResponse>(`/feed${query}`);
      return data;
    } catch {
      return { items: [], nextCursor: null, hasMore: false };
    }
  }, []);

  useEffect(() => {
    if (!isApproved) {
      setLoading(false);
      return;
    }
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

  const handlePostCreated = (post: Post) => {
    setPosts((prev) => [post, ...prev]);
  };

  const handleDelete = (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  if (!user) return null;

  if (user.status === "PENDING") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-neon/10">
          <Sparkles className="h-8 w-8 text-neon" />
        </div>
        <h1 className="mb-3 font-[var(--font-geist)] text-2xl font-semibold text-white">Your account is pending</h1>
        <p className="mb-6 max-w-md text-sm text-zinc-400">
          Submit your application to get verified and unlock full access to LockedIn.
        </p>
        <Button asChild>
          <Link href="/apply">Submit Application</Link>
        </Button>
      </div>
    );
  }

  if (user.status === "REJECTED") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h1 className="mb-3 font-[var(--font-geist)] text-2xl font-semibold text-white">Application Not Approved</h1>
        <p className="mb-6 max-w-md text-sm text-zinc-400">
          Your application was not approved. You can submit an appeal for manual review.
        </p>
        <Button variant="outline" asChild>
          <Link href="/apply">View Application</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[var(--font-geist)] text-2xl font-semibold text-white">Feed</h1>
        <p className="mt-1 text-sm text-zinc-500">Posts from people and communities you follow</p>
      </div>

      <CreatePost onCreated={handlePostCreated} />

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-neon" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-surface/40 py-16 text-center">
          <p className="text-sm text-zinc-500">No posts yet. Follow people or join communities to see content here.</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onDelete={handleDelete} />
            ))}
          </div>
          {cursor && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
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
