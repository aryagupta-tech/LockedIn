"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Github, Loader2, UserPlus, UserMinus, Calendar } from "lucide-react";
import Link from "next/link";
import { api, type Profile, type Post } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PostCard } from "@/components/app/post-card";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const params = useParams();
  const { user } = useAuth();
  const username = params.username as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const posts: Post[] = [];
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [toggling, setToggling] = useState(false);

  const isMe = user?.username === username;

  const fetchProfile = useCallback(async () => {
    try {
      const p = await api.get<Profile>(`/profiles/${username}`);
      setProfile(p);
      setFollowing(p.isFollowing ?? false);
    } catch { /* ignore */ }
    setLoading(false);
  }, [username]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);


  const toggleFollow = async () => {
    if (!profile || toggling) return;
    setToggling(true);
    try {
      if (following) {
        await api.del(`/profiles/${profile.id}/follow`);
        setFollowing(false);
        setProfile((p) => p ? { ...p, followersCount: p.followersCount - 1 } : p);
      } else {
        await api.post(`/profiles/${profile.id}/follow`);
        setFollowing(true);
        setProfile((p) => p ? { ...p, followersCount: p.followersCount + 1 } : p);
      }
    } catch { /* ignore */ }
    setToggling(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-neon" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-20 text-center">
        <p className="text-zinc-500">User not found</p>
        <Link href="/feed" className="mt-4 inline-block text-sm text-neon">Back to feed</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/feed" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300">
        <ArrowLeft className="h-4 w-4" /> Feed
      </Link>

      {/* Profile header */}
      <div className="rounded-2xl border border-white/[0.06] bg-surface/60 p-6">
        <div className="flex items-start gap-5">
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-neon/20 to-blue-500/20 text-2xl font-bold text-white">
            {profile.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-[var(--font-geist)] text-xl font-semibold text-white">{profile.displayName}</h1>
                <p className="text-sm text-zinc-500">@{profile.username}</p>
              </div>
              {!isMe && (
                <Button variant={following ? "outline" : "default"} size="sm" onClick={toggleFollow} disabled={toggling}>
                  {following ? <><UserMinus className="mr-1.5 h-3.5 w-3.5" /> Unfollow</> : <><UserPlus className="mr-1.5 h-3.5 w-3.5" /> Follow</>}
                </Button>
              )}
              {isMe && (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/settings">Edit Profile</Link>
                </Button>
              )}
            </div>

            {profile.bio && <p className="mt-3 text-sm text-zinc-300">{profile.bio}</p>}

            <div className="mt-4 flex flex-wrap items-center gap-5 text-sm">
              <span className="text-zinc-400"><strong className="text-white">{profile.followersCount}</strong> followers</span>
              <span className="text-zinc-400"><strong className="text-white">{profile.followingCount}</strong> following</span>
              <span className="text-zinc-400"><strong className="text-white">{profile.postsCount}</strong> posts</span>
            </div>

            <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
              {profile.githubUsername && (
                <a href={`https://github.com/${profile.githubUsername}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-zinc-300">
                  <Github className="h-3 w-3" /> {profile.githubUsername}
                </a>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Joined {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* User posts placeholder */}
      <div>
        <h2 className="mb-4 text-sm font-medium text-zinc-400">Posts</h2>
        {posts.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-600">No posts yet.</p>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
