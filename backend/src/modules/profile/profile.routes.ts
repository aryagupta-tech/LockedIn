import { Type } from "@sinclair/typebox";
import type { FastifyPluginAsync } from "fastify";
import { ProfileService } from "./profile.service";
import { AppError } from "../../lib/errors";
import { UpdateProfileBody, ProfileResponse } from "./profile.schemas";

const profileRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new ProfileService(fastify);

  fastify.get(
    "/me",
    {
      schema: {
        tags: ["profiles"],
        summary: "Get my own profile",
        security: [{ bearerAuth: [] }],
      },
      preHandler: [fastify.authenticate],
    },
    async (request) => {
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.user.sub },
        select: { id: true, email: true, username: true, displayName: true, avatarUrl: true, role: true, status: true },
      });
      if (!user) throw new AppError("User not found", 404, "NOT_FOUND");
      return user;
    },
  );

  fastify.get<{ Params: { username: string } }>(
    "/:username",
    {
      schema: {
        tags: ["profiles"],
        summary: "Get a public profile",
        params: Type.Object({ username: Type.String() }),
        response: { 200: ProfileResponse },
      },
    },
    async (request) => {
      let viewerId: string | undefined;
      try {
        await request.jwtVerify();
        viewerId = request.user.sub;
      } catch { /* unauthenticated is OK */ }
      return service.getByUsername(request.params.username, viewerId);
    },
  );

  fastify.patch(
    "/me",
    {
      schema: {
        tags: ["profiles"],
        summary: "Update my profile",
        security: [{ bearerAuth: [] }],
        body: UpdateProfileBody,
      },
      preHandler: [fastify.authenticate],
    },
    async (request) => service.updateProfile(request.user.sub, request.body as Record<string, unknown>),
  );

  fastify.post<{ Params: { id: string } }>(
    "/:id/follow",
    {
      schema: {
        tags: ["profiles"],
        summary: "Follow a user",
        security: [{ bearerAuth: [] }],
        params: Type.Object({ id: Type.String() }),
      },
      preHandler: [fastify.requireApproved],
    },
    async (request) => service.follow(request.user.sub, request.params.id),
  );

  fastify.delete<{ Params: { id: string } }>(
    "/:id/follow",
    {
      schema: {
        tags: ["profiles"],
        summary: "Unfollow a user",
        security: [{ bearerAuth: [] }],
        params: Type.Object({ id: Type.String() }),
      },
      preHandler: [fastify.authenticate],
    },
    async (request) => service.unfollow(request.user.sub, request.params.id),
  );

  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({ error: error.message, code: error.code });
    }
    fastify.log.error(error);
    return reply.code(500).send({ error: "Internal server error", code: "INTERNAL_ERROR" });
  });
};

export default profileRoutes;
