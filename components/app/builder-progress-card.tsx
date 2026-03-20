"use client";

import { Award, TrendingUp } from "lucide-react";
import type { BuilderProgress } from "@/lib/gamification";
import { cn } from "@/lib/utils";

const tierRing: Record<string, string> = {
  bronze:
    "border-amber-700/50 bg-gradient-to-br from-amber-900/25 to-amber-950/20 text-amber-200/90 dark:from-amber-900/35 dark:to-amber-950/30",
  silver:
    "border-zinc-400/40 bg-gradient-to-br from-zinc-400/15 to-zinc-600/10 text-zinc-200 dark:from-zinc-500/20 dark:to-zinc-700/15",
  gold:
    "border-[var(--app-accent-soft)] bg-gradient-to-br from-[color-mix(in_srgb,var(--app-accent)_18%,transparent)] to-[color-mix(in_srgb,var(--app-accent-soft)_12%,transparent)] text-app-fg",
};

function XpBar({ progress }: { progress: BuilderProgress }) {
  const pct =
    progress.level >= progress.maxLevel
      ? 100
      : Math.min(100, Math.round((progress.xpInLevel / 100) * 100));
  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-app-surface-2 shadow-app-inset">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#f08838] to-[var(--app-accent)] transition-all duration-500 dark:from-[#e9a85a] dark:to-[#f0d9a8]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function BuilderProgressCard({
  progress,
  variant = "full",
  className,
}: {
  progress: BuilderProgress;
  variant?: "full" | "compact";
  className?: string;
}) {
  if (variant === "compact") {
    return (
      <div className={cn("app-panel p-4", className)}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--app-accent-soft)_35%,transparent)] text-sm font-bold text-[var(--app-accent)] dark:text-[#f0d9a8]">
              {progress.level}
            </span>
            <div>
              <p className="text-[13px] font-semibold text-app-fg">Builder level</p>
              <p className="text-[11px] text-app-fg-muted">
                {progress.level >= progress.maxLevel
                  ? "Max level"
                  : `${progress.xpToNext} XP to next`}
              </p>
            </div>
          </div>
          <TrendingUp className="h-4 w-4 shrink-0 text-app-fg-muted" aria-hidden />
        </div>
        <XpBar progress={progress} />
        {progress.badges.length > 0 && (
          <p className="mt-2 text-[11px] text-app-fg-muted">
            {progress.badges.length} badge{progress.badges.length === 1 ? "" : "s"} earned
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("app-panel p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-app-fg-muted">Builder rank</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-[var(--font-geist)] text-3xl font-bold text-app-fg">Level {progress.level}</span>
            <span className="text-[13px] text-app-fg-muted">
              / {progress.maxLevel}
              {progress.level < progress.maxLevel && (
                <> · {progress.xpToNext} XP to level {progress.level + 1}</>
              )}
            </span>
          </div>
        </div>
        <Award className="h-8 w-8 text-[var(--app-accent)] opacity-80" aria-hidden />
      </div>
      <XpBar progress={progress} />
      {progress.nextMilestoneHint && (
        <p className="mt-3 text-[12px] leading-relaxed text-app-fg-muted">{progress.nextMilestoneHint}</p>
      )}

      <div className="mt-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-app-fg-muted">Badges</p>
        {progress.badges.length === 0 ? (
          <p className="mt-2 text-[12px] text-app-fg-muted">
            Ship posts, share code, and join threads — badges unlock from real activity.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {progress.badges.map((b) => (
              <li
                key={b.id}
                title={b.description}
                className={cn(
                  "rounded-app-md border px-3 py-2.5 text-left text-[12px] shadow-app transition-shadow hover:shadow-app-hover",
                  tierRing[b.tier] || tierRing.bronze,
                )}
              >
                <span className="font-semibold text-app-fg">{b.name}</span>
                <span className="mt-0.5 block text-[11px] text-app-fg-muted line-clamp-2">{b.description}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
