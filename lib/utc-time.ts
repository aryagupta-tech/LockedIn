/** Display wall-clock times for posts in Indian Standard Time (UTC+5:30), 24-hour clock. */
export const APP_DISPLAY_TIMEZONE = "Asia/Kolkata";

const DISPLAY_LOCALE = "en-IN";

/**
 * API/Postgres often returns timestamps without a timezone. JavaScript parses
 * those as *local* time, skewing "time ago" by the server/UTC offset. Treat
 * timezone-less ISO-like strings as UTC by normalizing to a Z suffix.
 */
export function normalizeApiTimestamp(raw: string): string {
  let s = raw.trim();
  if (!s) return s;
  if (s.includes(" ") && !s.includes("T")) {
    s = s.replace(" ", "T");
  }
  const hasOffset =
    /[zZ]$/.test(s) || /[+-]\d{2}:?\d{2}$/.test(s);
  if (!hasOffset && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
    return s.endsWith("Z") ? s : `${s}Z`;
  }
  return s;
}

export function parseUtcInstant(raw: string | null | undefined): number {
  if (raw == null) return NaN;
  const t = Date.parse(normalizeApiTimestamp(String(raw)));
  return Number.isNaN(t) ? NaN : t;
}

export function formatRelativeTime(
  createdAt: string,
  opts?: { subMinuteLabel?: string },
): string {
  const t = parseUtcInstant(createdAt);
  if (Number.isNaN(t)) return "";
  const seconds = Math.floor((Date.now() - t) / 1000);
  const sub = opts?.subMinuteLabel ?? "now";
  if (seconds < 60) return sub;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(t).toLocaleDateString(DISPLAY_LOCALE, {
    timeZone: APP_DISPLAY_TIMEZONE,
    month: "short",
    day: "numeric",
  });
}

export function formatPostAbsoluteDateTime(createdAt: string): {
  date: string;
  time: string;
} | null {
  const t = parseUtcInstant(createdAt);
  if (Number.isNaN(t)) return null;
  const d = new Date(t);
  const clock = d.toLocaleTimeString(DISPLAY_LOCALE, {
    timeZone: APP_DISPLAY_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return {
    date: d.toLocaleDateString(DISPLAY_LOCALE, {
      timeZone: APP_DISPLAY_TIMEZONE,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: `${clock} IST`,
  };
}
