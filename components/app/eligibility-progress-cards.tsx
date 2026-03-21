"use client";

import type { PlatformProgressRow } from "@/lib/eligibility-progress";

function pct(current: number, threshold: number) {
  if (threshold <= 0) return 0;
  return Math.min(100, Math.round((current / threshold) * 100));
}

export function EligibilityProgressCards({
  platforms,
  heading = "How you compare to auto-approve bars",
  intro,
}: {
  platforms: PlatformProgressRow[];
  heading?: string;
  intro?: string;
}) {
  const active = platforms.filter((p) => p.submitted);
  if (active.length === 0) return null;

  return (
    <div className="neo-field mt-4 rounded-xl border border-app-fg/10 bg-app-surface-2 p-4">
      <p className="text-xs font-medium uppercase tracking-widest text-app-fg-muted">
        {heading}
      </p>
      {intro && (
        <p className="mt-2 text-[12px] leading-relaxed text-app-fg-muted">{intro}</p>
      )}
      <p className="mt-2 text-[11px] text-app-fg-muted">
        You only need <strong className="text-app-fg-secondary">one</strong> of these to hit its
        bar for instant approval.
      </p>
      <ul className="mt-4 space-y-4">
        {active.map((p) => (
          <li
            key={p.id}
            className="rounded-lg border border-app-fg/10 bg-app-bg/40 px-3 py-3"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-app-fg">{p.label}</span>
              {p.passed ? (
                <span className="text-xs font-medium text-green-800 dark:text-green-400/90">
                  Meets bar — counts for auto-approve
                </span>
              ) : (
                <span className="text-xs font-medium text-amber-800 dark:text-amber-400/90">
                  Below bar for auto-approve
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-app-fg-muted">{p.metricLabel}</p>

            {p.fetchError ? (
              <p className="mt-2 text-[12px] leading-relaxed text-red-400/90">
                Couldn’t load your stats: {p.fetchError}
                <span className="mt-1 block text-app-fg-muted">
                  Target for auto-approve: <strong className="text-app-fg-secondary">≥{p.threshold}</strong>{" "}
                  {p.unit}.
                </span>
              </p>
            ) : p.current !== null ? (
              <>
                <div className="mt-2 flex flex-wrap items-end gap-x-2 gap-y-1 font-mono text-sm">
                  <span className="text-2xl font-bold text-app-fg">{p.current}</span>
                  <span className="text-app-fg-muted">
                    / <span className="text-app-fg-secondary">{p.threshold}</span> {p.unit} needed
                  </span>
                </div>
                {!p.passed && p.shortfall !== null && p.shortfall > 0 && (
                  <p className="mt-1 text-[12px] text-amber-900 dark:text-amber-200/85">
                    About <strong>{p.shortfall}</strong> more {p.unit} to reach the auto-approve
                    threshold on {p.label} alone.
                  </p>
                )}
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-app-surface-2">
                  <div
                    className={`h-full rounded-full transition-all ${
                      p.passed ? "bg-green-500/70" : "bg-[#e3c98e]/80"
                    }`}
                    style={{ width: `${pct(p.current, p.threshold)}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="mt-2 text-[12px] text-app-fg-muted">
                No reading yet. Target: <strong className="text-app-fg-secondary">≥{p.threshold}</strong>{" "}
                {p.unit}.
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
