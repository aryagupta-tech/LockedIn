"use client";

import { Award } from "lucide-react";
import type { BuilderProgress } from "@/lib/gamification";
import { cn } from "@/lib/utils";

const tierRing: Record<string, string> = {
  bronze:
    "border-amber-700/50 bg-gradient-to-br from-amber-900/35 to-amber-950/30 text-amber-200/90",
  silver:
    "border-zinc-400/40 bg-gradient-to-br from-zinc-500/20 to-zinc-700/15 text-zinc-200",
  gold:
    "border-[var(--app-accent-soft)] bg-gradient-to-br from-[color-mix(in_srgb,var(--app-accent)_18%,transparent)] to-[color-mix(in_srgb,var(--app-accent-soft)_12%,transparent)] text-app-fg",
};

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
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 shrink-0 text-[var(--app-accent)]" aria-hidden />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-app-fg">Badges</p>
            <p className="text-[11px] text-app-fg-muted">
              {progress.badges.length === 0
                ? "Earn from posts, code, comments & more"
                : `${progress.badges.length} earned`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("app-panel p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-app-fg-muted">Badges</p>
          <p className="mt-1 text-[13px] text-app-fg-muted">
            Unlock milestones from real activity — not from a numeric level.
          </p>
        </div>
        <Award className="h-8 w-8 text-[var(--app-accent)] opacity-80" aria-hidden />
      </div>

      {progress.nextMilestoneHint && (
        <p className="mt-3 text-[12px] leading-relaxed text-app-fg-muted">{progress.nextMilestoneHint}</p>
      )}

      <div className="mt-5">
        {progress.badges.length === 0 ? (
          <p className="text-[12px] text-app-fg-muted">
            Ship posts, share code, and join threads — badges unlock from specific milestones.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
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
