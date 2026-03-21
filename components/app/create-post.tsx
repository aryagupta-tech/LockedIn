"use client";

import { useRef, useState } from "react";
import { Code2, ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type Post } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { uploadPostImage } from "@/lib/storage";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [codeSnippet, setCodeSnippet] = useState("");
  const [codeLanguage, setCodeLanguage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState("");

  const avatarColor = getAvatarColor(user?.username || "");

  const clearImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    const text = content.trim();
    if ((!text && !imageFile) || loading || !user) return;
    setLoading(true);
    setError("");
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        imageUrl = await uploadPostImage(user.id, imageFile);
      }
      const post = await api.post<Post>("/posts", {
        content: text,
        ...(imageUrl ? { imageUrl } : {}),
        ...(showCode && codeSnippet.trim() ? { codeSnippet: codeSnippet.trim(), codeLanguage: codeLanguage || undefined } : {}),
        ...(communityId ? { communityId } : {}),
      });
      onCreated(post);
      setContent("");
      setCodeSnippet("");
      setCodeLanguage("");
      setShowCode(false);
      setFocused(false);
      clearImage();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create post");
    }
    setLoading(false);
  };

  const canPost = Boolean(content.trim() || imageFile);

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
            className="w-full resize-none bg-transparent text-[15px] text-app-fg placeholder:text-app-fg-muted outline-none"
          />

          {imagePreview && (
            <div className="relative mt-2 overflow-hidden rounded-app-md border border-app-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="" className="max-h-72 w-full object-cover" />
              <button
                type="button"
                onClick={clearImage}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {showCode && (
            <div className="mt-2 overflow-hidden rounded-app-md border border-app-border">
              <div className="border-b border-app-border bg-app-code px-3 py-1.5">
                <input
                  value={codeLanguage}
                  onChange={(e) => setCodeLanguage(e.target.value)}
                  placeholder="Language"
                  className="w-full bg-transparent text-[12px] text-app-fg-muted placeholder:text-app-fg-muted/60 outline-none"
                />
              </div>
              <textarea
                value={codeSnippet}
                onChange={(e) => setCodeSnippet(e.target.value)}
                placeholder="Paste your code..."
                rows={4}
                className="w-full resize-none bg-app-code p-3 font-mono text-[13px] text-app-fg-secondary placeholder:text-app-fg-muted/60 outline-none"
              />
            </div>
          )}

          {error && (
            <p className="mt-2 text-[13px] text-red-400">{error}</p>
          )}

          {(focused || content || imageFile) && (
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={onPickImage}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "rounded-lg p-2 transition-colors",
                    imageFile ? "bg-neon/10 text-neon" : "text-app-fg-muted hover:text-neon",
                  )}
                  title="Add image"
                >
                  <ImagePlus className="h-[18px] w-[18px]" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowCode(!showCode)}
                  className={cn(
                    "rounded-lg p-2 transition-colors",
                    showCode ? "bg-neon/10 text-neon" : "text-app-fg-muted hover:text-neon",
                  )}
                  title="Add code"
                >
                  <Code2 className="h-[18px] w-[18px]" />
                </button>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!canPost || loading}
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
