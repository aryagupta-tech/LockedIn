import type { SignalInput } from "./engine";
import { extractGitHubUsername } from "@/lib/github-username";
import { fetchGitHubSignal } from "./providers/github";
import { fetchCodeforcesSignal } from "./providers/codeforces";
import { fetchCodolioSignal } from "./providers/codolio";
import { fetchLeetCodeSignal } from "./providers/leetcode";

export { extractGitHubUsername };

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
  codolioProfile?: string | null;
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

  if (app.codolioProfile?.trim()) {
    try {
      signals.push(await fetchCodolioSignal(app.codolioProfile.trim()));
    } catch (e) {
      errors.codolio = e instanceof Error ? e.message : String(e);
    }
  }

  return { signals, errors };
}
