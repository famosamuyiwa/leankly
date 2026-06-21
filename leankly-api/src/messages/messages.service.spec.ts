import { NotFoundException } from "@nestjs/common";
import { User } from "@prisma/client";
import { MessagesService } from "./messages.service";

const user = {
  id: "00000000-0000-4000-8000-000000000001",
} as User;

describe("MessagesService", () => {
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
  });
});
