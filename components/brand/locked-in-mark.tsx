"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export type LockedInMarkProps = {
  /** Logo height in pixels (width follows intrinsic aspect ratio). */
  size?: number;
  className?: string;
  /** Hide from assistive tech when paired with visible “LockedIn” text */
  decorative?: boolean;
};

const LOGO_SRC = "/brand/lockedin-logo.png";
const LOGO_WIDTH = 799;
const LOGO_HEIGHT = 277;

/** LockedIn logo (wordmark + mark) from brand asset. */
export function LockedInMark({ size = 28, className, decorative = true }: LockedInMarkProps) {
  const displayWidth = Math.max(1, Math.round((size * LOGO_WIDTH) / LOGO_HEIGHT));

  return (
    <span
      className={cn("inline-flex shrink-0 items-center", className)}
      style={{ height: size }}
      aria-hidden={decorative ? true : undefined}
    >
      <Image
        src={LOGO_SRC}
        alt={decorative ? "" : "LockedIn"}
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        className="h-full w-auto [filter:drop-shadow(0_2px_10px_rgba(0,0,0,0.55))]"
        sizes={`${displayWidth}px`}
        priority={false}
      />
    </span>
  );
}
