import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import * as Sentry from "@sentry/node";
import { loadConfig } from "./config";
import "./types";

import dbPlugin from "./plugins/db";
import cachePlugin from "./plugins/cache";
import authPlugin from "./plugins/auth";
import rateLimitPlugin from "./plugins/rate-limit";
import swaggerPlugin from "./plugins/swagger";
import metricsPlugin from "./plugins/metrics";

import authRoutes from "./modules/auth/auth.routes";
import applicationRoutes from "./modules/application/application.routes";
import adminRoutes from "./modules/admin/admin.routes";
import profileRoutes from "./modules/profile/profile.routes";
import postRoutes from "./modules/post/post.routes";
import communityRoutes from "./modules/community/community.routes";
import feedRoutes from "./modules/feed/feed.routes";
import appealRoutes from "./modules/appeal/appeal.routes";
import { AppError } from "./lib/errors";

async function main() {
  const config = loadConfig();

  // Sentry (optional)
  if (config.SENTRY_DSN) {
    Sentry.init({ dsn: config.SENTRY_DSN, environment: config.NODE_ENV });
  }

  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      ...(config.NODE_ENV === "development" && {
        transport: { target: "pino-pretty" },
      }),
      redact: {
        paths: ["req.headers.authorization", "req.headers.cookie"],
        censor: "[REDACTED]",
      },
    },
    trustProxy: true,
  });

  // Decorate with config before any plugin that depends on it
  app.decorate("config", config);

  // ─── Core plugins ──────────────────────────────────────────────────────
  await app.register(cors, {
    origin: config.CORS_ORIGIN,
    credentials: true,
  });
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });
  await app.register(cookie);

  // ─── Infrastructure plugins ────────────────────────────────────────────
  await app.register(dbPlugin);
  await app.register(cachePlugin);
  await app.register(authPlugin);
  await app.register(rateLimitPlugin);
  await app.register(swaggerPlugin);
  await app.register(metricsPlugin);

  // ─── Health check ──────────────────────────────────────────────────────
  app.get("/health", { schema: { hide: true } }, async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  // ─── Routes ────────────────────────────────────────────────────────────
  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(applicationRoutes, { prefix: "/applications" });
  await app.register(adminRoutes, { prefix: "/admin" });
  await app.register(profileRoutes, { prefix: "/profiles" });
  await app.register(postRoutes, { prefix: "/posts" });
  await app.register(communityRoutes, { prefix: "/communities" });
  await app.register(feedRoutes, { prefix: "/feed" });
  await app.register(appealRoutes, { prefix: "/appeals" });

  // ─── Global error handler ──────────────────────────────────────────────
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply
        .code(error.statusCode)
        .send({ error: error.message, code: error.code });
    }

    // Fastify validation errors
    if (error.validation) {
      return reply.code(400).send({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: error.validation,
      });
    }

    if (config.SENTRY_DSN) {
      Sentry.captureException(error, { extra: { url: request.url } });
    }

    request.log.error(error);
    return reply.code(500).send({
      error: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  });

  // ─── Start ─────────────────────────────────────────────────────────────
  await app.listen({ port: config.PORT, host: config.HOST });
  app.log.info(`Swagger UI: http://localhost:${config.PORT}/docs`);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
