import type { FastifyInstance } from "fastify";
import { ConflictError, NotFoundError, ForbiddenError } from "../../lib/errors";
import { getVerificationQueue } from "../../lib/queue";

export class ApplicationService {
  constructor(private readonly app: FastifyInstance) {}

  async apply(
    userId: string,
    data: {
      githubUrl?: string;
      codeforcesHandle?: string;
      leetcodeHandle?: string;
      portfolioUrl?: string;
    },
  ) {
    // Prevent duplicate pending applications
    const existing = await this.app.prisma.application.findFirst({
      where: {
        userId,
        status: { in: ["PENDING", "PROCESSING", "UNDER_REVIEW"] },
      },
    });

    if (existing) {
      throw new ConflictError(
        "You already have a pending application. Please wait for it to be reviewed.",
      );
    }

    const hasProof =
      data.githubUrl ||
      data.codeforcesHandle ||
      data.leetcodeHandle ||
      data.portfolioUrl;
    if (!hasProof) {
      throw new ForbiddenError(
        "At least one proof link (GitHub, Codeforces, LeetCode, or portfolio) is required",
      );
    }

    const application = await this.app.prisma.application.create({
      data: {
        userId,
        githubUrl: data.githubUrl,
        codeforcesHandle: data.codeforcesHandle,
        leetcodeHandle: data.leetcodeHandle,
        portfolioUrl: data.portfolioUrl,
        passingThreshold: this.app.config.SCORING_PASS_THRESHOLD,
      },
    });

    // Enqueue background verification job
    await getVerificationQueue().add(
      "verify",
      { applicationId: application.id },
      { jobId: `verify-${application.id}` },
    );

    await this.app.prisma.application.update({
      where: { id: application.id },
      data: { status: "PROCESSING" },
    });

    return application;
  }

  async getMyApplications(userId: string) {
    return this.app.prisma.application.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(applicationId: string, userId: string) {
    const application = await this.app.prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) throw new NotFoundError("Application", applicationId);

    // Users can only view their own unless admin
    const user = await this.app.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (application.userId !== userId && user?.role !== "ADMIN") {
      throw new ForbiddenError();
    }

    return application;
  }
}
