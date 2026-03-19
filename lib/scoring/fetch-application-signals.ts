import type { SignalInput } from "./engine";
import { fetchGitHubSignal } from "./providers/github";
import { fetchCodeforcesSignal } from "./providers/codeforces";
import { fetchLeetCodeSignal } from "./providers/leetcode";

export function extractGitHubUsername(input: string): string | null {
  if (input.includes("github.com/")) {
    const parts = input.split("github.com/");
    return parts[1]?.split("/")[0]?.split("?")[0] || null;
  }
  return input.trim() || null;
}

export type FetchSignalsResult = {
  signals: SignalInput[];
  errors: Record<string, string>;
};

/**
 * Fetches all signals we can resolve for an application. Individual provider
 * failures are captured in `errors` instead of failing the whole request.
 */
export async function fetchApplicationSignals(app: {
  githubUrl?: string | null;
  codeforcesHandle?: string | null;
  leetcodeHandle?: string | null;
}): Promise<FetchSignalsResult> {
  const signals: SignalInput[] = [];
  const errors: Record<string, string> = {};

  if (app.githubUrl) {
    const u = extractGitHubUsername(app.githubUrl);
    if (u) {
      try {
        signals.push(await fetchGitHubSignal(u));
      } catch (e) {
        errors.github = e instanceof Error ? e.message : String(e);
      }
    }
  }

  if (app.codeforcesHandle?.trim()) {
    try {
      signals.push(await fetchCodeforcesSignal(app.codeforcesHandle.trim()));
    } catch (e) {
      errors.codeforces = e instanceof Error ? e.message : String(e);
    }
  }

  if (app.leetcodeHandle?.trim()) {
    try {
      signals.push(await fetchLeetCodeSignal(app.leetcodeHandle.trim()));
    } catch (e) {
      errors.leetcode = e instanceof Error ? e.message : String(e);
    }
  }

  return { signals, errors };
}
