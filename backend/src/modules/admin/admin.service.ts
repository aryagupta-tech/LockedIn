import type { FastifyInstance } from "fastify";
import { NotFoundError } from "../../lib/errors";

export class AdminService {
  constructor(private readonly app: FastifyInstance) {}

  async listApplications(filters: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where = filters.status ? { status: filters.status as never } : {};

    const [items, total] = await Promise.all([
      this.app.prisma.application.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              displayName: true,
              githubUsername: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.app.prisma.application.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async reviewApplication(
    applicationId: string,
    reviewerId: string,
    decision: "APPROVED" | "REJECTED" | "UNDER_REVIEW",
    note?: string,
  ) {
    const application = await this.app.prisma.application.findUnique({
      where: { id: applicationId },
    });
    if (!application) throw new NotFoundError("Application", applicationId);

    return this.app.prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: decision,
          reviewerId,
          reviewNote: note,
          reviewedAt: new Date(),
        },
      });

      if (decision === "APPROVED") {
        await tx.user.update({
          where: { id: application.userId },
          data: { status: "APPROVED" },
        });
      } else if (decision === "REJECTED") {
        await tx.user.update({
          where: { id: application.userId },
          data: { status: "REJECTED" },
        });
      }

      return updated;
    });
  }

  async getWeights() {
    return this.app.prisma.scoringWeight.findMany({
      orderBy: { key: "asc" },
    });
  }

  async updateWeight(
    key: string,
    adminId: string,
    data: { weight?: number; threshold?: number; minimum?: number },
  ) {
    const existing = await this.app.prisma.scoringWeight.findUnique({
      where: { key },
    });
    if (!existing) throw new NotFoundError("ScoringWeight", key);

    const updated = await this.app.prisma.scoringWeight.update({
      where: { key },
      data: { ...data, updatedById: adminId },
    });

    // Invalidate weight cache
    const { ScoringService } = await import("../scoring/scoring.service");
    const scoringService = new ScoringService(this.app);
    await scoringService.invalidateWeightsCache();

    return updated;
  }

  async listAppeals(filters: { status?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where = filters.status ? { status: filters.status as never } : {};

    const [items, total] = await Promise.all([
      this.app.prisma.appeal.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, username: true } },
          application: { select: { id: true, score: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.app.prisma.appeal.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async reviewAppeal(
    appealId: string,
    reviewerId: string,
    decision: "APPROVED" | "REJECTED",
    note?: string,
  ) {
    const appeal = await this.app.prisma.appeal.findUnique({
      where: { id: appealId },
      include: { application: true },
    });
    if (!appeal) throw new NotFoundError("Appeal", appealId);

    return this.app.prisma.$transaction(async (tx) => {
      const updated = await tx.appeal.update({
        where: { id: appealId },
        data: {
          status: decision,
          reviewerId,
          reviewNote: note,
          reviewedAt: new Date(),
        },
      });

      if (decision === "APPROVED") {
        await tx.application.update({
          where: { id: appeal.applicationId },
          data: { status: "APPROVED", reviewerId, reviewedAt: new Date() },
        });
        await tx.user.update({
          where: { id: appeal.userId },
          data: { status: "APPROVED" },
        });
      }

      return updated;
    });
  }
}
