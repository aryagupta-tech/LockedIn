import type { FastifyInstance } from "fastify";
import {
  computeScore,
  deriveDecision,
  type SignalInput,
  type WeightConfig,
  type ScoringResult,
} from "./scoring.engine";
import { fetchGitHubSignal } from "./providers/github.provider";
import { fetchCodeforcesSignal } from "./providers/codeforces.provider";
import { fetchLeetCodeSignal } from "./providers/leetcode.provider";
import { decrypt } from "../../lib/crypto";

const WEIGHTS_CACHE_KEY = "scoring:weights";
const WEIGHTS_CACHE_TTL = 300; // 5 minutes

export class ScoringService {
  constructor(private readonly app: FastifyInstance) {}

  /**
   * Load scoring weights from DB with Redis cache layer.
   */
  async getWeights(): Promise<WeightConfig[]> {
    const cached = await this.app.redis.get(WEIGHTS_CACHE_KEY);
    if (cached) return JSON.parse(cached);

    const rows = await this.app.prisma.scoringWeight.findMany();
    const weights: WeightConfig[] = rows.map((r) => ({
      key: r.key,
      weight: r.weight,
      threshold: r.threshold,
      minimum: r.minimum,
    }));

    await this.app.redis.set(
      WEIGHTS_CACHE_KEY,
      JSON.stringify(weights),
      "EX",
      WEIGHTS_CACHE_TTL,
    );

    return weights;
  }

  /** Invalidate cached weights after admin edits them. */
  async invalidateWeightsCache(): Promise<void> {
    await this.app.redis.del(WEIGHTS_CACHE_KEY);
  }

  /**
   * Fetch all available signals for an application.
   * Failures are logged but non-fatal — partial scoring is supported.
   */
  async fetchSignals(application: {
    githubUrl?: string | null;
    codeforcesHandle?: string | null;
    leetcodeHandle?: string | null;
    userId: string;
  }): Promise<SignalInput[]> {
    const signals: SignalInput[] = [];
    const errors: string[] = [];

    // GitHub
    if (application.githubUrl) {
      const username = this.extractGitHubUsername(application.githubUrl);
      if (username) {
        try {
          const user = await this.app.prisma.user.findUnique({
            where: { id: application.userId },
            select: { githubTokenEnc: true },
          });
          const token = user?.githubTokenEnc
            ? decrypt(user.githubTokenEnc)
            : undefined;
          signals.push(await fetchGitHubSignal(username, token));
        } catch (e) {
          errors.push(`github: ${(e as Error).message}`);
        }
      }
    }

    // Codeforces
    if (application.codeforcesHandle) {
      try {
        signals.push(
          await fetchCodeforcesSignal(application.codeforcesHandle),
        );
      } catch (e) {
        errors.push(`codeforces: ${(e as Error).message}`);
      }
    }

    // LeetCode
    if (application.leetcodeHandle) {
      try {
        signals.push(await fetchLeetCodeSignal(application.leetcodeHandle));
      } catch (e) {
        errors.push(`leetcode: ${(e as Error).message}`);
      }
    }

    if (errors.length > 0) {
      this.app.log.warn({ errors }, "Some scoring signals failed to fetch");
    }

    return signals;
  }

  /**
   * Score an application: fetch signals, compute score, persist result.
   */
  async scoreApplication(applicationId: string): Promise<ScoringResult> {
    const application = await this.app.prisma.application.findUniqueOrThrow({
      where: { id: applicationId },
    });

    const [weights, signals] = await Promise.all([
      this.getWeights(),
      this.fetchSignals(application),
    ]);

    const cfg = this.app.config;
    const result = computeScore(
      signals,
      weights,
      cfg.SCORING_PASS_THRESHOLD,
    );

    const decision = deriveDecision(
      result.score,
      cfg.SCORING_AUTO_APPROVE_THRESHOLD,
      cfg.SCORING_AUTO_REJECT_THRESHOLD,
    );

    await this.app.prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: applicationId },
        data: {
          score: result.score,
          scoreBreakdown: result.breakdown as object,
          passingThreshold: cfg.SCORING_PASS_THRESHOLD,
          status: decision,
        },
      });

      // Auto-approve: also approve the user account
      if (decision === "APPROVED") {
        await tx.user.update({
          where: { id: application.userId },
          data: { status: "APPROVED" },
        });
      } else if (decision === "REJECTED") {
        await tx.user.update({
          where: { id: application.userId },
          data: { status: "REJECTED" },
        });
      }
    });

    return result;
  }

  /**
   * Backfill: re-score all applications in a given status.
   * Useful after changing weights.
   */
  async backfillScores(
    status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" = "UNDER_REVIEW",
  ): Promise<number> {
    const applications = await this.app.prisma.application.findMany({
      where: { status },
      select: { id: true },
    });

    const { getVerificationQueue } = await import("../../lib/queue");
    const queue = getVerificationQueue();

    for (const app of applications) {
      await queue.add("backfill", { applicationId: app.id });
    }

    return applications.length;
  }

  private extractGitHubUsername(input: string): string | null {
    if (input.includes("github.com/")) {
      const parts = input.split("github.com/");
      const username = parts[1]?.split("/")[0]?.split("?")[0];
      return username || null;
    }
    // Assume raw username
    return input.trim() || null;
  }
}
