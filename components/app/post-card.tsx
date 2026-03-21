"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Trash2 } from "lucide-react";
import { api, type Post } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
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

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

export function PostCard({ post, onDelete }: { post: Post; onDelete?: (id: string) => void }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.hasLiked ?? false);
  const [likes, setLikes] = useState(post.likesCount);
  const [toggling, setToggling] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isAuthor = user?.id === post.author.id;
  const avatarColor = getAvatarColor(post.author.username);

  const toggleLike = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      if (liked) {
        await api.del(`/posts/${post.id}/like`);
        setLiked(false);
        setLikes((c) => c - 1);
      } else {
        await api.post(`/posts/${post.id}/like`);
        setLiked(true);
        setLikes((c) => c + 1);
      }
    } catch { /* ignore */ }
    setToggling(false);
  };

  const handleDelete = async () => {
    try {
      await api.del(`/posts/${post.id}`);
      onDelete?.(post.id);
    } catch { /* ignore */ }
    setShowMenu(false);
  };

  return (
    <div className="post-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <Link href={`/u/${post.author.username}`} className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-[13px] font-bold text-white",
              avatarColor,
            )}
          >
            {post.author.avatarUrl ? (
              <img src={post.author.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              post.author.displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p className="text-[14px] font-semibold text-app-fg">{post.author.displayName}</p>
            <p className="text-[12px] text-app-fg-muted">@{post.author.username}</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-[12px] text-app-fg-muted">{timeAgo(post.createdAt)}</span>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded-full p-1.5 text-app-fg-muted transition-colors hover:text-app-fg"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {showMenu && isAuthor && (
              <div className="absolute right-0 top-8 z-10 rounded-xl border border-app-border bg-app-surface py-1 shadow-lg">
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 text-[13px] text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <Link href={`/post/${post.id}`} className="block px-4 pb-3">
        {post.content ? (
          <p className="whitespace-pre-wrap text-[15px] leading-[1.65] text-app-fg-secondary">
            {post.content}
          </p>
        ) : null}
        {post.imageUrl ? (
          <div className={cn(post.content ? "mt-3" : "", "overflow-hidden rounded-xl border border-app-border")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.imageUrl}
              alt=""
              className="max-h-96 w-full object-cover"
              loading="lazy"
            />
          </div>
        ) : null}
      </Link>

      {/* Code block */}
      {post.codeSnippet && (
        <div className="mx-4 mb-3 overflow-hidden rounded-xl border border-app-border">
          {post.codeLanguage && (
            <div className="border-b border-app-border bg-app-code px-4 py-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-app-fg-muted">
                {post.codeLanguage}
              </span>
            </div>
          )}
          <div className="overflow-x-auto bg-app-code p-4">
            <pre className="text-[13px] leading-relaxed text-app-fg-secondary">
              <code>{post.codeSnippet}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-app-border px-4 py-2">
        <div className="flex items-center gap-4">
          <button onClick={toggleLike} className="group flex items-center gap-1.5 transition-colors">
            <Heart
              className={cn(
                "h-[20px] w-[20px] transition-all",
                liked ? "scale-110 fill-red-500 text-red-500" : "text-app-fg-muted group-hover:text-red-400",
              )}
            />
            {likes > 0 && (
              <span className={cn("text-[13px]", liked ? "text-red-400" : "text-app-fg-muted")}>
                {formatCount(likes)}
              </span>
            )}
          </button>

          <Link
            href={`/post/${post.id}`}
            className="group flex items-center gap-1.5 text-app-fg-muted transition-colors hover:text-blue-400"
          >
            <MessageCircle className="h-[20px] w-[20px] transition-colors group-hover:text-blue-400" />
            {post.commentsCount > 0 && <span className="text-[13px]">{formatCount(post.commentsCount)}</span>}
          </Link>

          <button className="text-app-fg-muted transition-colors hover:text-emerald-400">
            <Share2 className="h-[18px] w-[18px]" />
          </button>
        </div>

        <button onClick={() => setSaved(!saved)} className="transition-colors">
          <Bookmark
            className={cn(
              "h-[20px] w-[20px]",
              saved ? "fill-neon text-neon" : "text-app-fg-muted hover:text-neon",
            )}
          />
        </button>
      </div>
    </div>
  );
}
