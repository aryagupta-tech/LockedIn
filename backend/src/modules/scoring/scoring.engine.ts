/**
 * Pure scoring engine — no I/O, no DB, no side effects.
 * All functions are deterministic and independently testable.
 */

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

/**
 * Linear normalization:
 * - value <= minimum  → 0
 * - value >= threshold → 100
 * - otherwise         → linear interpolation [0, 100]
 *
 * This avoids cliff effects: a developer with 999 GitHub contributions
 * still scores ~99 rather than being lumped with someone at 100.
 */
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

/**
 * Compute a weighted average of normalized signals.
 *
 * Score = Σ(weight_i × normalized_i) / Σ(weight_i)
 *
 * Only signals that appear in both `signals` and `weights` contribute.
 * Missing signals are silently skipped — partial data is expected when
 * a user only has GitHub but no Codeforces account.
 */
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

/**
 * Re-derive which auto-decision bucket a score falls into:
 *   >= autoApprove → APPROVED
 *   <  autoReject  → REJECTED
 *   between        → UNDER_REVIEW (needs human eyes)
 */
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
