"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Heart, Loader2, MessageCircle, Trash2, Share2 } from "lucide-react";
import Link from "next/link";
import { api, type Post, type Comment } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);

  const postId = params.id as string;

  const fetchPost = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([
        api.get<Post>(`/posts/${postId}`),
        api.get<Comment[]>(`/posts/${postId}/comments?limit=50`),
      ]);
      setPost(p);
      setLiked(p.hasLiked ?? false);
      setLikes(p.likesCount);
      setComments(Array.isArray(c) ? c : []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [postId]);

  useEffect(() => { fetchPost(); }, [fetchPost]);

  const toggleLike = async () => {
    if (!post) return;
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

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-neon" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="py-20 text-center">
        <p className="text-zinc-400">Post not found</p>
        <Link href="/feed" className="mt-4 inline-block text-sm text-neon hover:underline">Back to feed</Link>
      </div>
    );
  }

  const isAuthor = user?.id === post.author.id;
  const topLevel = comments.filter((c) => !c.parentId);
  const repliesMap = comments.filter((c) => c.parentId);

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
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-neon/25 to-blue-500/25 text-sm font-bold text-white ring-1 ring-white/[0.1]">
              {post.author.avatarUrl ? (
                <img src={post.author.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                post.author.displayName.charAt(0).toUpperCase()
              )}
            </div>
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
                <button onClick={handleDelete} className="rounded-lg p-1.5 text-zinc-600 hover:bg-red-500/10 hover:text-red-400">
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

        <p className="mt-4 text-sm text-zinc-500">
          {new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          {" · "}
          {new Date(post.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </p>

        {/* Stats bar */}
        <div className="mt-3 flex items-center gap-5 border-t border-white/[0.06] pt-3 text-[14px]">
          <span className="text-zinc-400"><strong className="font-semibold text-white">{likes}</strong> Likes</span>
          <span className="text-zinc-400"><strong className="font-semibold text-white">{comments.length}</strong> Comments</span>
        </div>

        {/* Action buttons */}
        <div className="mt-1 flex items-center justify-around border-t border-white/[0.06] pt-1">
          <button
            onClick={toggleLike}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-[14px] transition-colors",
              liked ? "text-red-400" : "text-zinc-500 hover:text-red-400"
            )}
          >
            <Heart className={cn("h-5 w-5", liked && "fill-red-400")} />
          </button>
          <button className="flex items-center gap-2 rounded-full px-4 py-2 text-[14px] text-zinc-500 hover:text-blue-400">
            <MessageCircle className="h-5 w-5" />
          </button>
          <button className="flex items-center gap-2 rounded-full px-4 py-2 text-[14px] text-zinc-500 hover:text-green-400">
            <Share2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Comment input */}
      <div className="border-b border-white/[0.06] px-1 py-3">
        {replyTo && (
          <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500">
            <span>Replying to comment</span>
            <button onClick={() => setReplyTo(null)} className="text-neon hover:underline">Cancel</button>
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neon/25 to-blue-500/25 text-xs font-bold text-white ring-1 ring-white/[0.1]">
            {user?.displayName?.charAt(0).toUpperCase() || "?"}
          </div>
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
      {comments.length === 0 && (
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
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-neon/20 to-blue-500/20 text-xs font-bold text-white ring-1 ring-white/[0.08]">
            {comment.author.displayName.charAt(0).toUpperCase()}
          </div>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link href={`/u/${comment.author.username}`} className="text-[14px] font-semibold text-white hover:underline">
              {comment.author.displayName}
            </Link>
            <span className="text-sm text-zinc-500">@{comment.author.username}</span>
            <span className="text-zinc-600">&middot;</span>
            <span className="text-sm text-zinc-500">{timeAgo(comment.createdAt)}</span>
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
            <div key={r.id} className="py-2.5 pl-4">
              <div className="flex items-center gap-1.5">
                <Link href={`/u/${r.author.username}`} className="text-[13px] font-semibold text-white hover:underline">
                  {r.author.displayName}
                </Link>
                <span className="text-xs text-zinc-500">{timeAgo(r.createdAt)}</span>
              </div>
              <p className="mt-0.5 text-[14px] text-zinc-300">{r.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
