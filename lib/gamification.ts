/**
 * Builder levels & badges — derived from real activity (posts, code, comments, network).
 * All values are computed on read; no separate gamification table required.
 */

export type BadgeTier = "bronze" | "silver" | "gold";

export type BadgeId =
  | "verified"
  | "first_ship"
  | "ship_5"
  | "ship_20"
  | "code_path"
  | "threads_voice"
  | "signal_circle"
  | "four_week_run";

export interface BadgeDefinition {
  id: BadgeId;
  name: string;
  description: string;
  tier: BadgeTier;
}

export const BADGE_CATALOG: Record<BadgeId, BadgeDefinition> = {
  verified: {
    id: "verified",
    name: "Verified builder",
    description: "Passed the gate — your profiles are tied to real signal.",
    tier: "gold",
  },
  first_ship: {
    id: "first_ship",
    name: "First ship",
    description: "Shared your first post on the network.",
    tier: "bronze",
  },
  ship_5: {
    id: "ship_5",
    name: "Shipping habit",
    description: "Five posts logged — consistency counts.",
    tier: "silver",
  },
  ship_20: {
    id: "ship_20",
    name: "High output",
    description: "Twenty posts — you’re showing the work.",
    tier: "gold",
  },
  code_path: {
    id: "code_path",
    name: "Code path",
    description: "Three posts with code snippets — craft on display.",
    tier: "silver",
  },
  threads_voice: {
    id: "threads_voice",
    name: "Thread voice",
    description: "Ten comments — you’re helping the graph think.",
    tier: "silver",
  },
  signal_circle: {
    id: "signal_circle",
    name: "Signal circle",
    description: "Ten followers — people opt in to your updates.",
    tier: "gold",
  },
  four_week_run: {
    id: "four_week_run",
    name: "Four-week run",
    description: "Posted in four different calendar weeks — rhythm, not noise.",
    tier: "gold",
  },
};

export interface BuilderMetrics {
  status: string;
  createdAt: string;
  postsCount: number;
  postsWithCodeCount: number;
  commentsCount: number;
  followersCount: number;
  followingCount: number;
  /** ISO week keys e.g. "2026-W11" from post dates */
  distinctWeeksWithPosts: number;
}

export interface EarnedBadge {
  id: BadgeId;
  name: string;
  description: string;
  tier: BadgeTier;
}

export interface BuilderProgress {
  level: number;
  /** Total XP (used for level math) */
  totalXp: number;
  /** XP accumulated within current level (0–99) */
  xpInLevel: number;
  /** XP needed to finish current level (100 - xpInLevel, or 0 at max) */
  xpToNext: number;
  maxLevel: number;
  badges: EarnedBadge[];
  /** Short copy for empty states */
  nextMilestoneHint: string | null;
}

const MAX_LEVEL = 20;
const XP_PER_LEVEL = 100;

function isoWeekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const start = Date.UTC(y, 0, 1);
  const week = Math.ceil(((t.getTime() - start) / 86400000 + 1) / 7);
  return `${y}-W${String(week).padStart(2, "0")}`;
}

/** Count distinct ISO weeks from post timestamps */
export function distinctWeeksFromPostDates(dates: string[]): number {
  const set = new Set<string>();
  for (const iso of dates) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) set.add(isoWeekKey(d));
  }
  return set.size;
}

export function computeXp(m: BuilderMetrics): number {
  let xp = 0;
  if (m.status === "APPROVED") xp += 85;
  xp += m.postsCount * 18;
  xp += m.postsWithCodeCount * 14;
  xp += m.commentsCount * 4;
  xp += Math.min(m.followersCount * 2, 40);
  xp += Math.min(m.followingCount, 30);
  const streak = Math.max(0, m.distinctWeeksWithPosts - 1);
  xp += Math.min(streak * 12, 72);
  return xp;
}

function levelFromTotalXp(total: number): { level: number; xpInLevel: number; xpToNext: number } {
  if (total <= 0) {
    return { level: 1, xpInLevel: 0, xpToNext: XP_PER_LEVEL };
  }
  const rawLevel = 1 + Math.floor(total / XP_PER_LEVEL);
  const level = Math.min(MAX_LEVEL, rawLevel);
  const xpInLevel = total % XP_PER_LEVEL;
  if (level >= MAX_LEVEL) {
    return { level: MAX_LEVEL, xpInLevel: xpInLevel === 0 ? XP_PER_LEVEL : xpInLevel, xpToNext: 0 };
  }
  return { level, xpInLevel, xpToNext: XP_PER_LEVEL - xpInLevel };
}

function nextMilestoneHint(m: BuilderMetrics, earned: Set<BadgeId>): string | null {
  if (!earned.has("first_ship") && m.postsCount < 1) return "Share your first post to unlock First ship.";
  if (m.postsCount < 5) return `${5 - m.postsCount} more post${5 - m.postsCount === 1 ? "" : "s"} until Shipping habit.`;
  if (m.postsWithCodeCount < 3) return `${3 - m.postsWithCodeCount} more code snippet post${3 - m.postsWithCodeCount === 1 ? "" : "s"} for Code path.`;
  if (m.commentsCount < 10) return `${10 - m.commentsCount} more comment${10 - m.commentsCount === 1 ? "" : "s"} for Thread voice.`;
  if (m.followersCount < 10) return `${10 - m.followersCount} more follower${10 - m.followersCount === 1 ? "" : "s"} for Signal circle.`;
  if (m.distinctWeeksWithPosts < 4) return "Post across more weeks to earn Four-week run.";
  if (m.postsCount < 20) return `${20 - m.postsCount} more posts for High output.`;
  return "You’ve cleared the starter milestones — keep shipping.";
}

export function computeBuilderProgress(m: BuilderMetrics): BuilderProgress {
  const totalXp = computeXp(m);
  const { level, xpInLevel, xpToNext } = levelFromTotalXp(totalXp);

  const earned = new Set<BadgeId>();
  if (m.status === "APPROVED") earned.add("verified");
  if (m.postsCount >= 1) earned.add("first_ship");
  if (m.postsCount >= 5) earned.add("ship_5");
  if (m.postsCount >= 20) earned.add("ship_20");
  if (m.postsWithCodeCount >= 3) earned.add("code_path");
  if (m.commentsCount >= 10) earned.add("threads_voice");
  if (m.followersCount >= 10) earned.add("signal_circle");
  if (m.distinctWeeksWithPosts >= 4) earned.add("four_week_run");

  const badges: EarnedBadge[] = [...earned].map((id) => {
    const def = BADGE_CATALOG[id];
    return {
      id,
      name: def.name,
      description: def.description,
      tier: def.tier,
    };
  });

  badges.sort((a, b) => {
    const tierOrder: BadgeTier[] = ["bronze", "silver", "gold"];
    const ta = tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier);
    if (ta !== 0) return ta;
    return a.name.localeCompare(b.name);
  });

  return {
    level,
    totalXp,
    xpInLevel,
    xpToNext,
    maxLevel: MAX_LEVEL,
    badges,
    nextMilestoneHint: nextMilestoneHint(m, earned),
  };
}
