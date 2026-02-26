import { Worker, type Job } from "bullmq";
import { createBullConnection } from "../lib/redis";
import { prisma } from "../lib/prisma";
import { QUEUE_NAMES } from "../lib/queue";
import {
  computeScore,
  deriveDecision,
  type SignalInput,
  type WeightConfig,
} from "../modules/scoring/scoring.engine";
import { fetchGitHubSignal } from "../modules/scoring/providers/github.provider";
import { fetchCodeforcesSignal } from "../modules/scoring/providers/codeforces.provider";
import { fetchLeetCodeSignal } from "../modules/scoring/providers/leetcode.provider";
import { decrypt } from "../lib/crypto";
import { getConfig } from "../config";

interface VerificationPayload {
  applicationId: string;
}

async function loadWeights(): Promise<WeightConfig[]> {
  const rows = await prisma.scoringWeight.findMany();
  return rows.map((r) => ({
    key: r.key,
    weight: r.weight,
    threshold: r.threshold,
    minimum: r.minimum,
  }));
}

async function fetchSignals(application: {
  githubUrl: string | null;
  codeforcesHandle: string | null;
  leetcodeHandle: string | null;
  userId: string;
}): Promise<SignalInput[]> {
  const signals: SignalInput[] = [];

  if (application.githubUrl) {
    const username = extractGitHubUsername(application.githubUrl);
    if (username) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: application.userId },
          select: { githubTokenEnc: true },
        });
        const token = user?.githubTokenEnc
          ? decrypt(user.githubTokenEnc)
          : undefined;
        signals.push(await fetchGitHubSignal(username, token));
      } catch (e) {
        console.warn(`GitHub fetch failed: ${(e as Error).message}`);
      }
    }
  }

  if (application.codeforcesHandle) {
    try {
      signals.push(await fetchCodeforcesSignal(application.codeforcesHandle));
    } catch (e) {
      console.warn(`Codeforces fetch failed: ${(e as Error).message}`);
    }
  }

  if (application.leetcodeHandle) {
    try {
      signals.push(await fetchLeetCodeSignal(application.leetcodeHandle));
    } catch (e) {
      console.warn(`LeetCode fetch failed: ${(e as Error).message}`);
    }
  }

  return signals;
}

function extractGitHubUsername(input: string): string | null {
  if (input.includes("github.com/")) {
    const parts = input.split("github.com/");
    return parts[1]?.split("/")[0]?.split("?")[0] || null;
  }
  return input.trim() || null;
}

async function processVerification(job: Job<VerificationPayload>) {
  const { applicationId } = job.data;
  const cfg = getConfig();

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
  });

  if (!application) {
    console.warn(`Application ${applicationId} not found, skipping`);
    return;
  }

  console.log(`Scoring application ${applicationId}...`);

  await prisma.application.update({
    where: { id: applicationId },
    data: { status: "PROCESSING" },
  });

  const [weights, signals] = await Promise.all([
    loadWeights(),
    fetchSignals(application),
  ]);

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

  await prisma.$transaction(async (tx) => {
    await tx.application.update({
      where: { id: applicationId },
      data: {
        score: result.score,
        scoreBreakdown: result.breakdown as object,
        passingThreshold: cfg.SCORING_PASS_THRESHOLD,
        status: decision,
      },
    });

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

  console.log(
    `Application ${applicationId} scored ${result.score} → ${decision}`,
  );
}

export function createVerificationWorker(): Worker {
  const worker = new Worker<VerificationPayload>(
    QUEUE_NAMES.VERIFICATION,
    processVerification,
    {
      connection: createBullConnection(),
      concurrency: 5,
      limiter: { max: 10, duration: 60_000 },
    },
  );

  worker.on("failed", (job, err) => {
    console.error(
      `Verification job ${job?.id} failed (attempt ${job?.attemptsMade}):`,
      err.message,
    );
  });

  worker.on("completed", (job) => {
    console.log(`Verification job ${job.id} completed`);
  });

  return worker;
}
