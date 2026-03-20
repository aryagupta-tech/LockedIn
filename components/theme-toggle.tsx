"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Light mode: neumorphic pill switch + soft orange glow (reference: soft UI toggle).
 * Dark mode: leather-style pill + stitched border + gold accent (reference: leather control).
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

  if (isDark) {
    return (
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={cn(
          "theme-toggle-leather relative inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-3.5 transition-transform active:scale-[0.97]",
          className,
        )}
        title="Switch to light mode"
        aria-label="Switch to light mode"
      >
        <Sun
          className="h-4 w-4 text-[#f0d9a0] drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]"
          strokeWidth={2}
        />
        <span className="theme-toggle-leather-gold hidden text-[11px] font-semibold tracking-wide sm:inline">
          Light
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme("dark")}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-[#e8e6ee] px-1 py-0.5 shadow-[3px_3px_10px_rgba(0,0,0,0.055),-2px_-2px_10px_rgba(255,255,255,0.9)] transition-transform active:scale-[0.98]",
        className,
      )}
      title="Switch to dark mode"
      aria-label="Switch to dark mode"
    >
      <ChevronLeft className="h-3.5 w-3.5 text-neutral-800/80" strokeWidth={2.5} aria-hidden />
      <span className="relative h-7 w-[3.25rem] shrink-0 overflow-hidden rounded-full theme-toggle-neo-track">
        <span
          className="theme-toggle-neo-glow pointer-events-none absolute inset-y-0 right-0 w-[55%] rounded-r-full"
          aria-hidden
        />
        <span
          className={cn(
            "theme-toggle-neo-thumb absolute left-[3px] top-[3px] h-[calc(100%-6px)] w-[calc(50%-2px)] rounded-full transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            "translate-x-0",
          )}
          aria-hidden
        >
          <span className="flex h-full w-full items-center justify-end pr-0.5">
            <ChevronRight className="h-3 w-3 text-neutral-900/90" strokeWidth={3} />
          </span>
        </span>
      </span>
      <ChevronRight className="h-3.5 w-3.5 text-neutral-800/80" strokeWidth={2.5} aria-hidden />
    </button>
  );
}
