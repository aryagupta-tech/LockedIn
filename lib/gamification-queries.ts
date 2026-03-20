import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type BuilderMetrics,
  computeBuilderProgress,
  distinctWeeksFromPostDates,
  type BuilderProgress,
} from "@/lib/gamification";

/**
 * Load activity metrics and return builder progress for API responses.
 */
export async function getBuilderProgressForUser(
  supabase: SupabaseClient,
  userId: string,
  row: { status: string; createdAt: string },
  existingPostsCount?: number,
): Promise<BuilderProgress> {
  const postsCountPromise =
    existingPostsCount !== undefined
      ? Promise.resolve({ count: existingPostsCount, error: null })
      : supabase.from("posts").select("*", { count: "exact", head: true }).eq("authorId", userId);

  const [codeRes, commentsRes, postsDatesRes, postsCountRes] = await Promise.all([
    supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("authorId", userId)
      .not("codeSnippet", "is", null),
    supabase.from("comments").select("*", { count: "exact", head: true }).eq("authorId", userId),
    supabase.from("posts").select("createdAt").eq("authorId", userId).order("createdAt", { ascending: false }).limit(800),
    postsCountPromise,
  ]);

  const postsCount = postsCountRes.count ?? 0;
  const postsWithCodeCount = codeRes.count ?? 0;
  const commentsCount = commentsRes.count ?? 0;
  const dates = (postsDatesRes.data || []).map((r) => r.createdAt as string);
  const distinctWeeksWithPosts = distinctWeeksFromPostDates(dates);

  const [followersRes, followingRes] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("followingId", userId),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("followerId", userId),
  ]);

  const metrics: BuilderMetrics = {
    status: row.status,
    createdAt: row.createdAt,
    postsCount,
    postsWithCodeCount,
    commentsCount,
    followersCount: followersRes.count ?? 0,
    followingCount: followingRes.count ?? 0,
    distinctWeeksWithPosts,
  };

  return computeBuilderProgress(metrics);
}
