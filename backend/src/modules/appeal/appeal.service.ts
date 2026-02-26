import type { FastifyInstance } from "fastify";
import { NotFoundError, ForbiddenError, ConflictError } from "../../lib/errors";

export class AppealService {
  constructor(private readonly app: FastifyInstance) {}

  async create(userId: string, applicationId: string, reason: string) {
    const application = await this.app.prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) throw new NotFoundError("Application", applicationId);
    if (application.userId !== userId) throw new ForbiddenError();
    if (application.status !== "REJECTED") {
      throw new ForbiddenError("Only rejected applications can be appealed");
    }

    const existingAppeal = await this.app.prisma.appeal.findFirst({
      where: {
        applicationId,
        status: { in: ["PENDING", "UNDER_REVIEW"] },
      },
    });
    if (existingAppeal) {
      throw new ConflictError("An appeal is already pending for this application");
    }

    const appeal = await this.app.prisma.appeal.create({
      data: { applicationId, userId, reason },
    });

    await this.app.prisma.application.update({
      where: { id: applicationId },
      data: { status: "UNDER_REVIEW" },
    });

    return appeal;
  }

  async getMyAppeals(userId: string) {
    return this.app.prisma.appeal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(appealId: string, userId: string) {
    const appeal = await this.app.prisma.appeal.findUnique({
      where: { id: appealId },
    });
    if (!appeal) throw new NotFoundError("Appeal", appealId);

    const user = await this.app.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (appeal.userId !== userId && user?.role !== "ADMIN") {
      throw new ForbiddenError();
    }

    return appeal;
  }
}
