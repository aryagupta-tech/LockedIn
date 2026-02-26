import type { FastifyPluginAsync } from "fastify";
import { AuthService } from "./auth.service";
import { AppError } from "../../lib/errors";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  githubUrlSchema,
  githubCallbackSchema,
  type RegisterBody,
  type LoginBody,
  type RefreshBody,
  type GitHubCallbackBody,
} from "./auth.schemas";

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new AuthService(fastify);

  fastify.post<{ Body: RegisterBody }>(
    "/register",
    { schema: registerSchema },
    async (request, reply) => {
      const result = await service.register(request.body);
      return reply.code(201).send(result);
    },
  );

  fastify.post<{ Body: LoginBody }>(
    "/login",
    { schema: loginSchema },
    async (request, reply) => {
      const result = await service.login(
        request.body.email,
        request.body.password,
      );
      return reply.send(result);
    },
  );

  fastify.post<{ Body: RefreshBody }>(
    "/refresh",
    { schema: refreshSchema },
    async (request, reply) => {
      const result = await service.refresh(request.body.refreshToken);
      return reply.send(result);
    },
  );

  fastify.get("/github", { schema: githubUrlSchema }, async () => {
    return { url: service.getGitHubAuthUrl() };
  });

  fastify.post<{ Body: GitHubCallbackBody }>(
    "/github/callback",
    { schema: githubCallbackSchema },
    async (request, reply) => {
      const result = await service.githubCallback(request.body.code);
      return reply.send(result);
    },
  );

  // Global error handler for auth routes
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

export default authRoutes;
