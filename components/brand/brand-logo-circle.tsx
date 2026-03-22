"use client";

import { cn } from "@/lib/utils";
import { LockedInAppIcon } from "@/components/brand/locked-in-app-icon";

const sizes = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-10 w-10",
} as const;

/** Circle padlock from `app/icon.svg`, with the same ring treatment as the nav profile avatar. */
export function BrandLogoCircle({
  size = "md",
  className,
  iconClassName,
  withHover = false,
}: {
  size?: keyof typeof sizes;
  className?: string;
  iconClassName?: string;
  /** Use inside a parent with `className="group"` for ring + icon scale on hover. */
  withHover?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 transition-all",
        sizes[size],
        "ring-app-border-strong",
        withHover && "group-hover:ring-neon/40",
        className,
      )}
    >
      <LockedInAppIcon
        className={cn(
          "h-full w-full",
          withHover && "transition-transform duration-200 group-hover:scale-105",
          iconClassName,
        )}
      />
    </span>
  );
}
