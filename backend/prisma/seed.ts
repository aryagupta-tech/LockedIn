import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const weights = [
    {
      key: "github_contributions",
      weight: 0.35,
      threshold: 1000,
      minimum: 100,
      description:
        "GitHub contributions in the last 2 years. 1000+ scores 100.",
    },
    {
      key: "codeforces_rating",
      weight: 0.25,
      threshold: 2100,
      minimum: 1200,
      description: "Peak Codeforces rating. 2100+ scores 100.",
    },
    {
      key: "leetcode_problems",
      weight: 0.25,
      threshold: 500,
      minimum: 50,
      description: "Total LeetCode problems solved. 500+ scores 100.",
    },
    {
      key: "portfolio_quality",
      weight: 0.15,
      threshold: 100,
      minimum: 20,
      description:
        "Manual portfolio review score (0-100). Assigned during human review.",
    },
  ];

  for (const w of weights) {
    await prisma.scoringWeight.upsert({
      where: { key: w.key },
      update: { weight: w.weight, threshold: w.threshold, minimum: w.minimum },
      create: w,
    });
  }

  console.log(`Seeded ${weights.length} scoring weights`);

  const existing = await prisma.user.findUnique({
    where: { email: "admin@lockedin.local" },
  });

  if (!existing) {
    await prisma.user.create({
      data: {
        email: "admin@lockedin.local",
        username: "admin",
        displayName: "LockedIn Admin",
        passwordHash: await hash("admin123456", 12),
        role: "ADMIN",
        status: "APPROVED",
      },
    });
    console.log("Seeded admin user (admin@lockedin.local / admin123456)");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
