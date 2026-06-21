import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { User } from "@prisma/client";
import { ReactionsService } from "./reactions.service";

const user = {
  id: "00000000-0000-4000-8000-000000000001",
} as User;

describe("ReactionsService", () => {
  it("limits request visibility for a free host", async () => {
    const requests = [
      {
        id: "request-1",
        userId: "user-1",
        leankId: "leank-1",
        user: { id: "user-1", name: "A", age: 25, avatarUrl: null },
        leank: { id: "leank-1", title: "Coffee", ownerId: user.id },
        createdAt: new Date(),
      },
      {
        id: "request-2",
        userId: "user-2",
        leankId: "leank-1",
        user: { id: "user-2", name: "B", age: 26, avatarUrl: null },
        leank: { id: "leank-1", title: "Coffee", ownerId: user.id },
        createdAt: new Date(),
      },
    ];
    const prisma = {
      userEntitlement: { findUnique: jest.fn(() => Promise.resolve(null)) },
      reaction: {
        count: jest.fn(() => Promise.resolve(2)),
        findMany: jest.fn(() => Promise.resolve(requests)),
      },
    };
    const service = new ReactionsService(
      prisma as never,
      {} as never,
      {} as never,
    );

    await expect(service.requests(user)).resolves.toEqual(
      expect.objectContaining({
        totalPending: 2,
        visibleCount: 1,
        isPro: false,
        isLocked: true,
        requests: [expect.objectContaining({ id: "request-1" })],
      }),
    );
  });

  it("prevents a host from leaving their own leank", async () => {
    const prisma = {
      $transaction: jest.fn(),
      leank: {
        findUnique: jest.fn(() => Promise.resolve({ ownerId: user.id })),
      },
    };
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    const service = new ReactionsService(
      prisma as never,
      {} as never,
      {} as never,
    );

    await expect(service.leave(user, "leank-1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("restricts participant removal to the host", async () => {
    const prisma = {
      $transaction: jest.fn(),
      leank: {
        findUnique: jest.fn(() => Promise.resolve({ ownerId: "another-user" })),
      },
    };
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    const service = new ReactionsService(
      prisma as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.remove(user, "leank-1", "participant-1"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
