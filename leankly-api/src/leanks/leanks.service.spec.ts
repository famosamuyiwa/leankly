import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { LeankCategory, LeankStatus, User } from "@prisma/client";
import { LeanksService } from "./leanks.service";

const userId = "00000000-0000-4000-8000-000000000001";
const user = { id: userId } as User;
const otherUserId = "00000000-0000-4000-8000-000000000002";

const cursorFor = (createdAt: Date, id: string) =>
  Buffer.from(
    JSON.stringify({ createdAt: createdAt.toISOString(), id }),
  ).toString("base64url");

const chatCursorFor = (activityAt: Date, id: string) =>
  Buffer.from(
    JSON.stringify({ activityAt: activityAt.toISOString(), id }),
  ).toString("base64url");

const leankRow = (id: string, createdAt: Date, ownerId = userId) => ({
  id,
  coverUrl: "https://example.com/cover.jpg",
  coverFileId: null,
  title: `Leank ${id}`,
  description: "Catch up",
  status: LeankStatus.ACTIVE,
  category: LeankCategory.SOCIAL,
  peopleRequired: 1,
  eventDate: new Date("2026-06-30T00:00:00.000Z"),
  time: "12:00 PM",
  location: "Cafe",
  locationLat: null,
  locationLng: null,
  isOnline: false,
  ownerId,
  owner: { id: ownerId, name: "Owner", age: 25, avatarUrl: null },
  participants: ownerId === userId ? [] : [{ userId }],
  lastMessageId: null,
  lastMessageAt: null,
  lastActivityAt: createdAt,
  createdAt,
  updatedAt: createdAt,
});

const makeEntitlements = (isPro = false) => ({
  isEffectivePro: jest.fn(() => Promise.resolve(isPro)),
});

const makeService = (prisma: unknown, isPro = false) =>
  new LeanksService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    makeEntitlements(isPro) as never,
  );

