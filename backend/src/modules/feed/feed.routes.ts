import { Type } from "@sinclair/typebox";
import type { FastifyPluginAsync } from "fastify";
import { FeedService } from "./feed.service";

const feedRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new FeedService(fastify);

  fastify.get<{ Querystring: { cursor?: string; limit?: number } }>(
    "/",
    {
      schema: {
        tags: ["feed"],
        summary: "Get personalized feed (posts from followed users and joined communities)",
        security: [{ bearerAuth: [] }],
        querystring: Type.Object({
          cursor: Type.Optional(Type.String({ description: "ISO date cursor for pagination" })),
          limit: Type.Optional(Type.Number({ minimum: 1, maximum: 50, default: 20 })),
        }),
      },
      preHandler: [fastify.requireApproved],
    },
    async (request) => service.getFeed(request.user.sub, request.query),
  );
};

export default feedRoutes;
