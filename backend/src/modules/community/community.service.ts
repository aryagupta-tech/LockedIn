import type { FastifyInstance } from "fastify";
import { NotFoundError, ConflictError, ForbiddenError } from "../../lib/errors";

export class CommunityService {
  constructor(private readonly app: FastifyInstance) {}

  async create(
    ownerId: string,
    data: {
      name: string;
      slug: string;
      description?: string;
      isPrivate?: boolean;
      gatingCriteria?: object;
    },
  ) {
    const existing = await this.app.prisma.community.findUnique({
      where: { slug: data.slug },
    });
    if (existing) throw new ConflictError("A community with this slug already exists");

    return this.app.prisma.$transaction(async (tx) => {
      const community = await tx.community.create({
        data: {
          ...data,
          ownerId,
          memberCount: 1,
        },
        include: {
          owner: { select: { id: true, username: true, displayName: true } },
        },
      });

      await tx.communityMember.create({
        data: { communityId: community.id, userId: ownerId, role: "OWNER" },
      });

      return community;
    });
  }

  async list(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const communities = await this.app.prisma.community.findMany({
      include: {
        owner: { select: { id: true, username: true, displayName: true } },
      },
      orderBy: { memberCount: "desc" },
      skip,
      take: limit,
    });
    return communities;
  }

  async getBySlug(slug: string) {
    const community = await this.app.prisma.community.findUnique({
      where: { slug },
      include: {
        owner: { select: { id: true, username: true, displayName: true } },
      },
    });
    if (!community) throw new NotFoundError("Community", slug);
    return community;
  }

  async requestJoin(communityId: string, userId: string) {
    const community = await this.app.prisma.community.findUnique({
      where: { id: communityId },
    });
    if (!community) throw new NotFoundError("Community", communityId);

    const isMember = await this.app.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });
    if (isMember) throw new ConflictError("Already a member");

    // Auto-admit for public communities with no gating criteria
    if (!community.isPrivate && !community.gatingCriteria) {
      return this.admitMember(communityId, userId);
    }

    // Check gating criteria (score-based auto-admit)
    if (community.gatingCriteria) {
      const criteria = community.gatingCriteria as { minScore?: number };
      if (criteria.minScore) {
        const latestApp = await this.app.prisma.application.findFirst({
          where: { userId, status: "APPROVED" },
          orderBy: { createdAt: "desc" },
        });
        if (latestApp?.score && latestApp.score >= criteria.minScore) {
          return this.admitMember(communityId, userId);
        }
      }
    }

    try {
      await this.app.prisma.communityJoinRequest.create({
        data: { communityId, userId },
      });
    } catch {
      throw new ConflictError("Join request already pending");
    }

    return { status: "PENDING" };
  }

  async reviewJoinRequest(
    requestId: string,
    reviewerId: string,
    decision: "APPROVED" | "REJECTED",
  ) {
    const request = await this.app.prisma.communityJoinRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundError("JoinRequest", requestId);

    // Verify the reviewer is owner or moderator
    const membership = await this.app.prisma.communityMember.findUnique({
      where: {
        communityId_userId: {
          communityId: request.communityId,
          userId: reviewerId,
        },
      },
    });
    if (!membership || membership.role === "MEMBER") {
      throw new ForbiddenError("Only owners and moderators can review requests");
    }

    await this.app.prisma.communityJoinRequest.update({
      where: { id: requestId },
      data: { status: decision, reviewerId, reviewedAt: new Date() },
    });

    if (decision === "APPROVED") {
      await this.admitMember(request.communityId, request.userId);
    }

    return { status: decision };
  }

  async getMembers(communityId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return this.app.prisma.communityMember.findMany({
      where: { communityId },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { joinedAt: "desc" },
      skip,
      take: limit,
    });
  }

  private async admitMember(communityId: string, userId: string) {
    await this.app.prisma.$transaction([
      this.app.prisma.communityMember.create({
        data: { communityId, userId },
      }),
      this.app.prisma.community.update({
        where: { id: communityId },
        data: { memberCount: { increment: 1 } },
      }),
    ]);
    return { status: "APPROVED" };
  }
}
