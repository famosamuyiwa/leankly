import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { LeankStatus, Prisma, ReactionStatus, User } from "@prisma/client";
import { ReactionsService } from "./reactions.service";

const user = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Tester",
} as User;

const cursorFor = (createdAt: Date, id: string) =>
  Buffer.from(
    JSON.stringify({ createdAt: createdAt.toISOString(), id }),
  ).toString("base64url");

describe("ReactionsService", () => {
  it("locks quota state in a serializable transaction before post-commit effects", async () => {
    const events: string[] = [];
    const reaction = {
      id: "reaction-1",
      userId: user.id,
      leankId: "leank-1",
      isLiked: true,
      status: ReactionStatus.PENDING,
    };
    const tx = {
      $queryRaw: jest.fn(() => Promise.resolve([])),
      leank: {
        findUnique: jest.fn(() =>
          Promise.resolve({
            id: "leank-1",
            title: "Coffee",
            ownerId: "owner-1",
            status: LeankStatus.ACTIVE,
            owner: { appwriteUserId: "appwrite-owner", name: "Host" },
          }),
        ),
      },
      reaction: {
        findUnique: jest.fn(() => Promise.resolve(null)),
        upsert: jest.fn(() => {
          events.push("reaction-written");
          return Promise.resolve(reaction);
        }),
      },
      userEntitlement: { findUnique: jest.fn(() => Promise.resolve(null)) },
      dailyUsage: {
        upsert: jest.fn(() => Promise.resolve({ id: "usage-1", count: 4 })),
        update: jest.fn(() => Promise.resolve()),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => unknown) => {
          const result = await callback(tx);
          events.push("committed");
          return result;
        },
      ),
    };
    const jobs = {
      enqueuePush: jest.fn(() => {
        events.push("push-enqueued");
        return Promise.resolve();
      }),
    };
    const realtime = {
      emitLeank: jest.fn(() => events.push("realtime-emitted")),
      emitUser: jest.fn(() => events.push("user-event")),
    };
    const attention = {
      getCounts: jest.fn(() =>
        Promise.resolve({
          unreadChatCount: 1,
          pendingRequestCount: 4,
          totalCount: 5,
        }),
      ),
    };
    const service = new ReactionsService(
      prisma as never,
      jobs as never,
      realtime as never,
      attention as never,
    );

    await service.react(user, { leankId: "leank-1", action: "like" });

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.dailyUsage.update).toHaveBeenCalledWith({
      where: { id: "usage-1" },
      data: { count: { increment: 1 } },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(events.indexOf("committed")).toBeLessThan(
      events.indexOf("push-enqueued"),
    );
    expect(jobs.enqueuePush).toHaveBeenCalledWith(
      expect.objectContaining({ badge: 5 }),
    );
    expect(events.indexOf("committed")).toBeLessThan(
      events.indexOf("realtime-emitted"),
    );
  });

  it("includes the requester badge on accepted-request pushes", async () => {
    const reaction = {
      id: "reaction-1",
      userId: "requester-1",
      leankId: "leank-1",
      isLiked: true,
      status: ReactionStatus.PENDING,
      leank: { id: "leank-1", ownerId: user.id, title: "Coffee" },
      user: {
        id: "requester-1",
        appwriteUserId: "appwrite-requester",
        name: "Requester",
      },
    };
    const systemMessage = {
      id: "message-1",
      leankId: "leank-1",
      content: "Requester joined the leank",
      createdAt: new Date("2026-06-23T12:00:00.000Z"),
    };
    const tx = {
      reaction: {
        findUnique: jest.fn(() => Promise.resolve(reaction)),
        update: jest.fn(() => Promise.resolve()),
      },
      participant: { upsert: jest.fn(() => Promise.resolve({ id: "p-1" })) },
      message: { create: jest.fn(() => Promise.resolve(systemMessage)) },
      leank: { update: jest.fn(() => Promise.resolve()) },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const jobs = { enqueuePush: jest.fn(() => Promise.resolve()) };
    const realtime = {
      emitLeank: jest.fn(),
      emitUser: jest.fn(),
    };
    const attention = {
      getCounts: jest.fn(() =>
        Promise.resolve({
          unreadChatCount: 2,
          pendingRequestCount: 3,
          totalCount: 5,
        }),
      ),
    };
    const service = new ReactionsService(
      prisma as never,
      jobs as never,
      realtime as never,
      attention as never,
    );

    await service.accept(user, "reaction-1");

    expect(jobs.enqueuePush).toHaveBeenCalledWith(
      expect.objectContaining({
        recipients: ["appwrite-requester"],
        badge: 5,
      }),
    );
    expect(realtime.emitUser).toHaveBeenCalledWith(
      "requester-1",
      "unread.changed",
      { leankId: "leank-1" },
    );
  });

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
      {} as never,
    );

    await expect(service.requests(user, { limit: 20 })).resolves.toEqual(
      expect.objectContaining({
        totalPending: 2,
        visibleCount: 1,
        isPro: false,
        isLocked: true,
        hasMore: false,
        nextCursor: null,
        requests: [expect.objectContaining({ id: "request-1" })],
      }),
    );
  });

  it("returns paginated requests for a Pro host", async () => {
    const firstCreatedAt = new Date("2026-06-24T12:00:00.000Z");
    const secondCreatedAt = new Date("2026-06-24T11:00:00.000Z");
    const requests = [
      {
        id: "request-3",
        userId: "user-3",
        leankId: "leank-1",
        user: { id: "user-3", name: "C", age: 25, avatarUrl: null },
        leank: { id: "leank-1", title: "Coffee", ownerId: user.id },
        createdAt: firstCreatedAt,
      },
      {
        id: "request-2",
        userId: "user-2",
        leankId: "leank-1",
        user: { id: "user-2", name: "B", age: 26, avatarUrl: null },
        leank: { id: "leank-1", title: "Coffee", ownerId: user.id },
        createdAt: secondCreatedAt,
      },
      {
        id: "request-1",
        userId: "user-1",
        leankId: "leank-1",
        user: { id: "user-1", name: "A", age: 27, avatarUrl: null },
        leank: { id: "leank-1", title: "Coffee", ownerId: user.id },
        createdAt: new Date("2026-06-24T10:00:00.000Z"),
      },
    ];
    const prisma = {
      userEntitlement: {
        findUnique: jest.fn(() =>
          Promise.resolve({ isPro: true, expiresAt: null }),
        ),
      },
      reaction: {
        count: jest.fn(() => Promise.resolve(3)),
        findMany: jest.fn(() => Promise.resolve(requests)),
      },
    };
    const service = new ReactionsService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const result = await service.requests(user, { limit: 2 });

    expect(prisma.reaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 3,
      }),
    );
    expect(result.requests.map((request) => request.id)).toEqual([
      "request-3",
      "request-2",
    ]);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe(cursorFor(secondCreatedAt, "request-2"));
  });

  it("does not apply request cursors for a free host", async () => {
    const requests = [
      {
        id: "request-1",
        userId: "user-1",
        leankId: "leank-1",
        user: { id: "user-1", name: "A", age: 25, avatarUrl: null },
        leank: { id: "leank-1", title: "Coffee", ownerId: user.id },
        createdAt: new Date("2026-06-24T12:00:00.000Z"),
      },
    ];
    const prisma = {
      userEntitlement: { findUnique: jest.fn(() => Promise.resolve(null)) },
      reaction: {
        count: jest.fn(() => Promise.resolve(3)),
        findMany: jest.fn(() => Promise.resolve(requests)),
      },
    };
    const service = new ReactionsService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const result = await service.requests(user, {
      limit: 20,
      cursor: cursorFor(new Date("2026-06-24T11:00:00.000Z"), "request-2"),
    });

    const findManyInput = (prisma.reaction.findMany as jest.Mock).mock
      .calls[0][0] as { where: { OR?: unknown } };
    expect(findManyInput.where.OR).toBeUndefined();
    expect(result.requests.map((request) => request.id)).toEqual(["request-1"]);
    expect(result.isLocked).toBe(true);
    expect(result.hasMore).toBe(false);
  });

  it("applies the request cursor predicate", async () => {
    const cursorCreatedAt = new Date("2026-06-24T11:00:00.000Z");
    const cursorId = "request-2";
    const prisma = {
      userEntitlement: {
        findUnique: jest.fn(() =>
          Promise.resolve({ isPro: true, expiresAt: null }),
        ),
      },
      reaction: {
        count: jest.fn(() => Promise.resolve(1)),
        findMany: jest.fn(() => Promise.resolve([])),
      },
    };
    const service = new ReactionsService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await service.requests(user, {
      limit: 2,
      cursor: cursorFor(cursorCreatedAt, cursorId),
    });

    expect(prisma.reaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { createdAt: { lt: cursorCreatedAt } },
            { createdAt: cursorCreatedAt, id: { lt: cursorId } },
          ],
        }),
      }),
    );
  });

  it("rejects an invalid request cursor", async () => {
    const prisma = {
      userEntitlement: { findUnique: jest.fn() },
      reaction: { count: jest.fn(), findMany: jest.fn() },
    };
    const service = new ReactionsService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.requests(user, { limit: 2, cursor: "not-a-cursor" }),
    ).rejects.toBeInstanceOf(BadRequestException);
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
      {} as never,
    );

    await expect(
      service.remove(user, "leank-1", "participant-1"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
