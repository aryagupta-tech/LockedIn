/**
 * Logger configuration passed to Fastify's built-in pino instance.
 * We export the config object — Fastify creates the actual logger.
 */
export const loggerConfig = {
  level: process.env.LOG_LEVEL || "info",
  ...(process.env.NODE_ENV === "development" && {
    transport: { target: "pino-pretty", options: { colorize: true } },
  }),
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
    ],
    censor: "[REDACTED]" as const,
  },
};
