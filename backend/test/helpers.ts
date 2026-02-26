import Fastify, { type FastifyInstance } from "fastify";

/**
 * Build a minimal Fastify instance for integration testing.
 * Uses the real database (set TEST_DATABASE_URL) — run
 * `prisma migrate deploy` against your test DB before tests.
 */
export async function buildTestApp(): Promise<FastifyInstance> {
  // Override config for tests
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-secret-that-is-at-least-32chars";
  process.env.ENCRYPTION_KEY = "test-encryption-key-32bytes!!!!";
  process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "";
  process.env.REDIS_URL = process.env.TEST_REDIS_URL || "redis://localhost:6379";

  const { loadConfig } = await import("../src/config");
  const config = loadConfig();

  const app = Fastify({ logger: false });
  app.decorate("config", config);

  const { default: dbPlugin } = await import("../src/plugins/db");
  const { default: cachePlugin } = await import("../src/plugins/cache");
  const { default: authPlugin } = await import("../src/plugins/auth");

  await app.register(dbPlugin);
  await app.register(cachePlugin);
  await app.register(authPlugin);

  // Stub requireApproved for tests — just check JWT
  app.decorate("requireApproved", app.authenticate);

  const { default: authRoutes } = await import(
    "../src/modules/auth/auth.routes"
  );
  const { default: applicationRoutes } = await import(
    "../src/modules/application/application.routes"
  );

  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(applicationRoutes, { prefix: "/applications" });

  await app.ready();
  return app;
}

export async function createTestUser(
  app: FastifyInstance,
  overrides?: Record<string, unknown>,
) {
  const unique = Math.random().toString(36).slice(2, 8);
  const res = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: {
      email: `test-${unique}@lockedin.test`,
      username: `testuser_${unique}`,
      password: "TestPassword123!",
      displayName: "Test User",
      ...overrides,
    },
  });
  return JSON.parse(res.payload);
}
