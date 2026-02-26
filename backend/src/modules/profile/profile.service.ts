import type { FastifyInstance } from "fastify";
import { NotFoundError, ConflictError } from "../../lib/errors";

export class ProfileService {
  constructor(private readonly app: FastifyInstance) {}

  async getByUsername(username: string, viewerId?: string) {
    const user = await this.app.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        githubUsername: true,
        codeforcesHandle: true,
        leetcodeHandle: true,
        portfolioUrl: true,
        role: true,
        createdAt: true,
        _count: { select: { followers: true, following: true } },
      },
    });

    if (!user) throw new NotFoundError("Profile", username);

    let isFollowing: boolean | undefined;
    if (viewerId && viewerId !== user.id) {
      const follow = await this.app.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: viewerId,
            followingId: user.id,
          },
        },
      });
      isFollowing = !!follow;
    }

    return {
      ...user,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      isFollowing,
    };
  }

  async updateProfile(userId: string, data: Record<string, unknown>) {
    return this.app.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        githubUsername: true,
        codeforcesHandle: true,
        leetcodeHandle: true,
        portfolioUrl: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async follow(followerId: string, targetId: string) {
    if (followerId === targetId) {
      throw new ConflictError("Cannot follow yourself");
    }

    const target = await this.app.prisma.user.findUnique({
      where: { id: targetId },
    });
    if (!target) throw new NotFoundError("User", targetId);

    try {
      await this.app.prisma.follow.create({
        data: { followerId, followingId: targetId },
      });
    } catch {
      throw new ConflictError("Already following this user");
    }

    return { followed: true };
  }

  async unfollow(followerId: string, targetId: string) {
    const result = await this.app.prisma.follow.deleteMany({
      where: { followerId, followingId: targetId },
    });
    return { unfollowed: result.count > 0 };
  }
}
