import fp from "fastify-plugin";
import { getRedis, closeRedis } from "../lib/redis";

export default fp(
  async (fastify) => {
    const redis = getRedis();
    fastify.decorate("redis", redis);

    fastify.addHook("onClose", async () => {
      await closeRedis();
    });

    fastify.log.info("Redis connected");
  },
  { name: "redis" },
);
