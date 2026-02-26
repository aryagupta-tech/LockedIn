import fp from "fastify-plugin";
import { prisma } from "../lib/prisma";

export default fp(
  async (fastify) => {
    await prisma.$connect();
    fastify.decorate("prisma", prisma);

    fastify.addHook("onClose", async () => {
      await prisma.$disconnect();
    });

    fastify.log.info("Prisma connected");
  },
  { name: "prisma" },
);
