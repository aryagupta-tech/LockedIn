import { Type } from "@sinclair/typebox";
import type { FastifyPluginAsync } from "fastify";
import { AppealService } from "./appeal.service";
import { AppError } from "../../lib/errors";
import { CreateAppealBody, AppealResponse, type CreateAppealBody as CAB } from "./appeal.schemas";

const appealRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new AppealService(fastify);

  fastify.post<{ Body: CAB }>(
    "/",
    {
      schema: {
        tags: ["appeals"],
        summary: "Appeal a rejected application",
        security: [{ bearerAuth: [] }],
        body: CreateAppealBody,
        response: { 201: AppealResponse },
      },
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const result = await service.create(
        request.user.sub,
        request.body.applicationId,
        request.body.reason,
      );
      return reply.code(201).send(result);
    },
  );

  fastify.get(
    "/me",
    {
      schema: {
        tags: ["appeals"],
        summary: "List my appeals",
        security: [{ bearerAuth: [] }],
        response: { 200: Type.Array(AppealResponse) },
      },
      preHandler: [fastify.authenticate],
    },
    async (request) => service.getMyAppeals(request.user.sub),
  );

  fastify.get<{ Params: { id: string } }>(
    "/:id",
    {
      schema: {
        tags: ["appeals"],
        summary: "Get appeal details",
        security: [{ bearerAuth: [] }],
        params: Type.Object({ id: Type.String() }),
        response: { 200: AppealResponse },
      },
      preHandler: [fastify.authenticate],
    },
    async (request) => service.getById(request.params.id, request.user.sub),
  );

  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({ error: error.message, code: error.code });
    }
    fastify.log.error(error);
    return reply.code(500).send({ error: "Internal server error", code: "INTERNAL_ERROR" });
  });
};

export default appealRoutes;
