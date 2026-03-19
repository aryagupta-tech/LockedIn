/** Extract GitHub login from a profile URL or raw handle. */
export function extractGitHubUsername(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (s.includes("github.com/")) {
    const parts = s.split("github.com/");
    return parts[1]?.split("/")[0]?.split("?")[0]?.trim() || null;
  }
  return s;
}
