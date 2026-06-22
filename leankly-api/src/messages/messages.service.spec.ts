import { NotFoundException } from "@nestjs/common";
import { LeankStatus, User } from "@prisma/client";
import { MessagesService } from "./messages.service";

const user = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Sender",
  avatarUrl: null,
} as User;

describe("MessagesService", () => {
  it("commits message, read state, and chat summary before realtime and push", async () => {
    const events: string[] = [];
    const createdAt = new Date("2026-06-21T12:00:00.000Z");
    const message = {
      id: "message-1",
      leankId: "leank-1",
      senderId: user.id,
      senderName: user.name,
      content: "Hello",
      createdAt,
    };
    const tx = {
      leank: {
        findFirst: jest.fn(() =>
          Promise.resolve({
            id: "leank-1",
            title: "Coffee",
            status: LeankStatus.ACTIVE,
          }),
        ),
        update: jest.fn(() => Promise.resolve()),
      },
      message: { create: jest.fn(() => Promise.resolve(message)) },
      userChatMeta: { upsert: jest.fn(() => Promise.resolve()) },
      user: {
        findMany: jest.fn(() =>
          Promise.resolve([
            { id: "recipient-1", appwriteUserId: "appwrite-recipient" },
          ]),
        ),
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
      emitLeank: jest.fn(() => events.push("leank-event")),
      emitUser: jest.fn(() => events.push("user-event")),
    };
    const service = new MessagesService(
      prisma as never,
      jobs as never,
      realtime as never,
    );

    await service.send(user, "leank-1", { content: " Hello " });

    expect(tx.leank.update).toHaveBeenCalledWith({
      where: { id: "leank-1" },
      data: { lastMessageId: message.id, lastMessageAt: createdAt },
    });
    expect(tx.userChatMeta.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ readAt: createdAt }),
      }),
    );
    expect(jobs.enqueuePush).toHaveBeenCalledWith(
      expect.objectContaining({ recipients: ["appwrite-recipient"] }),
    );
    expect(events.indexOf("committed")).toBeLessThan(
      events.indexOf("leank-event"),
    );
    expect(events.indexOf("committed")).toBeLessThan(
      events.indexOf("push-enqueued"),
    );
  });

  it("does not expose messages to non-members", async () => {
    const prisma = {
      leank: { findFirst: jest.fn(() => Promise.resolve(null)) },
    };
    const service = new MessagesService(
      prisma as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.list(user, "00000000-0000-4000-8000-000000000002", {
        limit: 50,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("counts only unread messages sent by another member", async () => {
    const now = new Date();
    const prisma = {
      leank: {
        findMany: jest.fn(() =>
          Promise.resolve([
            {
              lastMessageAt: now,
              lastMessage: { senderId: "another-user" },
              chatMetadata: [],
            },
            {
              lastMessageAt: now,
              lastMessage: { senderId: user.id },
              chatMetadata: [],
            },
            {
              lastMessageAt: now,
              lastMessage: { senderId: "another-user" },
              chatMetadata: [{ readAt: new Date(now.getTime() + 1000) }],
            },
          ]),
        ),
      },
    };
    const service = new MessagesService(
      prisma as never,
      {} as never,
      {} as never,
    );

    await expect(service.unreadCount(user)).resolves.toEqual({ count: 1 });
    expect(prisma.leank.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: LeankStatus.ACTIVE }),
      }),
    );
  });
});
