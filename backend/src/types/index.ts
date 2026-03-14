import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";
import type { Config } from "../config";

declare module "fastify" {
  interface FastifyInstance {
    config: Config;
    prisma: PrismaClient;
    redis: Redis;
    authenticate: (
      request: import("fastify").FastifyRequest,
      reply: import("fastify").FastifyReply,
    ) => Promise<void>;
    requireAdmin: (
      request: import("fastify").FastifyRequest,
      reply: import("fastify").FastifyReply,
    ) => Promise<void>;
    requireApproved: (
      request: import("fastify").FastifyRequest,
      reply: import("fastify").FastifyReply,
    ) => Promise<void>;
  }

  interface FastifyRequest {
    user: { sub: string; role: string };
    supabaseUser: import("@supabase/supabase-js").User;
  }
}
