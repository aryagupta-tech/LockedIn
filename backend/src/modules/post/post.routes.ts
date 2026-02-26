import { Type } from "@sinclair/typebox";
import type { FastifyPluginAsync } from "fastify";
import { PostService } from "./post.service";
import { AppError } from "../../lib/errors";
import { CreatePostBody, CreateCommentBody, PostResponse, type CreatePostBody as CPB, type CreateCommentBody as CCB } from "./post.schemas";

const postRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new PostService(fastify);

  fastify.post<{ Body: CPB }>(
    "/",
    {
      schema: { tags: ["posts"], summary: "Create a post", security: [{ bearerAuth: [] }], body: CreatePostBody, response: { 201: PostResponse } },
      preHandler: [fastify.requireApproved],
    },
    async (request, reply) => {
      const result = await service.create(request.user.sub, request.body);
      return reply.code(201).send(result);
    },
  );

  fastify.get<{ Params: { id: string } }>(
    "/:id",
    {
      schema: { tags: ["posts"], summary: "Get a post", params: Type.Object({ id: Type.String() }), response: { 200: PostResponse } },
    },
    async (request) => {
      let viewerId: string | undefined;
      try { await request.jwtVerify(); viewerId = request.user.sub; } catch { /* ok */ }
      return service.getById(request.params.id, viewerId);
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    "/:id",
    {
      schema: { tags: ["posts"], summary: "Delete a post", security: [{ bearerAuth: [] }], params: Type.Object({ id: Type.String() }) },
      preHandler: [fastify.authenticate],
    },
    async (request) => service.deletePost(request.params.id, request.user.sub),
  );

  fastify.post<{ Params: { id: string } }>(
    "/:id/like",
    {
      schema: { tags: ["posts"], summary: "Like a post", security: [{ bearerAuth: [] }], params: Type.Object({ id: Type.String() }) },
      preHandler: [fastify.requireApproved],
    },
    async (request) => service.like(request.params.id, request.user.sub),
  );

  fastify.delete<{ Params: { id: string } }>(
    "/:id/like",
    {
      schema: { tags: ["posts"], summary: "Unlike a post", security: [{ bearerAuth: [] }], params: Type.Object({ id: Type.String() }) },
      preHandler: [fastify.authenticate],
    },
    async (request) => service.unlike(request.params.id, request.user.sub),
  );

  fastify.get<{ Params: { id: string }; Querystring: { page?: number; limit?: number } }>(
    "/:id/comments",
    {
      schema: {
        tags: ["posts"],
        summary: "List comments on a post",
        params: Type.Object({ id: Type.String() }),
        querystring: Type.Object({
          page: Type.Optional(Type.Number({ minimum: 1 })),
          limit: Type.Optional(Type.Number({ minimum: 1, maximum: 50 })),
        }),
      },
    },
    async (request) => service.getComments(request.params.id, request.query.page, request.query.limit),
  );

  fastify.post<{ Params: { id: string }; Body: CCB }>(
    "/:id/comments",
    {
      schema: { tags: ["posts"], summary: "Add a comment", security: [{ bearerAuth: [] }], params: Type.Object({ id: Type.String() }), body: CreateCommentBody },
      preHandler: [fastify.requireApproved],
    },
    async (request, reply) => {
      const result = await service.addComment(request.params.id, request.user.sub, request.body.content, request.body.parentId);
      return reply.code(201).send(result);
    },
  );

  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({ error: error.message, code: error.code });
    }
    fastify.log.error(error);
    return reply.code(500).send({ error: "Internal server error", code: "INTERNAL_ERROR" });
  });
};

export default postRoutes;
