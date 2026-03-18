"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Github, Loader2, UserPlus, UserMinus, Calendar } from "lucide-react";
import Link from "next/link";
import { api, type Profile, type Post } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PostCard } from "@/components/app/post-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  "from-violet-500 to-fuchsia-500",
  "from-blue-500 to-cyan-400",
  "from-orange-500 to-rose-500",
  "from-emerald-500 to-teal-400",
  "from-pink-500 to-rose-400",
  "from-amber-500 to-orange-400",
  "from-indigo-500 to-blue-400",
  "from-teal-500 to-emerald-400",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function ProfilePage() {
  const params = useParams();
  const { user } = useAuth();
  const username = params.username as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [toggling, setToggling] = useState(false);

  const isMe = user?.username === username;
  const avatarColor = username ? getAvatarColor(username) : AVATAR_COLORS[0];

  const fetchProfile = useCallback(async () => {
    try {
      const p = await api.get<Profile>(`/profiles/${username}`);
      setProfile(p);
      setFollowing(p.isFollowing ?? false);
    } catch { /* ignore */ }
    setLoading(false);
  }, [username]);

  const fetchPosts = useCallback(async () => {
    try {
      const data = await api.get<Post[]>(`/posts?author=${username}`);
      setPosts(data);
    } catch {
      // Fallback: try feed-style response
      try {
        const data = await api.get<{ items: Post[] }>(`/feed?author=${username}`);
        setPosts(data.items || []);
      } catch { /* ignore */ }
    }
  }, [username]);

  useEffect(() => {
    fetchProfile();
    fetchPosts();
  }, [fetchProfile, fetchPosts]);

  const toggleFollow = async () => {
    if (!profile || toggling) return;
    setToggling(true);
    try {
      if (following) {
        await api.del(`/profiles/${profile.id}/follow`);
        setFollowing(false);
        setProfile((p) => (p ? { ...p, followersCount: p.followersCount - 1 } : p));
      } else {
        await api.post(`/profiles/${profile.id}/follow`);
        setFollowing(true);
        setProfile((p) => (p ? { ...p, followersCount: p.followersCount + 1 } : p));
      }
    } catch { /* ignore */ }
    setToggling(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-[#000]">
        <Loader2 className="h-6 w-6 animate-spin text-[#888]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[40vh] bg-[#000] px-4 py-20 text-center">
        <p className="text-[#888]">User not found</p>
        <Link
          href="/feed"
          className="mt-4 inline-flex items-center gap-1.5 text-[15px] text-[#e4e4e4] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to feed
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000]">
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        {/* Back link */}
        <Link
          href="/feed"
          className="inline-flex items-center gap-2 text-[14px] text-[#666] transition-colors hover:text-[#888]"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        {/* Profile header card */}
        <div className="rounded-2xl border border-[#222] bg-[#111] p-6 sm:p-8">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div
              className={cn(
                "flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-2xl font-bold text-white",
                avatarColor,
              )}
            >
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                profile.displayName.charAt(0).toUpperCase()
              )}
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h1 className="text-xl font-bold text-white">{profile.displayName}</h1>
              <p className="mt-0.5 text-[15px] text-[#888]">@{profile.username}</p>

              {/* Bio */}
              {profile.bio && (
                <p className="mt-4 text-[15px] leading-relaxed text-[#e4e4e4]">{profile.bio}</p>
              )}

              {/* Stats */}
              <div className="mt-4 flex items-center justify-center gap-6 sm:justify-start">
                <span className="text-[14px] text-[#888]">
                  <strong className="font-semibold text-white">{profile.followingCount}</strong>{" "}
                  following
                </span>
                <span className="text-[14px] text-[#888]">
                  <strong className="font-semibold text-white">{profile.followersCount}</strong>{" "}
                  followers
                </span>
              </div>

              {/* Meta row */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[13px] text-[#666] sm:justify-start">
                {profile.githubUsername && (
                  <a
                    href={`https://github.com/${profile.githubUsername}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-[#666] transition-colors hover:text-[#888]"
                  >
                    <Github className="h-3.5 w-3.5" /> {profile.githubUsername}
                  </a>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Joined{" "}
                  {new Date(profile.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            {/* Follow / Edit button */}
            <div className="flex-shrink-0">
              {!isMe ? (
                <Button
                  variant={following ? "outline" : "default"}
                  size="sm"
                  onClick={toggleFollow}
                  disabled={toggling}
                  className="rounded-full border-[#333] bg-white text-black hover:bg-zinc-200"
                >
                  {toggling ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : following ? (
                    <>
                      <UserMinus className="mr-1.5 h-3.5 w-3.5" /> Unfollow
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Follow
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="rounded-full border-[#333] text-[#e4e4e4] hover:bg-[#1a1a1a] hover:text-white"
                >
                  <Link href="/settings">Edit Profile</Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Posts section */}
        <div>
          <h2 className="mb-4 text-[15px] font-semibold text-white">Posts</h2>

          {posts.length === 0 ? (
            <div className="rounded-2xl border border-[#222] bg-[#111] py-16 text-center">
              <p className="text-[15px] text-[#666]">No posts yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
