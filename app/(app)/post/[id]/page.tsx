"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Heart, Loader2, MessageCircle, Send, Trash2 } from "lucide-react";
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
        <p className="text-zinc-500">Post not found</p>
        <Link href="/feed" className="mt-4 inline-block text-sm text-neon">Back to feed</Link>
      </div>
    );
  }

  const isAuthor = user?.id === post.author.id;

  const topLevel = comments.filter((c) => !c.parentId);
  const replies = comments.filter((c) => c.parentId);

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <article className="rounded-2xl border border-white/[0.06] bg-surface/60 p-6">
        <div className="mb-4 flex items-start justify-between">
          <Link href={`/u/${post.author.username}`} className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-neon/20 to-blue-500/20 text-sm font-bold text-white">
              {post.author.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-white">{post.author.displayName}</p>
              <p className="text-xs text-zinc-500">@{post.author.username} &middot; {timeAgo(post.createdAt)}</p>
            </div>
          </Link>
          {isAuthor && (
            <button onClick={handleDelete} className="rounded-lg p-1.5 text-zinc-600 hover:bg-white/[0.04] hover:text-red-400">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-200">{post.content}</p>

        {post.codeSnippet && (
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.06] bg-[#0a0e1a] p-4">
            {post.codeLanguage && (
              <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-zinc-600">{post.codeLanguage}</p>
            )}
            <pre className="text-xs text-zinc-300"><code>{post.codeSnippet}</code></pre>
          </div>
        )}

        <div className="mt-5 flex items-center gap-5 border-t border-white/[0.06] pt-4">
          <button onClick={toggleLike} className="flex items-center gap-1.5 text-sm">
            <Heart className={cn("h-4 w-4", liked ? "fill-red-400 text-red-400" : "text-zinc-500 hover:text-red-400")} />
            <span className={liked ? "text-red-400" : "text-zinc-500"}>{likes}</span>
          </button>
          <div className="flex items-center gap-1.5 text-sm text-zinc-500">
            <MessageCircle className="h-4 w-4" />
            <span>{comments.length}</span>
          </div>
        </div>
      </article>

      {/* Comment input */}
      <div className="rounded-2xl border border-white/[0.06] bg-surface/60 p-4">
        {replyTo && (
          <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500">
            <span>Replying to comment</span>
            <button onClick={() => setReplyTo(null)} className="text-neon hover:underline">Cancel</button>
          </div>
        )}
        <div className="flex gap-3">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            rows={2}
            className="flex-1 resize-none bg-transparent text-sm text-zinc-200 placeholder-zinc-600 outline-none"
          />
          <Button size="sm" onClick={handleComment} disabled={!commentText.trim() || submitting}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Comments */}
      <div className="space-y-3">
        {topLevel.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            replies={replies.filter((r) => r.parentId === comment.id)}
            onReply={(id) => { setReplyTo(id); }}
          />
        ))}
        {comments.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-600">No comments yet. Be the first!</p>
        )}
      </div>
    </div>
  );
}

function CommentItem({ comment, replies, onReply }: { comment: Comment; replies: Comment[]; onReply: (id: string) => void }) {
  return (
    <div className="rounded-xl border border-white/[0.04] bg-surface/40 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Link href={`/u/${comment.author.username}`} className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-neon/15 to-blue-500/15 text-[10px] font-bold text-white">
            {comment.author.displayName.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-medium text-white">{comment.author.displayName}</span>
        </Link>
        <span className="text-[10px] text-zinc-600">{timeAgo(comment.createdAt)}</span>
      </div>
      <p className="text-sm text-zinc-300">{comment.content}</p>
      <button onClick={() => onReply(comment.id)} className="mt-2 text-[11px] text-zinc-600 hover:text-neon">
        Reply
      </button>

      {replies.length > 0 && (
        <div className="ml-6 mt-3 space-y-2 border-l border-white/[0.04] pl-4">
          {replies.map((r) => (
            <div key={r.id} className="rounded-lg bg-surface/30 p-3">
              <div className="mb-1 flex items-center gap-2">
                <Link href={`/u/${r.author.username}`} className="text-xs font-medium text-white">{r.author.displayName}</Link>
                <span className="text-[10px] text-zinc-600">{timeAgo(r.createdAt)}</span>
              </div>
              <p className="text-xs text-zinc-400">{r.content}</p>
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
