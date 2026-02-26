import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import type { FastifyReply, FastifyRequest } from "fastify";

export default fp(
  async (fastify) => {
    const cfg = fastify.config;

    await fastify.register(fastifyJwt, {
      secret: cfg.JWT_SECRET,
      sign: { expiresIn: cfg.JWT_ACCESS_EXPIRES_SECONDS },
    });

    // Verify JWT and attach user to request
    fastify.decorate(
      "authenticate",
      async function (request: FastifyRequest, reply: FastifyReply) {
        try {
          await request.jwtVerify();
        } catch {
          reply.code(401).send({ error: "Unauthorized", code: "UNAUTHORIZED" });
        }
      },
    );

    // Require ADMIN role
    fastify.decorate(
      "requireAdmin",
      async function (request: FastifyRequest, reply: FastifyReply) {
        try {
          await request.jwtVerify();
          if (request.user.role !== "ADMIN") {
            reply.code(403).send({ error: "Forbidden", code: "FORBIDDEN" });
          }
        } catch {
          reply.code(401).send({ error: "Unauthorized", code: "UNAUTHORIZED" });
        }
      },
    );

    // Require APPROVED status (checks DB, not just the token claim)
    fastify.decorate(
      "requireApproved",
      async function (request: FastifyRequest, reply: FastifyReply) {
        try {
          await request.jwtVerify();
          const user = await fastify.prisma.user.findUnique({
            where: { id: request.user.sub },
            select: { status: true },
          });
          if (!user || user.status !== "APPROVED") {
            reply.code(403).send({
              error: "Account not yet approved",
              code: "NOT_APPROVED",
            });
          }
        } catch {
          reply.code(401).send({ error: "Unauthorized", code: "UNAUTHORIZED" });
        }
      },
    );
  },
  { name: "auth", dependencies: ["prisma"] },
);
