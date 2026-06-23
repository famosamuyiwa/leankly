import { LeankStatus, ReactionStatus } from "@prisma/client";
import {
  AttentionCountsService,
  countUnreadChatRows,
  toAttentionCounts,
} from "./attention-counts.service";

describe("AttentionCountsService", () => {
  it("counts unread chats sent by another member", () => {
    const userId = "user-1";
    const now = new Date("2026-06-23T12:00:00.000Z");

    expect(
      countUnreadChatRows(
        [
          {
            lastMessageAt: now,
            lastMessage: { senderId: "another-user" },
            chatMetadata: [],
          },
          {
            lastMessageAt: now,
            lastMessage: { senderId: userId },
            chatMetadata: [],
          },
          {
            lastMessageAt: now,
            lastMessage: { senderId: "another-user" },
            chatMetadata: [{ readAt: new Date(now.getTime() + 1000) }],
          },
        ],
        userId,
      ),
    ).toBe(1);
  });

  it("combines unread chats and pending requests", () => {
    expect(toAttentionCounts(2, 3)).toEqual({
      unreadChatCount: 2,
      pendingRequestCount: 3,
      totalCount: 5,
    });
  });

  it("loads counts from Prisma", async () => {
    const userId = "user-1";
    const now = new Date("2026-06-23T12:00:00.000Z");
    const prisma = {
      leank: {
        findMany: jest.fn(() =>
          Promise.resolve([
            {
              lastMessageAt: now,
              lastMessage: { senderId: "another-user" },
              chatMetadata: [],
            },
          ]),
        ),
      },
      reaction: { count: jest.fn(() => Promise.resolve(4)) },
    };
    const service = new AttentionCountsService(prisma as never);

    await expect(service.getCounts(userId)).resolves.toEqual({
      unreadChatCount: 1,
      pendingRequestCount: 4,
      totalCount: 5,
    });
    expect(prisma.leank.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: LeankStatus.ACTIVE,
        }),
      }),
    );
    expect(prisma.reaction.count).toHaveBeenCalledWith({
      where: {
        isLiked: true,
        status: ReactionStatus.PENDING,
        leank: { ownerId: userId },
      },
    });
  });
});
