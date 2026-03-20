"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shows **Light** (sun + light pill) while the app is in light mode — click to go dark.
 * Shows **Dark** (moon + leather pill) while the app is in dark mode — click to go light.
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
        "relative inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-3.5 transition-transform active:scale-[0.97]",
        isDark ? "theme-toggle-leather" : "theme-toggle-light",
        className,
      )}
      title={isDark ? "Dark mode — click to use light mode" : "Light mode — click to use dark mode"}
      aria-label={
        isDark
          ? "Dark theme active. Switch to light theme."
          : "Light theme active. Switch to dark theme."
      }
    >
      {isDark ? (
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
      ) : (
        <>
          <Sun className="h-4 w-4 text-[#d65a08]" strokeWidth={2.25} aria-hidden />
          <span className="theme-toggle-light-label hidden text-[11px] font-semibold tracking-wide sm:inline">
            Light
          </span>
        </>
      )}
    </button>
  );
}
