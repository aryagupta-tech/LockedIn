"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Heart, Loader2, MessageCircle, Trash2, Share2, Bookmark } from "lucide-react";
import Link from "next/link";
import { api, type Post, type Comment } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";
import { formatPostAbsoluteDateTime, formatRelativeTime } from "@/lib/utc-time";

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [postLoading, setPostLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [saved, setSaved] = useState(false);

  const postId = params.id as string;

  useEffect(() => {
    let cancelled = false;
    setPost(null);
    setComments([]);
    setPostLoading(true);
    setCommentsLoading(true);

    api
      .get<Post>(`/posts/${postId}`)
      .then((p) => {
        if (cancelled) return;
        setPost(p);
        setLiked(p.hasLiked ?? false);
        setLikes(p.likesCount);
        setSaved(p.hasBookmarked ?? false);
      })
      .catch(() => {
        if (!cancelled) setPost(null);
      })
      .finally(() => {
        if (!cancelled) setPostLoading(false);
      });

    api
      .get<Comment[]>(`/posts/${postId}/comments?limit=50`)
      .then((c) => {
        if (!cancelled) setComments(Array.isArray(c) ? c : []);
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      })
      .finally(() => {
        if (!cancelled) setCommentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [postId]);

  useEffect(() => {
    if (!post || postLoading) return;
    if (typeof window === "undefined" || window.location.hash !== "#comment") return;
    const id = requestAnimationFrame(() => {
      document.getElementById("comment")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(id);
  }, [post, postLoading]);

  const toggleLike = () => {
    if (!post || !user) return;
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

  const toggleBookmark = () => {
    if (!post || !user) return;
    const next = !saved;
    setSaved(next);
    void (async () => {
      try {
        if (next) await api.post(`/posts/${post.id}/bookmark`);
        else await api.del(`/posts/${post.id}/bookmark`);
      } catch {
        setSaved(!next);
      }
    })();
  };

  const handleComment = async () => {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const c = await api.post<Comment>(`/posts/${postId}/comments`, {
        content: commentText.trim(),
        ...(replyTo ? { parentId: replyTo } : {}),
      });
      setComments((prev) => [c, ...prev]);
      setCommentText("");
      setReplyTo(null);
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!post) return;
    try {
      await api.del(`/posts/${post.id}`);
      router.push("/feed");
    } catch { /* ignore */ }
  };

  if (!postLoading && !post) {
    return (
      <div>
        <div className="flex items-center gap-4 border-b border-white/[0.06] pb-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-white">Post</h1>
        </div>
        <div className="py-20 text-center">
          <p className="text-zinc-400">Post not found</p>
          <Link href="/feed" className="mt-4 inline-block text-sm text-neon hover:underline">
            Back to feed
          </Link>
        </div>
      </div>
    );
  }

  if (postLoading || !post) {
    return (
      <div>
        <div className="flex items-center gap-4 border-b border-white/[0.06] pb-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-white">Post</h1>
        </div>
        <div className="animate-pulse space-y-4 px-1 py-6">
          <div className="flex gap-3">
            <div className="h-11 w-11 flex-shrink-0 rounded-full bg-white/[0.08]" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-4 w-40 rounded bg-white/[0.08]" />
              <div className="h-3 w-28 rounded bg-white/[0.06]" />
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <div className="h-4 w-full rounded bg-white/[0.07]" />
            <div className="h-4 w-[94%] rounded bg-white/[0.06]" />
            <div className="h-4 w-[78%] rounded bg-white/[0.05]" />
          </div>
        </div>
        <div
          id="comment"
          className="scroll-mt-24 border-t border-white/[0.06] px-1 py-4 text-center text-sm text-zinc-500"
        >
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-neon" />
        </div>
      </div>
    );
  }

  const isAuthor = user?.id === post.author.id;
  const topLevel = comments.filter((c) => !c.parentId);
  const repliesMap = comments.filter((c) => c.parentId);
  const postedAt = formatPostAbsoluteDateTime(post.createdAt);
  const views = post.viewsCount ?? 0;
  const postedRelative = formatRelativeTime(post.createdAt, { subMinuteLabel: "just now" });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-white/[0.06] pb-4">
        <button onClick={() => router.back()} className="rounded-full p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-white">Post</h1>
      </div>

      {/* Post */}
      <div className="border-b border-white/[0.06] px-1 py-4">
        <div className="flex items-start gap-3">
          <Link href={`/u/${post.author.username}`} className="flex-shrink-0">
            <UserAvatar
              avatarUrl={post.author.avatarUrl}
              displayName={post.author.displayName}
              username={post.author.username}
              size="lg"
              className="ring-1 ring-white/10"
            />
          </Link>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <Link href={`/u/${post.author.username}`} className="text-[15px] font-semibold text-white hover:underline">
                  {post.author.displayName}
                </Link>
                <p className="text-sm text-zinc-500">@{post.author.username}</p>
              </div>
              {isAuthor && (
                <button
                  type="button"
                  onClick={handleDelete}
                  aria-label="Delete post"
                  title="Delete post"
                  className="rounded-lg border border-red-500/35 bg-red-500/10 p-2 text-red-400 transition-colors hover:border-red-400/50 hover:bg-red-500/20 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {post.content ? (
          <p className="mt-4 whitespace-pre-wrap text-[17px] leading-relaxed text-zinc-100">{post.content}</p>
        ) : null}

        {post.imageUrl ? (
          <div className={cn("overflow-hidden rounded-xl border border-white/[0.08]", post.content ? "mt-4" : "mt-2")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.imageUrl} alt="" className="max-h-[480px] w-full object-contain bg-black/20" />
          </div>
        ) : null}

        {post.codeSnippet && (
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0d1117] p-4">
            {post.codeLanguage && (
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{post.codeLanguage}</p>
            )}
            <pre className="text-[13px] leading-relaxed text-zinc-300"><code>{post.codeSnippet}</code></pre>
          </div>
        )}

        {postedAt ? (
          <p className="mt-4 text-sm text-zinc-500">
            <span className="text-zinc-400">{postedAt.date}</span>
            {" · "}
            <span>{postedAt.time}</span>
            {" · "}
            <span className="text-zinc-500">
              {postedRelative === "just now" ? postedRelative : `${postedRelative} ago`}
            </span>
          </p>
        ) : null}

        {/* Stats bar */}
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-white/[0.06] pt-3 text-[14px]">
          <span className="text-zinc-400"><strong className="font-semibold text-white">{likes}</strong> Likes</span>
          <span className="text-zinc-400">
            <strong className="font-semibold text-white">
              {commentsLoading ? "…" : comments.length}
            </strong>{" "}
            Comments
          </span>
          <span className="text-zinc-400">
            <strong className="font-semibold text-white">{views}</strong> Views
          </span>
        </div>

        {/* Action buttons */}
        <div className="mt-1 flex items-center justify-around border-t border-white/[0.06] pt-1">
          <button
            type="button"
            onClick={toggleLike}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-[14px] transition-colors",
              liked ? "text-red-400" : "text-zinc-500 hover:text-red-400"
            )}
          >
            <Heart className={cn("h-5 w-5", liked && "fill-red-400")} />
          </button>
          <a
            href="#comment"
            className="flex items-center gap-2 rounded-full px-4 py-2 text-[14px] text-zinc-500 transition-colors hover:text-blue-400"
          >
            <MessageCircle className="h-5 w-5" />
          </a>
          <button
            type="button"
            className="flex items-center gap-2 rounded-full px-4 py-2 text-[14px] text-zinc-500 transition-colors hover:text-green-400"
          >
            <Share2 className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={toggleBookmark}
            title={saved ? "Remove bookmark" : "Save post"}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-[14px] transition-colors",
              saved ? "text-neon" : "text-zinc-500 hover:text-neon",
            )}
          >
            <Bookmark className={cn("h-5 w-5", saved && "fill-neon")} />
          </button>
        </div>
      </div>

      {/* Comment input */}
      <div id="comment" className="scroll-mt-24 border-b border-white/[0.06] px-1 py-3">
        {replyTo && (
          <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500">
            <span>Replying to comment</span>
            <button onClick={() => setReplyTo(null)} className="text-neon hover:underline">Cancel</button>
          </div>
        )}
        <div className="flex items-center gap-3">
          {user ? (
            <UserAvatar
              avatarUrl={user.avatarUrl}
              displayName={user.displayName}
              username={user.username}
              size="sm"
              className="ring-1 ring-white/10"
            />
          ) : (
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-500">
              ?
            </div>
          )}
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleComment()}
            placeholder="Post your reply"
            className="flex-1 bg-transparent text-[15px] text-white placeholder-zinc-600 outline-none"
          />
          <Button size="sm" onClick={handleComment} disabled={!commentText.trim() || submitting} className="rounded-full px-4">
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Reply"}
          </Button>
        </div>
      </div>

      {/* Comments */}
      {topLevel.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          replies={repliesMap.filter((r) => r.parentId === comment.id)}
          onReply={(id) => setReplyTo(id)}
        />
      ))}
      {commentsLoading && comments.length === 0 && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
        </div>
      )}
      {!commentsLoading && comments.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-[15px] text-zinc-500">No comments yet. Be the first to reply!</p>
        </div>
      )}
    </div>
  );
}

