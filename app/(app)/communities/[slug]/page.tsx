"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Lock, Globe, UserPlus, Users2 } from "lucide-react";
import { api, type Community, type Post } from "@/lib/api";
import { PostCard } from "@/components/app/post-card";
import { CreatePost } from "@/components/app/create-post";
import { Button } from "@/components/ui/button";

export default function CommunityDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joinStatus, setJoinStatus] = useState<string | null>(null);

  const fetchCommunity = useCallback(async () => {
    try {
      const c = await api.get<Community>(`/communities/${slug}`);
      setCommunity(c);
    } catch { /* ignore */ }
    setLoading(false);
  }, [slug]);

  useEffect(() => { fetchCommunity(); }, [fetchCommunity]);

  const handleJoin = async () => {
    if (!community || joining) return;
    setJoining(true);
    try {
      const result = await api.post<{ status: string }>(`/communities/${community.id}/join`);
      setJoinStatus(result.status || "PENDING");
    } catch { /* ignore */ }
    setJoining(false);
  };

  const handlePostCreated = (post: Post) => {
    setPosts((prev) => [post, ...prev]);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-neon" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="py-20 text-center">
        <p className="text-zinc-500">Community not found</p>
        <Link href="/communities" className="mt-4 inline-block text-sm text-neon">Browse communities</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/communities" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300">
        <ArrowLeft className="h-4 w-4" /> Communities
      </Link>

      <div className="rounded-2xl border border-white/[0.06] bg-surface/60 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-neon/20 to-purple-500/20 text-xl font-bold text-white">
              {community.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="font-[var(--font-geist)] text-xl font-semibold text-white">{community.name}</h1>
              <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                {community.isPrivate ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                <span>{community.isPrivate ? "Private" : "Public"}</span>
                <span className="flex items-center gap-1">
                  <Users2 className="h-3 w-3" /> {community.memberCount} members
                </span>
              </div>
            </div>
          </div>
          <Button size="sm" onClick={handleJoin} disabled={joining || !!joinStatus}>
            {joinStatus === "APPROVED" ? "Joined" : joinStatus === "PENDING" ? "Pending" : <><UserPlus className="mr-1.5 h-3.5 w-3.5" /> Join</>}
          </Button>
        </div>
        {community.description && (
          <p className="mt-4 text-sm text-zinc-400">{community.description}</p>
        )}
      </div>

      <CreatePost communityId={community.id} onCreated={handlePostCreated} />

      <div className="space-y-4">
        {posts.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-600">No posts in this community yet.</p>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  );
}
