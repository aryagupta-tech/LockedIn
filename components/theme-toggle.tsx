"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Single leather-style pill for both themes: in light mode it offers “Dark”;
 * in dark mode it offers “Light”. No separate light-mode switch UI.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <span
        className={cn("inline-block h-9 w-[4.5rem] shrink-0 rounded-full bg-app-surface", className)}
        aria-hidden
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "theme-toggle-leather relative inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-3.5 transition-transform active:scale-[0.97]",
        className,
      )}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <>
          <Sun
            className="h-4 w-4 text-[#f0d9a0] drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]"
            strokeWidth={2}
            aria-hidden
          />
          <span className="theme-toggle-leather-gold hidden text-[11px] font-semibold tracking-wide sm:inline">
            Light
          </span>
        </>
      ) : (
        <>
          <Moon
            className="h-4 w-4 text-[#f0d9a0] drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]"
            strokeWidth={2}
            aria-hidden
          />
          <span className="theme-toggle-leather-gold hidden text-[11px] font-semibold tracking-wide sm:inline">
            Dark
          </span>
        </>
      )}
    </button>
  );
}
