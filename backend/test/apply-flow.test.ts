import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp, createTestUser } from "./helpers";

/**
 * Integration tests for the application flow.
 * Requires PostgreSQL and Redis running (use docker compose).
 *
 * Set TEST_DATABASE_URL to a disposable test database.
 * Run: DATABASE_URL=... npm test
 */
describe("Application flow", () => {
  let app: FastifyInstance;
  let accessToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    const auth = await createTestUser(app);
    accessToken = auth.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects application with no proof links", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/applications",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {},
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.payload);
    expect(body.error).toContain("proof link");
  });

  it("creates an application with GitHub proof", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/applications",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        githubUrl: "https://github.com/testuser",
        codeforcesHandle: "tourist",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.id).toBeDefined();
    expect(body.githubUrl).toBe("https://github.com/testuser");
    expect(body.status).toBe("PENDING");
  });

  it("prevents duplicate pending applications", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/applications",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { githubUrl: "https://github.com/testuser2" },
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.payload);
    expect(body.error).toContain("pending");
  });

  it("lists my applications", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/applications/me",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects unauthenticated requests", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/applications",
      payload: { githubUrl: "https://github.com/test" },
    });

    expect(res.statusCode).toBe(401);
  });
});

describe("Auth flow", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("registers a new user", async () => {
    const auth = await createTestUser(app);
    expect(auth.accessToken).toBeDefined();
    expect(auth.refreshToken).toBeDefined();
    expect(auth.user.email).toContain("@lockedin.test");
    expect(auth.user.status).toBe("PENDING");
  });

  it("rejects duplicate email registration", async () => {
    const unique = Math.random().toString(36).slice(2, 8);
    const payload = {
      email: `dupe-${unique}@lockedin.test`,
      username: `dupe_${unique}`,
      password: "TestPassword123!",
      displayName: "Dupe User",
    };

    await app.inject({ method: "POST", url: "/auth/register", payload });
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { ...payload, username: `dupe2_${unique}` },
    });

    expect(res.statusCode).toBe(409);
  });

  it("logs in with correct credentials", async () => {
    const unique = Math.random().toString(36).slice(2, 8);
    const email = `login-${unique}@lockedin.test`;
    const password = "TestPassword123!";

    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email,
        username: `login_${unique}`,
        password,
        displayName: "Login User",
      },
    });

    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.accessToken).toBeDefined();
  });

  it("rejects login with wrong password", async () => {
    const unique = Math.random().toString(36).slice(2, 8);
    const email = `wrong-${unique}@lockedin.test`;

    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email,
        username: `wrong_${unique}`,
        password: "CorrectPassword123!",
        displayName: "Wrong PW User",
      },
    });

    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: "WrongPassword!" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("refreshes tokens", async () => {
    const auth = await createTestUser(app);

    const res = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: auth.refreshToken },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).not.toBe(auth.refreshToken);
  });
});
