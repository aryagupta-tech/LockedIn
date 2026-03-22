"use client";

import { useState, useEffect, type MouseEvent } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Share2, Bookmark, Trash2 } from "lucide-react";
import { api, type Post } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utc-time";
import { UserAvatar } from "@/components/ui/user-avatar";
import { sharePost } from "@/lib/share-post";

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

export function PostCard({
  post,
  onDelete,
  onBookmarkRemoved,
}: {
  post: Post;
  onDelete?: (id: string) => void;
  /** When set, unsaving removes this post from the current list (e.g. bookmarks view). */
  onBookmarkRemoved?: (id: string) => void;
}) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.hasLiked ?? false);
  const [likes, setLikes] = useState(post.likesCount);
  const [saved, setSaved] = useState(post.hasBookmarked ?? false);
  const [shareHint, setShareHint] = useState<string | null>(null);

  const isAuthor = user?.id === post.author.id;
  useEffect(() => {
    setLiked(post.hasLiked ?? false);
    setLikes(post.likesCount);
    setSaved(post.hasBookmarked ?? false);
  }, [post.id]);

  const toggleLike = () => {
    if (!user) return;
    const next = !liked;
    setLiked(next);
    setLikes((c) => Math.max(0, c + (next ? 1 : -1)));
    void (async () => {
      try {
        if (next) await api.post(`/posts/${post.id}/like`);
        else await api.del(`/posts/${post.id}/like`);
      } catch {
        setLiked(!next);
        setLikes((c) => Math.max(0, c + (next ? -1 : 1)));
      }
    })();
  };

  const toggleBookmark = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    const next = !saved;
    setSaved(next);
    void (async () => {
      try {
        if (next) await api.post(`/posts/${post.id}/bookmark`);
        else await api.del(`/posts/${post.id}/bookmark`);
        if (!next) onBookmarkRemoved?.(post.id);
      } catch {
        setSaved(!next);
      }
    })();
  };

  const handleShare = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await sharePost({
      postId: post.id,
      authorDisplayName: post.author.displayName,
      summary: post.content,
    });
    if (result === "copied") {
      setShareHint("Copied link");
      window.setTimeout(() => setShareHint(null), 2200);
    } else if (result === "failed") {
      window.alert("Could not share or copy this link. Try copying the address from your browser.");
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Delete this post? This cannot be undone.",
      )
    ) {
      return;
    }
    try {
      await api.del(`/posts/${post.id}`);
      onDelete?.(post.id);
    } catch { /* ignore */ }
  };

  return (
    <div className="post-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <Link href={`/u/${post.author.username}`} className="flex items-center gap-3">
          <UserAvatar
            avatarUrl={post.author.avatarUrl}
            displayName={post.author.displayName}
            username={post.author.username}
            size="md"
          />
          <div>
            <p className="text-[14px] font-semibold text-app-fg">{post.author.displayName}</p>
            <p className="text-[12px] text-app-fg-muted">@{post.author.username}</p>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[12px] text-app-fg-muted">{formatRelativeTime(post.createdAt)}</span>
          {isAuthor && (
            <button
              type="button"
              onClick={handleDelete}
              aria-label="Delete post"
              title="Delete post"
              className="rounded-full p-1.5 text-red-400 transition-colors hover:bg-red-500/15 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <Link href={`/post/${post.id}`} prefetch className="block px-4 pb-3">
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
            href={`/post/${post.id}#comment`}
            prefetch
            className="group flex items-center gap-1.5 text-app-fg-muted transition-colors hover:text-blue-400"
          >
            <MessageCircle className="h-[20px] w-[20px] transition-colors group-hover:text-blue-400" />
            {post.commentsCount > 0 && <span className="text-[13px]">{formatCount(post.commentsCount)}</span>}
          </Link>

          <button
            type="button"
            title={shareHint ?? "Share post"}
            aria-label="Share post"
            onClick={(e) => void handleShare(e)}
            className="text-app-fg-muted transition-colors hover:text-emerald-400"
          >
            {shareHint ? (
              <span className="text-[11px] font-medium text-emerald-400">{shareHint}</span>
            ) : (
              <Share2 className="h-[18px] w-[18px]" />
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={toggleBookmark}
          title={saved ? "Remove bookmark" : "Save post"}
          className="transition-colors"
        >
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
