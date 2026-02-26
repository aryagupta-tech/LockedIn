import { Type, Static } from "@sinclair/typebox";
import type { FastifyPluginAsync } from "fastify";
import { AdminService } from "./admin.service";
import { ScoringService } from "../scoring/scoring.service";
import { AppError } from "../../lib/errors";

const ReviewBody = Type.Object({
  decision: Type.Union([
    Type.Literal("APPROVED"),
    Type.Literal("REJECTED"),
    Type.Literal("UNDER_REVIEW"),
  ]),
  note: Type.Optional(Type.String({ maxLength: 1000 })),
});
type ReviewBody = Static<typeof ReviewBody>;

const UpdateWeightBody = Type.Object({
  weight: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
  threshold: Type.Optional(Type.Number({ minimum: 0 })),
  minimum: Type.Optional(Type.Number({ minimum: 0 })),
});
type UpdateWeightBody = Static<typeof UpdateWeightBody>;

const AppealReviewBody = Type.Object({
  decision: Type.Union([
    Type.Literal("APPROVED"),
    Type.Literal("REJECTED"),
  ]),
  note: Type.Optional(Type.String({ maxLength: 1000 })),
});
type AppealReviewBody = Static<typeof AppealReviewBody>;

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new AdminService(fastify);
  const scoring = new ScoringService(fastify);

  // All admin routes require ADMIN role
  fastify.addHook("preHandler", fastify.requireAdmin);

  // ─── Applications ──────────────────────────────────────────────────────

  fastify.get<{
    Querystring: { status?: string; page?: number; limit?: number };
  }>(
    "/applications",
    {
      schema: {
        tags: ["admin"],
        summary: "List all applications (paginated)",
        security: [{ bearerAuth: [] }],
        querystring: Type.Object({
          status: Type.Optional(Type.String()),
          page: Type.Optional(Type.Number({ minimum: 1 })),
          limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
        }),
      },
    },
    async (request) => service.listApplications(request.query),
  );

  fastify.patch<{ Params: { id: string }; Body: ReviewBody }>(
    "/applications/:id/review",
    {
      schema: {
        tags: ["admin"],
        summary: "Approve, reject, or escalate an application",
        security: [{ bearerAuth: [] }],
        params: Type.Object({ id: Type.String() }),
        body: ReviewBody,
      },
    },
    async (request) =>
      service.reviewApplication(
        request.params.id,
        request.user.sub,
        request.body.decision,
        request.body.note,
      ),
  );

  // ─── Scoring weights ──────────────────────────────────────────────────

  fastify.get("/scoring-weights", {
    schema: {
      tags: ["admin"],
      summary: "List all scoring weights",
      security: [{ bearerAuth: [] }],
    },
  }, async () => service.getWeights());

  fastify.put<{ Params: { key: string }; Body: UpdateWeightBody }>(
    "/scoring-weights/:key",
    {
      schema: {
        tags: ["admin"],
        summary: "Update a scoring weight",
        security: [{ bearerAuth: [] }],
        params: Type.Object({ key: Type.String() }),
        body: UpdateWeightBody,
      },
    },
    async (request) =>
      service.updateWeight(
        request.params.key,
        request.user.sub,
        request.body,
      ),
  );

  fastify.post(
    "/scoring/backfill",
    {
      schema: {
        tags: ["admin"],
        summary: "Re-score all UNDER_REVIEW applications with current weights",
        security: [{ bearerAuth: [] }],
      },
    },
    async () => {
      const count = await scoring.backfillScores();
      return { queued: count, message: `${count} applications queued for re-scoring` };
    },
  );

  // ─── Appeals ──────────────────────────────────────────────────────────

  fastify.get<{
    Querystring: { status?: string; page?: number; limit?: number };
  }>(
    "/appeals",
    {
      schema: {
        tags: ["admin"],
        summary: "List all appeals (paginated)",
        security: [{ bearerAuth: [] }],
        querystring: Type.Object({
          status: Type.Optional(Type.String()),
          page: Type.Optional(Type.Number({ minimum: 1 })),
          limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
        }),
      },
    },
    async (request) => service.listAppeals(request.query),
  );

  fastify.patch<{ Params: { id: string }; Body: AppealReviewBody }>(
    "/appeals/:id/review",
    {
      schema: {
        tags: ["admin"],
        summary: "Approve or reject an appeal",
        security: [{ bearerAuth: [] }],
        params: Type.Object({ id: Type.String() }),
        body: AppealReviewBody,
      },
    },
    async (request) =>
      service.reviewAppeal(
        request.params.id,
        request.user.sub,
        request.body.decision,
        request.body.note,
      ),
  );

  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply
        .code(error.statusCode)
        .send({ error: error.message, code: error.code });
    }
    fastify.log.error(error);
    return reply
      .code(500)
      .send({ error: "Internal server error", code: "INTERNAL_ERROR" });
  });
};

export default adminRoutes;
