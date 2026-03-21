"use client";

import { cn } from "@/lib/utils";

const AVATAR_GRADIENTS = [
  "from-violet-500 to-fuchsia-500",
  "from-blue-500 to-cyan-400",
  "from-orange-500 to-rose-500",
  "from-emerald-500 to-teal-400",
  "from-pink-500 to-rose-400",
  "from-amber-500 to-orange-400",
  "from-indigo-500 to-blue-400",
  "from-teal-500 to-emerald-400",
] as const;

/** Stable gradient class from username (matches feed / cards everywhere). */
export function avatarGradientClassForSeed(seed: string): string {
  let hash = 0;
  const s = seed || "?";
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]!;
}

export type UserAvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<UserAvatarSize, string> = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-9 w-9 text-xs",
  md: "h-10 w-10 text-[13px]",
  lg: "h-11 w-11 text-sm",
  xl: "h-20 w-20 text-2xl shadow-app",
};

/**
 * One avatar treatment app-wide: show `avatarUrl` when set, otherwise initial on the same
 * gradient every screen uses (seeded by `username`).
 */
export function UserAvatar({
  avatarUrl,
  displayName,
  username,
  size = "md",
  className,
}: {
  avatarUrl?: string | null;
  displayName: string;
  username: string;
  size?: UserAvatarSize;
  className?: string;
}) {
  const seed = (username?.trim() || displayName?.trim() || "?") as string;
  const gradient = avatarGradientClassForSeed(seed);
  const label = (displayName?.trim() || username?.trim() || "?") as string;
  const initial = (label.charAt(0) || "?").toUpperCase();
  const url = typeof avatarUrl === "string" ? avatarUrl.trim() : "";

  return (
    <div
      className={cn(
        "flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br font-bold text-white",
        gradient,
        SIZE_CLASSES[size],
        className,
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </div>
  );
}