function CommentItem({ comment, replies, onReply }: { comment: Comment; replies: Comment[]; onReply: (id: string) => void }) {
  return (
    <div className="border-b border-white/[0.06] px-1 py-3">
      <div className="flex gap-3">
        <Link href={`/u/${comment.author.username}`} className="flex-shrink-0">
          <UserAvatar
            avatarUrl={comment.author.avatarUrl}
            displayName={comment.author.displayName}
            username={comment.author.username}
            size="sm"
            className="ring-1 ring-white/[0.08]"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link href={`/u/${comment.author.username}`} className="text-[14px] font-semibold text-white hover:underline">
              {comment.author.displayName}
            </Link>
            <span className="text-sm text-zinc-500">@{comment.author.username}</span>
            <span className="text-zinc-600">&middot;</span>
            <span className="text-sm text-zinc-500">
              {formatRelativeTime(comment.createdAt, { subMinuteLabel: "just now" })}
            </span>
          </div>
          <p className="mt-0.5 text-[15px] text-zinc-200">{comment.content}</p>
          <button onClick={() => onReply(comment.id)} className="mt-1.5 text-[13px] text-zinc-500 hover:text-neon">
            Reply
          </button>
        </div>
      </div>

      {replies.length > 0 && (
        <div className="ml-12 mt-2 space-y-0 border-l-2 border-white/[0.06]">
          {replies.map((r) => (
            <div key={r.id} className="flex gap-2 py-2.5 pl-4">
              <Link href={`/u/${r.author.username}`} className="mt-0.5 flex-shrink-0">
                <UserAvatar
                  avatarUrl={r.author.avatarUrl}
                  displayName={r.author.displayName}
                  username={r.author.username}
                  size="xs"
                  className="ring-1 ring-white/[0.08]"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Link href={`/u/${r.author.username}`} className="text-[13px] font-semibold text-white hover:underline">
                    {r.author.displayName}
                  </Link>
                  <span className="text-xs text-zinc-500">
                    {formatRelativeTime(r.createdAt, { subMinuteLabel: "just now" })}
                  </span>
                </div>
                <p className="mt-0.5 text-[14px] text-zinc-300">{r.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
