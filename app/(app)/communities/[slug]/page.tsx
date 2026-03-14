"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Lock, Globe, UserPlus, Users2 } from "lucide-react";
import { api, type Community, type Post } from "@/lib/api";
import { PostCard } from "@/components/app/post-card";
import { CreatePost } from "@/components/app/create-post";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
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
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

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

  useEffect(() => {
    fetchCommunity();
  }, [fetchCommunity]);

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
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#888]" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="rounded-2xl border border-[#222] bg-[#111] px-8 py-20 text-center">
        <p className="text-[15px] text-[#e4e4e4]">Community not found</p>
        <Link
          href="/communities"
          className="mt-4 inline-block text-[14px] text-[#888] hover:text-white hover:underline"
        >
          Browse communities
        </Link>
      </div>
    );
  }

  const avatarColor = getColor(community.name);

  return (
    <div className="min-h-screen bg-[#000]">
      {/* Back link */}
      <Link
        href="/communities"
        className="mb-6 inline-flex items-center gap-2 text-[14px] text-[#888] transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Communities
      </Link>

      {/* Header card */}
      <div className="mb-8 rounded-2xl border border-[#222] bg-[#111] overflow-hidden">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-r from-purple-600/40 via-blue-600/30 to-cyan-600/40" />

        <div className="px-6 pb-6">
          <div className="-mt-12 flex items-end justify-between">
            <div
              className={cn(
                "flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#111] bg-gradient-to-br text-2xl font-bold text-white shadow-lg",
                avatarColor
              )}
            >
              {community.name.charAt(0).toUpperCase()}
            </div>
            <Button
              onClick={handleJoin}
              disabled={joining || !!joinStatus}
              className="rounded-full"
              size="sm"
              variant={joinStatus ? "outline" : "default"}
            >
              {joinStatus === "APPROVED" ? (
                "Joined"
              ) : joinStatus === "PENDING" ? (
                "Pending"
              ) : (
                <>
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Join
                </>
              )}
            </Button>
          </div>

          <h1 className="mt-4 text-2xl font-bold text-white">{community.name}</h1>
          <div className="mt-2 flex items-center gap-3 text-[14px] text-[#888]">
            {community.isPrivate ? (
              <>
                <Lock className="h-4 w-4" /> Private
              </>
            ) : (
              <>
                <Globe className="h-4 w-4" /> Public
              </>
            )}
            <span className="text-[#555]">·</span>
            <span className="flex items-center gap-1">
              <Users2 className="h-4 w-4" />
              {community.memberCount} members
            </span>
          </div>
          {community.description && (
            <p className="mt-3 text-[15px] leading-relaxed text-[#e4e4e4]">
              {community.description}
            </p>
          )}
        </div>
      </div>

      <CreatePost communityId={community.id} onCreated={handlePostCreated} />

      {posts.length === 0 ? (
        <div className="post-card px-8 py-16 text-center">
          <p className="text-[15px] text-[#888]">
            No posts in this community yet. Be the first!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
