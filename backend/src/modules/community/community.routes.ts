import { Type } from "@sinclair/typebox";
import type { FastifyPluginAsync } from "fastify";
import { CommunityService } from "./community.service";
import { AppError } from "../../lib/errors";
import { CreateCommunityBody, CommunityResponse, type CreateCommunityBody as CCB } from "./community.schemas";

const communityRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new CommunityService(fastify);

  fastify.get<{ Querystring: { page?: number; limit?: number } }>(
    "/",
    {
      schema: {
        tags: ["communities"],
        summary: "List communities",
        querystring: Type.Object({
          page: Type.Optional(Type.Number({ minimum: 1 })),
          limit: Type.Optional(Type.Number({ minimum: 1, maximum: 50 })),
        }),
      },
    },
    async (request) => service.list(request.query.page, request.query.limit),
  );

  fastify.post<{ Body: CCB }>(
    "/",
    {
      schema: { tags: ["communities"], summary: "Create a community", security: [{ bearerAuth: [] }], body: CreateCommunityBody, response: { 201: CommunityResponse } },
      preHandler: [fastify.requireApproved],
    },
    async (request, reply) => {
      const result = await service.create(request.user.sub, request.body);
      return reply.code(201).send(result);
    },
  );

  fastify.get<{ Params: { slug: string } }>(
    "/:slug",
    {
      schema: { tags: ["communities"], summary: "Get community by slug", params: Type.Object({ slug: Type.String() }), response: { 200: CommunityResponse } },
    },
    async (request) => service.getBySlug(request.params.slug),
  );

  fastify.post<{ Params: { id: string } }>(
    "/:id/join",
    {
      schema: { tags: ["communities"], summary: "Request to join a community", security: [{ bearerAuth: [] }], params: Type.Object({ id: Type.String() }) },
      preHandler: [fastify.requireApproved],
    },
    async (request) => service.requestJoin(request.params.id, request.user.sub),
  );

  fastify.get<{ Params: { id: string }; Querystring: { page?: number; limit?: number } }>(
    "/:id/members",
    {
      schema: {
        tags: ["communities"],
        summary: "List community members",
        params: Type.Object({ id: Type.String() }),
        querystring: Type.Object({
          page: Type.Optional(Type.Number({ minimum: 1 })),
          limit: Type.Optional(Type.Number({ minimum: 1, maximum: 50 })),
        }),
      },
    },
    async (request) => service.getMembers(request.params.id, request.query.page, request.query.limit),
  );

  fastify.patch<{ Params: { id: string; requestId: string }; Body: { decision: "APPROVED" | "REJECTED" } }>(
    "/:id/join-requests/:requestId",
    {
      schema: {
        tags: ["communities"],
        summary: "Review a join request",
        security: [{ bearerAuth: [] }],
        params: Type.Object({ id: Type.String(), requestId: Type.String() }),
        body: Type.Object({
          decision: Type.Union([Type.Literal("APPROVED"), Type.Literal("REJECTED")]),
        }),
      },
      preHandler: [fastify.authenticate],
    },
    async (request) =>
      service.reviewJoinRequest(request.params.requestId, request.user.sub, request.body.decision),
  );

  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({ error: error.message, code: error.code });
    }
    fastify.log.error(error);
    return reply.code(500).send({ error: "Internal server error", code: "INTERNAL_ERROR" });
  });
};

export default communityRoutes;
