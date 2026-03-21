"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Github, Loader2, UserPlus, UserMinus, Calendar } from "lucide-react";
import Link from "next/link";
import { api, type Profile, type Post } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PostCard } from "@/components/app/post-card";
import { FeedSkeleton } from "@/components/app/feed-skeleton";
import { BuilderProgressCard } from "@/components/app/builder-progress-card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";

export default function ProfilePage() {
  const params = useParams();
  const { user } = useAuth();
  const username = params.username as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [toggling, setToggling] = useState(false);

  const isMe = user?.username === username;
  useEffect(() => {
    let cancelled = false;
    setProfile(null);
    setFollowing(false);
    setPosts([]);
    setProfileLoading(true);
    setPostsLoading(true);

    api
      .get<Profile>(`/profiles/${username}`)
      .then((p) => {
        if (!cancelled) {
          setProfile(p);
          setFollowing(p.isFollowing ?? false);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    void (async () => {
      try {
        const data = await api.get<Post[]>(`/posts?author=${username}`);
        if (!cancelled) setPosts(Array.isArray(data) ? data : []);
      } catch {
        try {
          const data = await api.get<{ items: Post[] }>(`/feed?author=${username}`);
          if (!cancelled) setPosts(data.items || []);
        } catch {
          if (!cancelled) setPosts([]);
        }
      } finally {
        if (!cancelled) setPostsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [username]);

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
    } catch {
      /* ignore */
    }
    setToggling(false);
  };

  if (!profileLoading && !profile) {
    return (
      <div className="min-h-[40vh] bg-app-bg px-4 py-20 text-center">
        <p className="text-app-fg-muted">User not found</p>
        <Link
          href="/feed"
          className="mt-4 inline-flex items-center gap-1.5 text-[15px] text-app-fg-secondary transition-colors hover:text-app-fg"
        >
          <ArrowLeft className="h-4 w-4" /> Back to feed
        </Link>
      </div>
    );
  }

  if (profileLoading || !profile) {
    return (
      <div className="min-h-screen bg-app-bg">
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
          <Link
            href="/feed"
            className="inline-flex items-center gap-2 text-[14px] text-app-fg-muted transition-colors hover:text-app-fg"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="app-panel animate-pulse p-6 sm:p-8" aria-hidden>
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
              <div className="h-20 w-20 flex-shrink-0 rounded-full bg-app-surface-2" />
              <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
                <div className="mx-auto h-6 w-48 rounded bg-app-surface-2 sm:mx-0" />
                <div className="mx-auto h-4 w-32 rounded bg-app-surface-2/70 sm:mx-0" />
                <div className="mx-auto h-4 w-full max-w-md rounded bg-app-surface-2/50 sm:mx-0" />
              </div>
            </div>
          </div>
          <FeedSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg">
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        {/* Back link */}
        <Link
          href="/feed"
          prefetch
          className="inline-flex items-center gap-2 text-[14px] text-app-fg-muted transition-colors hover:text-app-fg"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        {/* Profile header card */}
        <div className="app-panel p-6 sm:p-8">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            {/* Avatar */}
            <UserAvatar
              avatarUrl={profile.avatarUrl}
              displayName={profile.displayName}
              username={profile.username}
              size="xl"
            />

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h1 className="text-xl font-bold text-app-fg">{profile.displayName}</h1>
                {profile.builder && (
                  <span className="rounded-full bg-[color-mix(in_srgb,var(--app-accent-soft)_40%,transparent)] px-2.5 py-0.5 text-[11px] font-bold text-[#f0d9a8]">
                    Lvl {profile.builder.level}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[15px] text-app-fg-muted">@{profile.username}</p>

              {profile.bio && (
                <p className="mt-4 text-[15px] leading-relaxed text-app-fg-secondary">{profile.bio}</p>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-center gap-6 sm:justify-start">
                <span className="text-[14px] text-app-fg-muted">
                  <strong className="font-semibold text-app-fg">{profile.postsCount}</strong> posts
                </span>
                <span className="text-[14px] text-app-fg-muted">
                  <strong className="font-semibold text-app-fg">{profile.followingCount}</strong> following
                </span>
                <span className="text-[14px] text-app-fg-muted">
                  <strong className="font-semibold text-app-fg">{profile.followersCount}</strong> followers
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[13px] text-app-fg-muted sm:justify-start">
                {profile.githubUsername && (
                  <a
                    href={`https://github.com/${profile.githubUsername}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 transition-colors hover:text-app-fg"
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

            <div className="flex-shrink-0">
              {!isMe ? (
                <Button
                  variant={following ? "outline" : "default"}
                  size="sm"
                  onClick={toggleFollow}
                  disabled={toggling}
                  className="rounded-full"
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
                <Button variant="outline" size="sm" asChild className="rounded-full">
                  <Link href="/settings" prefetch>
                    Edit Profile
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {profile.builder && <BuilderProgressCard progress={profile.builder} />}

        {/* Posts section */}
        <div>
          <h2 className="mb-4 text-[15px] font-semibold text-app-fg">Posts</h2>

          {postsLoading && posts.length === 0 ? (
            <FeedSkeleton />
          ) : posts.length === 0 ? (
            <div className="app-panel py-16 text-center">
              <p className="text-[15px] text-app-fg-muted">No posts yet.</p>
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
