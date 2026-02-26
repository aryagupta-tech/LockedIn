import { Queue } from "bullmq";
import { createBullConnection } from "./redis";

export const QUEUE_NAMES = {
  VERIFICATION: "verification",
  REFRESH_DATA: "refresh-data",
} as const;

let _verificationQueue: Queue | null = null;
let _refreshDataQueue: Queue | null = null;

export function getVerificationQueue(): Queue {
  if (!_verificationQueue) {
    _verificationQueue = new Queue(QUEUE_NAMES.VERIFICATION, {
      connection: createBullConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });
  }
  return _verificationQueue;
}

export function getRefreshDataQueue(): Queue {
  if (!_refreshDataQueue) {
    _refreshDataQueue = new Queue(QUEUE_NAMES.REFRESH_DATA, {
      connection: createBullConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 10_000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 2000 },
      },
    });
  }
  return _refreshDataQueue;
}
