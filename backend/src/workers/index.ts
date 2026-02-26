import { loadConfig } from "../config";
import { createVerificationWorker } from "./verification.worker";
import { createRefreshDataWorker } from "./refresh-data.worker";

loadConfig();

console.log("Starting LockedIn background workers...");

const verificationWorker = createVerificationWorker();
const refreshWorker = createRefreshDataWorker();

console.log("Workers running: verification, refresh-data");

async function shutdown() {
  console.log("Shutting down workers...");
  await Promise.all([verificationWorker.close(), refreshWorker.close()]);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
