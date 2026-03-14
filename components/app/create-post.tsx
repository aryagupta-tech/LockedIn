"use client";

import { useState } from "react";
import { Code2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type Post } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  "from-violet-500 to-fuchsia-500", "from-blue-500 to-cyan-400",
  "from-orange-500 to-rose-500", "from-emerald-500 to-teal-400",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function CreatePost({ communityId, onCreated }: { communityId?: string; onCreated: (post: Post) => void }) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [codeSnippet, setCodeSnippet] = useState("");
  const [codeLanguage, setCodeLanguage] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const avatarColor = getAvatarColor(user?.username || "");

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
      setFocused(false);
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <div className="post-card mb-5">
      <div className="flex gap-3 p-4">
        <div className={cn(
          "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[13px] font-bold text-white",
          avatarColor,
        )}>
          {user?.displayName?.charAt(0).toUpperCase() || "?"}
        </div>

        <div className="min-w-0 flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder="Share what you're building..."
            rows={focused ? 3 : 2}
            className="w-full resize-none bg-transparent text-[15px] text-white placeholder-[#555] outline-none"
          />

          {showCode && (
            <div className="mt-2 overflow-hidden rounded-xl border border-[#222]">
              <div className="border-b border-[#222] bg-[#0a0a0a] px-3 py-1.5">
                <input
                  value={codeLanguage}
                  onChange={(e) => setCodeLanguage(e.target.value)}
                  placeholder="Language"
                  className="w-full bg-transparent text-[12px] text-[#888] placeholder-[#444] outline-none"
                />
              </div>
              <textarea
                value={codeSnippet}
                onChange={(e) => setCodeSnippet(e.target.value)}
                placeholder="Paste your code..."
                rows={4}
                className="w-full resize-none bg-[#0a0a0a] p-3 font-mono text-[13px] text-[#ccc] placeholder-[#444] outline-none"
              />
            </div>
          )}

          {(focused || content) && (
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className={cn(
                  "rounded-lg p-2 transition-colors",
                  showCode ? "bg-neon/10 text-neon" : "text-[#555] hover:text-neon"
                )}
              >
                <Code2 className="h-[18px] w-[18px]" />
              </button>
              <Button
                onClick={handleSubmit}
                disabled={!content.trim() || loading}
                className="rounded-full px-6 text-[13px]"
                size="sm"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
