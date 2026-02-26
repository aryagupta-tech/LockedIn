import { Worker, type Job } from "bullmq";
import { createBullConnection } from "../lib/redis";
import { getRedis } from "../lib/redis";
import { prisma } from "../lib/prisma";
import { QUEUE_NAMES } from "../lib/queue";
import { fetchGitHubSignal } from "../modules/scoring/providers/github.provider";
import { fetchCodeforcesSignal } from "../modules/scoring/providers/codeforces.provider";
import { fetchLeetCodeSignal } from "../modules/scoring/providers/leetcode.provider";
import { decrypt } from "../lib/crypto";
import { loadConfig } from "../config";

interface RefreshPayload {
  userId: string;
  provider: "github" | "codeforces" | "leetcode";
}

const BACKOFF_KEY_PREFIX = "refresh:backoff:";
const MAX_BACKOFF_SECONDS = 3600; // 1 hour cap
const INITIAL_BACKOFF_SECONDS = 30;

/**
 * Exponential backoff state stored in Redis.
 * On success: delete the key.
 * On failure: increment attempts and double the delay.
 */
async function checkBackoff(
  userId: string,
  provider: string,
): Promise<boolean> {
  const redis = getRedis();
  const key = `${BACKOFF_KEY_PREFIX}${provider}:${userId}`;
  const raw = await redis.get(key);

  if (!raw) return true; // no backoff

  const state = JSON.parse(raw) as {
    attempts: number;
    nextRetryAt: number;
  };

  return Date.now() >= state.nextRetryAt;
}

async function recordFailure(
  userId: string,
  provider: string,
): Promise<void> {
  const redis = getRedis();
  const key = `${BACKOFF_KEY_PREFIX}${provider}:${userId}`;
  const raw = await redis.get(key);

  const attempts = raw ? (JSON.parse(raw) as { attempts: number }).attempts + 1 : 1;
  const delay = Math.min(
    INITIAL_BACKOFF_SECONDS * Math.pow(2, attempts - 1),
    MAX_BACKOFF_SECONDS,
  );

  await redis.set(
    key,
    JSON.stringify({
      attempts,
      nextRetryAt: Date.now() + delay * 1000,
    }),
    "EX",
    delay * 2,
  );
}

async function clearBackoff(
  userId: string,
  provider: string,
): Promise<void> {
  const redis = getRedis();
  await redis.del(`${BACKOFF_KEY_PREFIX}${provider}:${userId}`);
}

async function processRefresh(job: Job<RefreshPayload>) {
  loadConfig();
  const { userId, provider } = job.data;

  const canProceed = await checkBackoff(userId, provider);
  if (!canProceed) {
    console.log(`Backoff active for ${provider}:${userId}, skipping`);
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      githubUsername: true,
      githubTokenEnc: true,
      codeforcesHandle: true,
      leetcodeHandle: true,
    },
  });

  if (!user) return;

  try {
    let signal;

    switch (provider) {
      case "github":
        if (!user.githubUsername) return;
        signal = await fetchGitHubSignal(
          user.githubUsername,
          user.githubTokenEnc ? decrypt(user.githubTokenEnc) : undefined,
        );
        break;
      case "codeforces":
        if (!user.codeforcesHandle) return;
        signal = await fetchCodeforcesSignal(user.codeforcesHandle);
        break;
      case "leetcode":
        if (!user.leetcodeHandle) return;
        signal = await fetchLeetCodeSignal(user.leetcodeHandle);
        break;
    }

    if (signal) {
      // Cache the fresh signal value
      const redis = getRedis();
      await redis.set(
        `signal:${provider}:${userId}`,
        JSON.stringify(signal),
        "EX",
        86400, // 24 hours
      );
      await clearBackoff(userId, provider);
      console.log(`Refreshed ${provider} data for ${userId}: ${signal.rawValue}`);
    }
  } catch (error) {
    await recordFailure(userId, provider);
    throw error; // BullMQ will handle the retry with its own backoff
  }
}

export function createRefreshDataWorker(): Worker {
  const worker = new Worker<RefreshPayload>(
    QUEUE_NAMES.REFRESH_DATA,
    processRefresh,
    {
      connection: createBullConnection(),
      concurrency: 3,
      limiter: { max: 5, duration: 60_000 },
    },
  );

  worker.on("failed", (job, err) => {
    console.error(
      `Refresh job ${job?.id} failed (attempt ${job?.attemptsMade}):`,
      err.message,
    );
  });

  return worker;
}
