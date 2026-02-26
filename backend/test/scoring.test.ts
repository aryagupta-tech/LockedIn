import { describe, it, expect } from "vitest";
import {
  normalize,
  computeScore,
  deriveDecision,
} from "../src/modules/scoring/scoring.engine";

describe("normalize()", () => {
  it("returns 0 when value equals minimum", () => {
    expect(normalize(100, 100, 1000)).toBe(0);
  });

  it("returns 0 when value is below minimum", () => {
    expect(normalize(50, 100, 1000)).toBe(0);
  });

  it("returns 100 when value equals threshold", () => {
    expect(normalize(1000, 100, 1000)).toBe(100);
  });

  it("returns 100 when value exceeds threshold", () => {
    expect(normalize(5000, 100, 1000)).toBe(100);
  });

  it("linearly interpolates at midpoint", () => {
    expect(normalize(550, 100, 1000)).toBe(50);
  });

  it("linearly interpolates at quarter point", () => {
    expect(normalize(325, 100, 1000)).toBe(25);
  });

  it("handles threshold equals minimum edge case", () => {
    expect(normalize(100, 100, 100)).toBe(100);
    expect(normalize(50, 100, 100)).toBe(0);
  });

  it("handles zero minimum", () => {
    expect(normalize(500, 0, 1000)).toBe(50);
  });

  it("handles negative values gracefully", () => {
    expect(normalize(-10, 0, 100)).toBe(0);
  });
});

describe("computeScore()", () => {
  const weights = [
    { key: "github_contributions", weight: 0.35, threshold: 1000, minimum: 100 },
    { key: "codeforces_rating", weight: 0.25, threshold: 2100, minimum: 1200 },
    { key: "leetcode_problems", weight: 0.25, threshold: 500, minimum: 50 },
    { key: "portfolio_quality", weight: 0.15, threshold: 100, minimum: 20 },
  ];

  it("computes perfect score when all signals are at threshold", () => {
    const signals = [
      { key: "github_contributions", rawValue: 1000 },
      { key: "codeforces_rating", rawValue: 2100 },
      { key: "leetcode_problems", rawValue: 500 },
      { key: "portfolio_quality", rawValue: 100 },
    ];
    const result = computeScore(signals, weights);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("computes zero score when all signals are at minimum", () => {
    const signals = [
      { key: "github_contributions", rawValue: 100 },
      { key: "codeforces_rating", rawValue: 1200 },
      { key: "leetcode_problems", rawValue: 50 },
      { key: "portfolio_quality", rawValue: 20 },
    ];
    const result = computeScore(signals, weights);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it("handles partial signals (only GitHub provided)", () => {
    const signals = [{ key: "github_contributions", rawValue: 1000 }];
    const result = computeScore(signals, weights);
    // Only github weight (0.35) contributes, normalized to 100
    // Score = (0.35 * 100) / 0.35 = 100
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("handles no matching signals", () => {
    const signals = [{ key: "unknown_signal", rawValue: 9999 }];
    const result = computeScore(signals, weights);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(Object.keys(result.breakdown)).toHaveLength(0);
  });

  it("returns correct breakdown structure", () => {
    const signals = [
      { key: "github_contributions", rawValue: 550 },
      { key: "codeforces_rating", rawValue: 1650 },
    ];
    const result = computeScore(signals, weights);

    expect(result.breakdown.github_contributions).toBeDefined();
    expect(result.breakdown.github_contributions.rawValue).toBe(550);
    expect(result.breakdown.github_contributions.normalizedValue).toBe(50);
    expect(result.breakdown.github_contributions.weight).toBe(0.35);

    expect(result.breakdown.codeforces_rating).toBeDefined();
    expect(result.breakdown.codeforces_rating.rawValue).toBe(1650);
    expect(result.breakdown.codeforces_rating.normalizedValue).toBe(50);
  });

  it("correctly evaluates against custom passing threshold", () => {
    const signals = [{ key: "github_contributions", rawValue: 600 }];
    const low = computeScore(signals, weights, 50);
    const high = computeScore(signals, weights, 60);

    // rawValue 600: normalized = (600-100)/(1000-100)*100 ≈ 55.56
    // Score = 55.56 (only signal)
    expect(low.passed).toBe(true);
    expect(high.passed).toBe(false);
  });

  it("uses weighted average correctly with two signals of different weights", () => {
    const signals = [
      { key: "github_contributions", rawValue: 1000 }, // normalized: 100, weight: 0.35
      { key: "codeforces_rating", rawValue: 1200 },    // normalized: 0, weight: 0.25
    ];
    const result = computeScore(signals, weights);
    // Score = (0.35*100 + 0.25*0) / (0.35+0.25) = 35/0.6 ≈ 58.33
    expect(result.score).toBeCloseTo(58.33, 1);
  });
});

describe("deriveDecision()", () => {
  it("returns APPROVED for scores above auto-approve threshold", () => {
    expect(deriveDecision(95, 90, 30)).toBe("APPROVED");
  });

  it("returns REJECTED for scores below auto-reject threshold", () => {
    expect(deriveDecision(20, 90, 30)).toBe("REJECTED");
  });

  it("returns UNDER_REVIEW for scores in the middle", () => {
    expect(deriveDecision(60, 90, 30)).toBe("UNDER_REVIEW");
  });

  it("returns APPROVED when score exactly equals auto-approve", () => {
    expect(deriveDecision(90, 90, 30)).toBe("APPROVED");
  });

  it("returns UNDER_REVIEW when score exactly equals auto-reject", () => {
    expect(deriveDecision(30, 90, 30)).toBe("UNDER_REVIEW");
  });
});
