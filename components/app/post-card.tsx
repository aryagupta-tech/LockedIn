"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Trash2 } from "lucide-react";
import { api, type Post } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function PostCard({ post, onDelete }: { post: Post; onDelete?: (id: string) => void }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.hasLiked ?? false);
  const [likes, setLikes] = useState(post.likesCount);
  const [toggling, setToggling] = useState(false);

  const isAuthor = user?.id === post.author.id;

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
  };

  return (
    <article className="rounded-2xl border border-white/[0.06] bg-surface/60 p-5 transition-all hover:border-white/[0.1]">
      <div className="mb-3 flex items-start justify-between">
        <Link href={`/u/${post.author.username}`} className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-neon/20 to-blue-500/20 text-sm font-bold text-white">
            {post.author.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{post.author.displayName}</p>
            <p className="text-xs text-zinc-500">@{post.author.username} &middot; {timeAgo(post.createdAt)}</p>
          </div>
        </Link>
        {isAuthor && (
          <button onClick={handleDelete} className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-white/[0.04] hover:text-red-400">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <Link href={`/post/${post.id}`}>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">{post.content}</p>
      </Link>

      {post.codeSnippet && (
        <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.06] bg-[#0a0e1a] p-4">
          {post.codeLanguage && (
            <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-zinc-600">{post.codeLanguage}</p>
          )}
          <pre className="text-xs text-zinc-300">
            <code>{post.codeSnippet}</code>
          </pre>
        </div>
      )}

      <div className="mt-4 flex items-center gap-5">
        <button onClick={toggleLike} className="flex items-center gap-1.5 text-xs transition-colors">
          <Heart className={cn("h-4 w-4", liked ? "fill-red-400 text-red-400" : "text-zinc-500 hover:text-red-400")} />
          <span className={liked ? "text-red-400" : "text-zinc-500"}>{likes}</span>
        </button>
        <Link href={`/post/${post.id}`} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300">
          <MessageCircle className="h-4 w-4" />
          <span>{post.commentsCount}</span>
        </Link>
      </div>
    </article>
  );
}
