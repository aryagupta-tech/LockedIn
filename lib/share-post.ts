/**
 * Share a post URL: Web Share API when available, otherwise copy link to clipboard.
 */
function getPostUrl(postId: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/post/${postId}`;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export type SharePostResult = "shared" | "copied" | "cancelled" | "failed";

export async function sharePost(options: {
  postId: string;
  authorDisplayName?: string;
  summary?: string | null;
}): Promise<SharePostResult> {
  const url = getPostUrl(options.postId);
  if (!url) return "failed";

  const title = options.authorDisplayName
    ? `${options.authorDisplayName} on LockedIn`
    : "LockedIn";
  const text = (options.summary?.trim() || "").slice(0, 280);

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title,
        text: text || title,
        url,
      });
      return "shared";
    } catch (e) {
      const name = e instanceof Error ? e.name : "";
      if (name === "AbortError") return "cancelled";
    }
  }

  const ok = await copyToClipboard(url);
  return ok ? "copied" : "failed";
}
