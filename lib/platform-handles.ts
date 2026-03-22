/**
 * Normalize pasted profile URLs or raw handles for LeetCode / Codeforces / Codolio.
 * Does not weaken ownership checks — verification still requires GitHub match / org phrase / Codolio-linked GitHub.
 */

const RESERVED_LEETCODE_PATH = new Set([
  "problems",
  "contest",
  "discuss",
  "accounts",
  "subscribe",
  "explore",
  "profile",
  "graphql",
  "api",
  "studyplan",
  "universal",
  "business",
  "u", // bare /u with no username
]);

function decodeSeg(seg: string): string {
  try {
    return decodeURIComponent(seg);
  } catch {
    return seg;
  }
}

/**
 * Returns the LeetCode username for GraphQL/API, or "" if input looks like a URL but is not a profile.
 */
export function normalizeLeetCodeHandle(raw: string): string {
  const s = raw.trim().replace(/^@+/, "");
  if (!s) return "";

  const fromLeetcodeHost = (urlStr: string): string => {
    try {
      const u = new URL(urlStr.includes("://") ? urlStr : `https://${urlStr}`);
      const host = u.hostname.replace(/^www\./i, "");
      if (host !== "leetcode.com" && host !== "leetcode.cn") return "";

      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0]?.toLowerCase() === "u" && parts[1]) {
        const h = decodeSeg(parts[1]);
        if (RESERVED_LEETCODE_PATH.has(h.toLowerCase())) return "";
        return h;
      }
      if (parts.length === 1 && parts[0]) {
        const h = decodeSeg(parts[0]);
        if (RESERVED_LEETCODE_PATH.has(h.toLowerCase())) return "";
        return h;
      }
      return "";
    } catch {
      return "";
    }
  };

  if (/leetcode\.(?:com|cn)/i.test(s)) {
    return fromLeetcodeHost(s);
  }

  if (/^https?:\/\//i.test(s)) {
    return fromLeetcodeHost(s);
  }

  const first = s.split(/[/?#]/)[0]?.trim() ?? "";
  if (!first) return "";
  if (/^[a-zA-Z0-9._-]+$/.test(first)) return first;
  return "";
}

/**
 * Returns the Codeforces handle for the public API, or "" if input looks like a URL but is not /profile/...
 */
export function normalizeCodeforcesHandle(raw: string): string {
  const s = raw.trim().replace(/^@+/, "");
  if (!s) return "";

  const fromCfHost = (urlStr: string): string => {
    try {
      const u = new URL(urlStr.includes("://") ? urlStr : `https://${urlStr}`);
      const host = u.hostname.replace(/^www\./i, "");
      if (host !== "codeforces.com") return "";

      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0]?.toLowerCase() === "profile" && parts[1]) {
        return decodeSeg(parts[1]);
      }
      return "";
    } catch {
      return "";
    }
  };

  if (/codeforces\.com/i.test(s)) {
    return fromCfHost(s);
  }

  if (/^https?:\/\//i.test(s)) {
    return fromCfHost(s);
  }

  const first = s.split(/[/?#]/)[0]?.trim() ?? "";
  if (!first) return "";
  if (/^[a-zA-Z0-9_.-]+$/.test(first)) return first;
  return "";
}

/**
 * Codolio public profile “userKey” (shown as @name on profiles), from a URL or raw handle.
 */
export function normalizeCodolioProfileKey(raw: string): string {
  const s = raw.trim().replace(/^@+/, "");
  if (!s) return "";

  const fromCodolioHost = (urlStr: string): string => {
    try {
      const u = new URL(urlStr.includes("://") ? urlStr : `https://${urlStr}`);
      const host = u.hostname.replace(/^www\./i, "").toLowerCase();
      if (host !== "codolio.com" && !host.endsWith(".codolio.com")) return "";

      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0]?.toLowerCase() === "profile" && parts[1]) {
        return decodeSeg(parts[1]);
      }
      return "";
    } catch {
      return "";
    }
  };

  if (/codolio\.com/i.test(s)) {
    return fromCodolioHost(s);
  }

  if (/^https?:\/\//i.test(s)) {
    return fromCodolioHost(s);
  }

  const first = s.split(/[/?#]/)[0]?.trim() ?? "";
  if (!first) return "";
  if (/^[a-zA-Z0-9._-]+$/.test(first)) return first;
  return "";
}
