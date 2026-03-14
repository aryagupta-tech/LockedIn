import fp from "fastify-plugin";
import type { FastifyReply, FastifyRequest } from "fastify";
import { getSupabaseAdmin } from "../lib/supabase";

export default fp(
  async (fastify) => {
    const supabase = getSupabaseAdmin();

    fastify.decorate(
      "authenticate",
      async function (request: FastifyRequest, reply: FastifyReply) {
        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
          return reply.code(401).send({ error: "Unauthorized", code: "UNAUTHORIZED" });
        }

        const token = authHeader.slice(7);
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user) {
          return reply.code(401).send({ error: "Unauthorized", code: "UNAUTHORIZED" });
        }

        (request as any).supabaseUser = data.user;
        (request as any).user = {
          sub: data.user.id,
          role: data.user.user_metadata?.role || "USER",
        };
      },
    );

    fastify.decorate(
      "requireAdmin",
      async function (request: FastifyRequest, reply: FastifyReply) {
        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
          return reply.code(401).send({ error: "Unauthorized", code: "UNAUTHORIZED" });
        }

        const token = authHeader.slice(7);
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user) {
          return reply.code(401).send({ error: "Unauthorized", code: "UNAUTHORIZED" });
        }

        const profile = await fastify.prisma.user.findUnique({
          where: { id: data.user.id },
          select: { role: true },
        });

        if (!profile || profile.role !== "ADMIN") {
          return reply.code(403).send({ error: "Forbidden", code: "FORBIDDEN" });
        }

        (request as any).supabaseUser = data.user;
        (request as any).user = { sub: data.user.id, role: profile.role };
      },
    );

    fastify.decorate(
      "requireApproved",
      async function (request: FastifyRequest, reply: FastifyReply) {
        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
          return reply.code(401).send({ error: "Unauthorized", code: "UNAUTHORIZED" });
        }

        const token = authHeader.slice(7);
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user) {
          return reply.code(401).send({ error: "Unauthorized", code: "UNAUTHORIZED" });
        }

        const profile = await fastify.prisma.user.findUnique({
          where: { id: data.user.id },
          select: { status: true, role: true },
        });

        if (!profile || profile.status !== "APPROVED") {
          return reply.code(403).send({
            error: "Account not yet approved",
            code: "NOT_APPROVED",
          });
        }

        (request as any).supabaseUser = data.user;
        (request as any).user = { sub: data.user.id, role: profile.role };
      },
    );
  },
  { name: "auth", dependencies: ["prisma"] },
);
