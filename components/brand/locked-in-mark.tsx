"use client";

import { cn } from "@/lib/utils";

export type LockedInMarkProps = {
  /** Logo box height in pixels; width follows `public/brand/lockedin-wordmark.png` aspect ratio */
  size?: number;
  className?: string;
  /** Hide from assistive tech when paired with visible “LockedIn” text */
  decorative?: boolean;
};

/** Intrinsic pixel size of `public/brand/lockedin-wordmark.png` (source: `LockedIn/Pasted image.png`; run `node scripts/build-wordmark-from-paste.cjs`). */
const WORDMARK_W = 93;
const WORDMARK_H = 93;

/**
 * Brand mark from `lockedin-wordmark.png`, tinted with the same gradient as `.text-brand-logo`.
 */
export function LockedInMark({ size = 28, className, decorative = true }: LockedInMarkProps) {
  const width = Math.max(1, Math.round((size * WORDMARK_W) / WORDMARK_H));

  return (
    <span
      className={cn("brand-wordmark-mask", className)}
      style={{ height: size, width }}
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "LockedIn"}
    />
  );
}
