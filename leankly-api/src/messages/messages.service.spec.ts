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
            coverUrl: "https://example.com/cover.jpg",
            coverFileId: "cover-file-1",
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
    const config = {
      get: jest.fn((key: string) =>
        key === "APPWRITE_LEANK_COVER_BUCKET_ID" ? "cover-bucket" : undefined,
      ),
    };
    const attention = {
      getCounts: jest.fn(() =>
        Promise.resolve({
          unreadChatCount: 1,
          pendingRequestCount: 2,
          totalCount: 3,
        }),
      ),
    };
    const service = new MessagesService(
      prisma as never,
      jobs as never,
      realtime as never,
      config as never,
      attention as never,
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
      expect.objectContaining({
        recipients: ["appwrite-recipient"],
        badge: 3,
        image: "cover-bucket:cover-file-1",
        data: {
          type: "Message",
          leankId: "leank-1",
          coverUrl: "https://example.com/cover.jpg",
        },
      }),
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
    const attention = { unreadChatCount: jest.fn(() => Promise.resolve(1)) };
    const service = new MessagesService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      attention as never,
    );

    await expect(service.unreadCount(user)).resolves.toEqual({ count: 1 });
    expect(attention.unreadChatCount).toHaveBeenCalledWith(user.id);
  });
});
