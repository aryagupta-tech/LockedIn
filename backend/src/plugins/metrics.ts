import fp from "fastify-plugin";
import client from "prom-client";

export default fp(
  async (fastify) => {
    const register = new client.Registry();
    client.collectDefaultMetrics({ register });

    const httpRequestDuration = new client.Histogram({
      name: "http_request_duration_seconds",
      help: "Duration of HTTP requests in seconds",
      labelNames: ["method", "route", "status_code"],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
      registers: [register],
    });

    const httpRequestsTotal = new client.Counter({
      name: "http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "route", "status_code"],
      registers: [register],
    });

    fastify.addHook("onResponse", (request, reply, done) => {
      const route = request.routeOptions?.url || request.url;
      const labels = {
        method: request.method,
        route,
        status_code: reply.statusCode.toString(),
      };
      httpRequestDuration.observe(labels, reply.elapsedTime / 1000);
      httpRequestsTotal.inc(labels);
      done();
    });

    fastify.get(
      "/metrics",
      { schema: { hide: true } },
      async (_request, reply) => {
        reply.header("content-type", register.contentType);
        return register.metrics();
      },
    );
  },
  { name: "metrics" },
);
