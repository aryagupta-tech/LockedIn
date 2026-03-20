export interface SignalInput {
  key: string;
  rawValue: number;
}

export interface WeightConfig {
  key: string;
  weight: number;
  threshold: number;
  minimum: number;
}

export interface SignalBreakdown {
  rawValue: number;
  normalizedValue: number;
  weight: number;
  weightedContribution: number;
}

export interface ScoringResult {
  score: number;
  breakdown: Record<string, SignalBreakdown>;
  passed: boolean;
  passingThreshold: number;
}

export function normalize(
  value: number,
  minimum: number,
  threshold: number,
): number {
  if (threshold <= minimum) return value >= threshold ? 100 : 0;
  if (value <= minimum) return 0;
  if (value >= threshold) return 100;
  return ((value - minimum) / (threshold - minimum)) * 100;
}

export function computeScore(
  signals: SignalInput[],
  weights: WeightConfig[],
  passingThreshold: number = 70,
): ScoringResult {
  const breakdown: Record<string, SignalBreakdown> = {};
  let weightedSum = 0;
  let totalWeight = 0;

  for (const w of weights) {
    const signal = signals.find((s) => s.key === w.key);
    if (!signal) continue;

    const normalizedValue = normalize(signal.rawValue, w.minimum, w.threshold);
    const weightedContribution = w.weight * normalizedValue;

    weightedSum += weightedContribution;
    totalWeight += w.weight;

    breakdown[w.key] = {
      rawValue: signal.rawValue,
      normalizedValue: round(normalizedValue),
      weight: w.weight,
      weightedContribution: round(weightedContribution),
    };
  }

  const score = totalWeight > 0 ? weightedSum / totalWeight : 0;

  return {
    score: round(score),
    breakdown,
    passed: score >= passingThreshold,
    passingThreshold,
  };
}

export function deriveDecision(
  score: number,
  autoApproveThreshold: number,
  autoRejectThreshold: number,
): "APPROVED" | "REJECTED" | "UNDER_REVIEW" {
  if (score >= autoApproveThreshold) return "APPROVED";
  if (score < autoRejectThreshold) return "REJECTED";
  return "UNDER_REVIEW";
}

function round(n: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

/**
 * Per-platform pass thresholds.
 * A user is approved if ANY single platform meets its threshold.
 */
export const PLATFORM_THRESHOLDS: Record<string, number> = {
  github_contributions: 250,
  codeforces_rating: 900,
  leetcode_problems: 100,
};

/**
 * Returns true if at least one signal meets or exceeds its platform threshold.
 */
export function checkAnyPlatformPasses(signals: SignalInput[]): boolean {
  for (const signal of signals) {
    const threshold = PLATFORM_THRESHOLDS[signal.key];
    if (threshold === undefined) continue;
    const raw = Number(signal.rawValue);
    if (!Number.isFinite(raw)) continue;
    if (raw >= threshold) return true;
  }
  return false;
}
