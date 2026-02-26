import type { FastifyPluginAsync } from "fastify";
import { ApplicationService } from "./application.service";
import { AppError } from "../../lib/errors";
import {
  applySchema,
  getMyApplicationsSchema,
  getApplicationSchema,
  type ApplyBody,
} from "./application.schemas";

const applicationRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new ApplicationService(fastify);

  fastify.post<{ Body: ApplyBody }>(
    "/",
    { schema: applySchema, preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const result = await service.apply(request.user.sub, request.body);
      return reply.code(201).send(result);
    },
  );

  fastify.get(
    "/me",
    { schema: getMyApplicationsSchema, preHandler: [fastify.authenticate] },
    async (request) => {
      return service.getMyApplications(request.user.sub);
    },
  );

  fastify.get<{ Params: { id: string } }>(
    "/:id",
    { schema: getApplicationSchema, preHandler: [fastify.authenticate] },
    async (request) => {
      return service.getById(request.params.id, request.user.sub);
    },
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

export default applicationRoutes;
