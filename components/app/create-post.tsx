"use client";

import { useState } from "react";
import { Code2, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type Post } from "@/lib/api";
import { cn } from "@/lib/utils";

export function CreatePost({ communityId, onCreated }: { communityId?: string; onCreated: (post: Post) => void }) {
  const [content, setContent] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [codeSnippet, setCodeSnippet] = useState("");
  const [codeLanguage, setCodeLanguage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || loading) return;
    setLoading(true);
    try {
      const post = await api.post<Post>("/posts", {
        content: content.trim(),
        ...(showCode && codeSnippet.trim() ? { codeSnippet: codeSnippet.trim(), codeLanguage: codeLanguage || undefined } : {}),
        ...(communityId ? { communityId } : {}),
      });
      onCreated(post);
      setContent("");
      setCodeSnippet("");
      setCodeLanguage("");
      setShowCode(false);
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-surface/60 p-5">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share what you're building..."
        rows={3}
        className="w-full resize-none bg-transparent text-sm text-zinc-200 placeholder-zinc-600 outline-none"
      />

      {showCode && (
        <div className="mt-3 space-y-2 rounded-xl border border-white/[0.06] bg-[#0a0e1a] p-3">
          <input
            value={codeLanguage}
            onChange={(e) => setCodeLanguage(e.target.value)}
            placeholder="Language (e.g. typescript, python)"
            className="w-full bg-transparent text-xs text-zinc-400 placeholder-zinc-700 outline-none"
          />
          <textarea
            value={codeSnippet}
            onChange={(e) => setCodeSnippet(e.target.value)}
            placeholder="Paste your code here..."
            rows={5}
            className="w-full resize-none bg-transparent font-mono text-xs text-zinc-300 placeholder-zinc-700 outline-none"
          />
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowCode(!showCode)}
          className={cn("flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors", showCode ? "bg-neon/10 text-neon" : "text-zinc-500 hover:text-zinc-300")}
        >
          <Code2 className="h-3.5 w-3.5" />
          Code
        </button>
        <Button size="sm" onClick={handleSubmit} disabled={!content.trim() || loading}>
          {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
          Post
        </Button>
      </div>
    </div>
  );
}
