import type { FastifyInstance } from "fastify";

export class FeedService {
  constructor(private readonly app: FastifyInstance) {}

  /**
   * Returns a chronological feed of posts from:
   * 1. Users the viewer follows
   * 2. Communities the viewer belongs to
   *
   * Cursor-based pagination using createdAt for stable paging.
   */
  async getFeed(
    userId: string,
    opts: { cursor?: string; limit?: number },
  ) {
    const limit = Math.min(opts.limit || 20, 50);

    const [followedIds, communityIds] = await Promise.all([
      this.app.prisma.follow
        .findMany({
          where: { followerId: userId },
          select: { followingId: true },
        })
        .then((rows) => rows.map((r) => r.followingId)),

      this.app.prisma.communityMember
        .findMany({
          where: { userId },
          select: { communityId: true },
        })
        .then((rows) => rows.map((r) => r.communityId)),
    ]);

    // Include user's own posts
    const authorIds = [...new Set([...followedIds, userId])];

    const cursorFilter = opts.cursor
      ? { createdAt: { lt: new Date(opts.cursor) } }
      : {};

    const posts = await this.app.prisma.post.findMany({
      where: {
        AND: [
          {
            OR: [
              { authorId: { in: authorIds } },
              ...(communityIds.length > 0
                ? [{ communityId: { in: communityIds } }]
                : []),
            ],
          },
          cursorFilter,
        ],
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        community: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    });

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore
      ? items[items.length - 1].createdAt.toISOString()
      : null;

    // Batch-check likes for the viewer
    const likedSet = new Set<string>();
    if (items.length > 0) {
      const likes = await this.app.prisma.postLike.findMany({
        where: {
          userId,
          postId: { in: items.map((p) => p.id) },
        },
        select: { postId: true },
      });
      likes.forEach((l) => likedSet.add(l.postId));
    }

    return {
      items: items.map((p) => ({ ...p, hasLiked: likedSet.has(p.id) })),
      nextCursor,
      hasMore,
    };
  }
}
