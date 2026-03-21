import { PLATFORM_THRESHOLDS } from "@/lib/scoring/engine";
import type { SignalInput } from "@/lib/scoring/engine";

export type PlatformId = "github" | "leetcode" | "codeforces";

export type PlatformProgressRow = {
  id: PlatformId;
  label: string;
  /** What we count (e.g. contributions in last year) */
  metricLabel: string;
  unit: string;
  submitted: boolean;
  threshold: number;
  /** null = could not fetch */
  current: number | null;
  passed: boolean;
  /** How many more needed to hit threshold; null if unknown */
  shortfall: number | null;
  fetchError?: string;
};

const DEFS: Record<
  PlatformId,
  { signalKey: string; errorKey: keyof FetchErrorsShape; label: string; metricLabel: string; unit: string }
> = {
  github: {
    signalKey: "github_contributions",
    errorKey: "github",
    label: "GitHub",
    metricLabel:
      "Contributions in rolling ~12 months (matches the green grid when token or scrape works)",
    unit: "contributions",
  },
  leetcode: {
    signalKey: "leetcode_problems",
    errorKey: "leetcode",
    label: "LeetCode",
    metricLabel: "Unique problems solved (profile-style count via submitStatsGlobal)",
    unit: "problems",
  },
  codeforces: {
    signalKey: "codeforces_rating",
    errorKey: "codeforces",
    label: "Codeforces",
    metricLabel: "Rating for gate = max(current, maxRating) from official API",
    unit: "rating",
  },
};

type FetchErrorsShape = {
  github?: string;
  leetcode?: string;
  codeforces?: string;
};

function submittedFlags(app: {
  githubUrl?: string | null;
  codeforcesHandle?: string | null;
  leetcodeHandle?: string | null;
}): Record<PlatformId, boolean> {
  return {
    github: Boolean(app.githubUrl?.trim()),
    leetcode: Boolean(app.leetcodeHandle?.trim()),
    codeforces: Boolean(app.codeforcesHandle?.trim()),
  };
}

/**
 * Build rows from live fetched signals (preview / server-side scoring).
 */
export function buildPlatformProgressFromSignals(
  signals: SignalInput[],
  fetchErrors: Record<string, string>,
  app: {
    githubUrl?: string | null;
    codeforcesHandle?: string | null;
    leetcodeHandle?: string | null;
  },
): PlatformProgressRow[] {
  const sub = submittedFlags(app);
  const byKey = Object.fromEntries(signals.map((s) => [s.key, s.rawValue])) as Record<
    string,
    number
  >;

  return (Object.keys(DEFS) as PlatformId[]).map((id) => {
    const d = DEFS[id];
    const threshold = PLATFORM_THRESHOLDS[d.signalKey] ?? 0;
    const submitted = sub[id];
    const err = fetchErrors[d.errorKey];
    const raw = byKey[d.signalKey];
    const current =
      typeof raw === "number" && Number.isFinite(raw) ? raw : null;
    const passed = submitted && current !== null && current >= threshold;
    const shortfall =
      current !== null ? Math.max(0, threshold - current) : null;

    return {
      id,
      label: d.label,
      metricLabel: d.metricLabel,
      unit: d.unit,
      submitted,
      threshold,
      current,
      passed,
      shortfall,
      fetchError: err,
    };
  });
}

/**
 * Build rows from stored application.scoreBreakdown + optional fetch errors.
 */
export function buildPlatformProgressFromBreakdown(
  breakdown: Record<string, unknown> | null | undefined,
  app: {
    githubUrl?: string | null;
    codeforcesHandle?: string | null;
    leetcodeHandle?: string | null;
  },
): PlatformProgressRow[] {
  const sub = submittedFlags(app);
  const fetchErrors =
    (breakdown?._fetchErrors as FetchErrorsShape | undefined) || {};

  return (Object.keys(DEFS) as PlatformId[]).map((id) => {
    const d = DEFS[id];
    const threshold = PLATFORM_THRESHOLDS[d.signalKey] ?? 0;
    const submitted = sub[id];
    const chunk = breakdown?.[d.signalKey];
    const err = fetchErrors[d.errorKey];

    let current: number | null = null;

    if (
      chunk &&
      typeof chunk === "object" &&
      "rawValue" in chunk &&
      typeof (chunk as { rawValue: unknown }).rawValue === "number"
    ) {
      current = (chunk as { rawValue: number }).rawValue;
    }

    const shortfall =
      current !== null ? Math.max(0, threshold - current) : null;
    const passed =
      submitted && current !== null && current >= threshold;

    return {
      id,
      label: d.label,
      metricLabel: d.metricLabel,
      unit: d.unit,
      submitted,
      threshold,
      current,
      passed,
      shortfall,
      fetchError: err,
    };
  });
}
