"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export type LockedInMarkProps = {
  /** Width and height in pixels */
  size?: number;
  className?: string;
  /** Hide from assistive tech when paired with visible “LockedIn” text */
  decorative?: boolean;
};

/**
 * LockedIn wordmark icon — gradient frame + lock silhouette. Uses theme-friendly
 * contrast for the lock body in light vs dark mode.
 */
export function LockedInMark({ size = 28, className, decorative = true }: LockedInMarkProps) {
  const uid = useId().replace(/:/g, "");
  const gradId = `li-grad-${uid}`;
  const shineId = `li-shine-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={cn(
        "shrink-0 overflow-visible [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.12))] dark:[filter:drop-shadow(0_2px_10px_rgba(0,0,0,0.55))]",
        className,
      )}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
    >
      <defs>
        <linearGradient id={gradId} x1="3" y1="2" x2="29" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f06820" />
          <stop offset="0.35" stopColor="#f5b84e" />
          <stop offset="0.62" stopColor="#e9a85a" />
          <stop offset="100%" stopColor="#5168d8" />
        </linearGradient>
        <linearGradient id={shineId} x1="6" y1="4" x2="18" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Outer mark */}
      <rect x="1.5" y="1.5" width="29" height="29" rx="9.5" ry="9.5" fill={`url(#${gradId})`} />
      <ellipse cx="13" cy="11" rx="10" ry="7" fill={`url(#${shineId})`} className="pointer-events-none" />

      {/* Lock silhouette (shackle + body), centered */}
      <path
        fill="#faf7f2"
        className="dark:fill-[#0c0805]"
        d="M12 17V14A4 4 0 1 0 20 14V17H21.5A1.5 1.5 0 0 1 23 18.5V27A1.5 1.5 0 0 1 21.5 28.5H10.5A1.5 1.5 0 0 1 9 27V18.5A1.5 1.5 0 0 1 10.5 17H12z"
      />
      <circle cx="16" cy="22.5" r="1.35" className="fill-[#c45a10]/40 dark:fill-[#e9a85a]/45" />
      <rect x="15" y="23.5" width="2" height="3.5" rx="0.45" className="fill-[#c45a10]/40 dark:fill-[#e9a85a]/45" />
    </svg>
  );
}
