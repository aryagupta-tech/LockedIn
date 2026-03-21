import type { SupabaseClient } from "@supabase/supabase-js";

function isRpcMissing(e: { code?: string; message?: string }) {
  const msg = e.message || "";
  return (
    e.code === "PGRST202" ||
    msg.includes("Could not find the function") ||
    msg.includes("does not exist")
  );
}

/** Atomic +1 / −1 on posts.likesCount when RPC exists; otherwise runs fallback. */
export async function bumpPostLikes(
  supabase: SupabaseClient,
  postId: string,
  delta: number,
  resyncFromLikesTable: () => Promise<void>,
): Promise<void> {
  const { error } = await supabase.rpc("lockedin_bump_post_likes", {
    p_post_id: postId,
    p_delta: delta,
  });
  if (!error) return;
  if (isRpcMissing(error)) {
    await resyncFromLikesTable();
    return;
  }
  throw error;
}

/** Atomic +1 / −1 on posts.commentsCount when RPC exists; otherwise runs fallback. */
export async function bumpPostComments(
  supabase: SupabaseClient,
  postId: string,
  delta: number,
  resyncFromCommentsTable: () => Promise<void>,
): Promise<void> {
  const { error } = await supabase.rpc("lockedin_bump_post_comments", {
    p_post_id: postId,
    p_delta: delta,
  });
  if (!error) return;
  if (isRpcMissing(error)) {
    await resyncFromCommentsTable();
    return;
  }
  throw error;
}
