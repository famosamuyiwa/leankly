import { ForbiddenException } from "@nestjs/common";
import { LeankCategory, LeankStatus, User } from "@prisma/client";
import { LeanksService } from "./leanks.service";

const userId = "00000000-0000-4000-8000-000000000001";
const user = { id: userId } as User;

describe("LeanksService", () => {
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
    const service = new LeanksService(
      { leank: { findMany } } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const result = await service.chats(user);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          lastMessage: true,
          chatMetadata: { where: { userId }, take: 1 },
        }),
        orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
      }),
    );
    expect(result.items[0].lastMessage).toEqual(unreadMessage);
    expect(result.metas).toEqual([
      ...rows[1].chatMetadata,
      ...rows[2].chatMetadata,
    ]);
    expect(result.unreadCount).toBe(1);
  });
});
