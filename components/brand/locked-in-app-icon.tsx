"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/** Padlock mark from `app/icon.svg` — same asset as the site favicon, with a circular badge. */
export function LockedInAppIcon({ className }: { className?: string }) {
  const raw = useId();
  const gid = `li-g-${raw.replace(/:/g, "")}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      className={cn("block shrink-0", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="3" y1="2" x2="29" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f06820" />
          <stop offset="35%" stopColor="#f5b84e" />
          <stop offset="62%" stopColor="#e9a85a" />
          <stop offset="100%" stopColor="#5168d8" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14.5" fill={`url(#${gid})`} />
      <path
        fill="#faf7f2"
        d="M12 17V14A4 4 0 1 0 20 14V17H21.5A1.5 1.5 0 0 1 23 18.5V27A1.5 1.5 0 0 1 21.5 28.5H10.5A1.5 1.5 0 0 1 9 27V18.5A1.5 1.5 0 0 1 10.5 17H12z"
      />
      <circle cx="16" cy="22.5" r="1.35" fill="rgba(196,90,16,0.45)" />
      <rect x="15" y="23.5" width="2" height="3.5" rx="0.45" fill="rgba(196,90,16,0.45)" />
    </svg>
  );
}