describe("LeanksService", () => {
  it("rejects Pro-only filters when the entitlement cache is inactive", async () => {
    const prisma = {
      userEntitlement: { findUnique: jest.fn(() => Promise.resolve(null)) },
    };
    const service = makeService(prisma);
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
    const service = makeService(prisma);
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

  it("returns last messages and current-user read metadata with the unread count", async () => {
    const unreadAt = new Date("2026-06-22T12:00:00.000Z");
    const readAt = new Date("2026-06-22T12:05:00.000Z");
    const base = {
      coverUrl: "https://example.com/cover.jpg",
      coverFileId: null,
      title: "Coffee",
      description: "Catch up",
      status: LeankStatus.ACTIVE,
      category: LeankCategory.SOCIAL,
      peopleRequired: 1,
      eventDate: new Date("2026-06-30T00:00:00.000Z"),
      time: "12:00 PM",
      location: "Cafe",
      locationLat: null,
      locationLng: null,
      isOnline: false,
      ownerId: userId,
      owner: { id: userId, name: "Owner", age: 25, avatarUrl: null },
      participants: [],
      createdAt: new Date("2026-06-20T12:00:00.000Z"),
      lastActivityAt: unreadAt,
      updatedAt: unreadAt,
    };
    const unreadMessage = {
      id: "message-unread",
      leankId: "chat-unread",
      senderId: "00000000-0000-4000-8000-000000000002",
      senderName: "Participant",
      senderPhoto: null,
      content: "Latest message",
      type: "USER",
      replyToId: null,
      replyToContent: null,
      replyToSender: null,
      createdAt: unreadAt,
      updatedAt: unreadAt,
    };
    const ownMessage = {
      ...unreadMessage,
      id: "message-own",
      leankId: "chat-own",
      senderId: userId,
      senderName: "Owner",
      content: "Sent by me",
    };
    const readMessage = {
      ...unreadMessage,
      id: "message-read",
      leankId: "chat-read",
      content: "Already read",
    };
    const rows = [
      {
        ...base,
        id: "chat-unread",
        lastMessageId: unreadMessage.id,
        lastMessageAt: unreadAt,
        lastMessage: unreadMessage,
        chatMetadata: [],
      },
      {
        ...base,
        id: "chat-own",
        lastMessageId: ownMessage.id,
        lastMessageAt: unreadAt,
        lastMessage: ownMessage,
        chatMetadata: [
          {
            id: "meta-own",
            leankId: "chat-own",
            userId,
            readAt,
            createdAt: unreadAt,
            updatedAt: readAt,
          },
        ],
      },
      {
        ...base,
        id: "chat-read",
        lastMessageId: readMessage.id,
        lastMessageAt: unreadAt,
        lastMessage: readMessage,
        chatMetadata: [
          {
            id: "meta-read",
            leankId: "chat-read",
            userId,
            readAt,
            createdAt: unreadAt,
            updatedAt: readAt,
          },
        ],
      },
    ];
    const findMany = jest.fn(() => Promise.resolve(rows));
    const service = makeService({ leank: { findMany } });

    const result = await service.chats(user, { limit: 20 });

    expect(findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        include: expect.objectContaining({
          lastMessage: true,
          chatMetadata: { where: { userId }, take: 1 },
        }),
        orderBy: [{ lastActivityAt: "desc" }, { id: "desc" }],
        take: 21,
      }),
    );
    expect(findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        select: expect.objectContaining({
          lastMessageAt: true,
          lastMessage: { select: { senderId: true } },
        }),
      }),
    );
    expect(result.items[0].lastMessage).toEqual(unreadMessage);
    expect(result.metas).toEqual([
      ...rows[1].chatMetadata,
      ...rows[2].chatMetadata,
    ]);
    expect(result.unreadCount).toBe(1);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it("returns a chat page with a next cursor when more rows exist", async () => {
    const first = {
      ...leankRow(
        "00000000-0000-4000-8000-000000000030",
        new Date("2026-06-24T12:00:00.000Z"),
      ),
      lastMessage: null,
      chatMetadata: [],
    };
    const second = {
      ...leankRow(
        "00000000-0000-4000-8000-000000000020",
        new Date("2026-06-23T12:00:00.000Z"),
      ),
      lastMessage: null,
      chatMetadata: [],
    };
    const extra = {
      ...leankRow(
        "00000000-0000-4000-8000-000000000010",
        new Date("2026-06-22T12:00:00.000Z"),
      ),
      lastMessage: null,
      chatMetadata: [],
    };
    const findMany = jest.fn((args) =>
      Promise.resolve(args.select ? [] : [first, second, extra]),
    );
    const service = makeService({ leank: { findMany } });

    const result = await service.chats(user, { limit: 2 });

    expect(findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          status: LeankStatus.ACTIVE,
          AND: [
            {
              OR: [{ ownerId: userId }, { participants: { some: { userId } } }],
            },
          ],
        }),
        orderBy: [{ lastActivityAt: "desc" }, { id: "desc" }],
        take: 3,
      }),
    );
    expect(result.items.map((item) => item.id)).toEqual([first.id, second.id]);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe(
      chatCursorFor(second.lastActivityAt, second.id),
    );
  });

  it("applies the chat cursor predicate", async () => {
    const cursorActivityAt = new Date("2026-06-23T12:00:00.000Z");
    const cursorId = "00000000-0000-4000-8000-000000000020";
    const row = {
      ...leankRow(
        "00000000-0000-4000-8000-000000000010",
        new Date("2026-06-22T12:00:00.000Z"),
      ),
      lastMessage: null,
      chatMetadata: [],
    };
    const findMany = jest.fn((args) =>
      Promise.resolve(args.select ? [] : [row]),
    );
    const service = makeService({ leank: { findMany } });

    const result = await service.chats(user, {
      limit: 2,
      cursor: chatCursorFor(cursorActivityAt, cursorId),
    });

    expect(findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [
            {
              OR: [{ ownerId: userId }, { participants: { some: { userId } } }],
            },
            {
              OR: [
                { lastActivityAt: { lt: cursorActivityAt } },
                { lastActivityAt: cursorActivityAt, id: { lt: cursorId } },
              ],
            },
          ],
        }),
      }),
    );
    expect(result.items.map((item) => item.id)).toEqual([row.id]);
    expect(result.hasMore).toBe(false);
  });

  it("returns a hosted page with a next cursor when more rows exist", async () => {
    const first = leankRow(
      "00000000-0000-4000-8000-000000000010",
      new Date("2026-06-24T12:00:00.000Z"),
    );
    const second = leankRow(
      "00000000-0000-4000-8000-000000000009",
      new Date("2026-06-23T12:00:00.000Z"),
    );
    const extra = leankRow(
      "00000000-0000-4000-8000-000000000008",
      new Date("2026-06-22T12:00:00.000Z"),
    );
    const findMany = jest.fn(() => Promise.resolve([first, second, extra]));
    const service = makeService({ leank: { findMany } });

    const result = await service.hosted(user, { limit: 2 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ownerId: userId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 3,
      }),
    );
    expect(result.items.map((item) => item.id)).toEqual([first.id, second.id]);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe(cursorFor(second.createdAt, second.id));
  });

  it("applies the attended cursor predicate and returns only the requested page", async () => {
    const cursorCreatedAt = new Date("2026-06-23T12:00:00.000Z");
    const cursorId = "00000000-0000-4000-8000-000000000009";
    const row = leankRow(
      "00000000-0000-4000-8000-000000000008",
      new Date("2026-06-22T12:00:00.000Z"),
      otherUserId,
    );
    const findMany = jest.fn(() => Promise.resolve([row]));
    const service = makeService({ leank: { findMany } });

    const result = await service.attended(user, {
      limit: 2,
      cursor: cursorFor(cursorCreatedAt, cursorId),
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          participants: { some: { userId } },
          OR: [
            { createdAt: { lt: cursorCreatedAt } },
            { createdAt: cursorCreatedAt, id: { lt: cursorId } },
          ],
        }),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 3,
      }),
    );
    expect(result.items.map((item) => item.id)).toEqual([row.id]);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it("rejects an invalid profile pagination cursor", async () => {
    const service = makeService({ leank: { findMany: jest.fn() } });

    await expect(
      service.hosted(user, { limit: 2, cursor: "not-a-cursor" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects an invalid chat pagination cursor", async () => {
    const service = makeService({ leank: { findMany: jest.fn() } });

    await expect(
      service.chats(user, { limit: 2, cursor: "not-a-cursor" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns exact hosted and attended profile counts", async () => {
    const prisma = {
      leank: { count: jest.fn(() => Promise.resolve(7)) },
      participant: { count: jest.fn(() => Promise.resolve(4)) },
    };
    const service = makeService(prisma);

    await expect(service.profileCounts(user)).resolves.toEqual({
      hosted: 7,
      attended: 4,
    });
    expect(prisma.leank.count).toHaveBeenCalledWith({
      where: { ownerId: userId },
    });
    expect(prisma.participant.count).toHaveBeenCalledWith({
      where: { userId },
    });
  });
});
