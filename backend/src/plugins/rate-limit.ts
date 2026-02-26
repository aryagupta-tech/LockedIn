import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";

export default fp(
  async (fastify) => {
    await fastify.register(rateLimit, {
      max: 100,
      timeWindow: "1 minute",
      redis: fastify.redis,
      keyGenerator: (request) => {
        return request.user?.sub || request.ip;
      },
      errorResponseBuilder: () => ({
        error: "Too many requests",
        code: "RATE_LIMIT",
        statusCode: 429,
      }),
    });
  },
  { name: "rate-limit", dependencies: ["redis"] },
);
