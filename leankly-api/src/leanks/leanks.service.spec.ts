import { ForbiddenException } from "@nestjs/common";
import { User } from "@prisma/client";
import { LeanksService } from "./leanks.service";

const userId = "00000000-0000-4000-8000-000000000001";
const user = { id: userId } as User;

describe("LeanksService feed", () => {
  it("rejects Pro-only filters when the entitlement cache is inactive", async () => {
    const prisma = {
      userEntitlement: { findUnique: jest.fn(() => Promise.resolve(null)) },
    };
    const service = new LeanksService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.feed(user, { limit: 10, radiusKm: 25, categories: ["Other"] }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("builds own, participant, reaction, and bilateral-block exclusions", async () => {
    const findMany = jest.fn(() => Promise.resolve([]));
    const prisma = {
      userEntitlement: { findUnique: jest.fn() },
      leank: { findMany },
    };
    const service = new LeanksService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await service.feed(user, { limit: 10, radiusKm: 25 });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ownerId: { not: userId },
          participants: { none: { userId } },
          reactions: { none: { userId } },
          owner: expect.objectContaining({
            blocksCreated: { none: { blockedId: userId } },
            blocksReceived: { none: { blockerId: userId } },
          }),
        }),
      }),
    );
  });
});
