import { LeankCategory, LeankStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ownerKey = "performance-seed-owner";
const requestedCount = Number(process.env.PERF_LEANK_COUNT || 10_000);

if (!Number.isInteger(requestedCount) || requestedCount < 1) {
  throw new Error("PERF_LEANK_COUNT must be a positive integer");
}

async function seed() {
  const owner = await prisma.user.upsert({
    where: { appwriteUserId: ownerKey },
    update: { isActive: true, deletedAt: null },
    create: {
      appwriteUserId: ownerKey,
      email: "performance-seed@leankly.invalid",
      emailVerified: true,
      name: "Performance Seed",
      isActive: true,
    },
  });

  await prisma.leank.deleteMany({ where: { ownerId: owner.id } });

  const batchSize = 1_000;
  const eventDate = new Date();
  eventDate.setUTCDate(eventDate.getUTCDate() + 7);
  eventDate.setUTCHours(0, 0, 0, 0);

  for (let offset = 0; offset < requestedCount; offset += batchSize) {
    const size = Math.min(batchSize, requestedCount - offset);
    await prisma.leank.createMany({
      data: Array.from({ length: size }, (_, index) => {
        const sequence = offset + index + 1;
        return {
          ownerId: owner.id,
          title: `Performance leank ${sequence}`,
          description: "Synthetic discovery-feed load-test record",
          coverUrl: "https://example.invalid/performance-cover.png",
          status: LeankStatus.ACTIVE,
          category: LeankCategory.FITNESS,
          eventDate,
          time: "18:00",
          location: "Performance Test City",
          peopleRequired: 4,
        };
      }),
    });
  }

  const count = await prisma.leank.count({ where: { ownerId: owner.id } });
  console.log(`Seeded ${count} synthetic leanks for owner ${owner.id}`);
}

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
