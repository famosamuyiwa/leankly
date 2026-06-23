import { Injectable } from "@nestjs/common";
import { LeankStatus, Prisma, ReactionStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type PrismaReader = Prisma.TransactionClient | PrismaService;

export type AttentionCounts = {
  unreadChatCount: number;
  pendingRequestCount: number;
  totalCount: number;
};

export type UnreadChatRow = {
  lastMessageAt: Date | null;
  lastMessage: { senderId: string | null } | null;
  chatMetadata: { readAt: Date | null }[];
};

export function countUnreadChatRows(rows: UnreadChatRow[], userId: string) {
  return rows.filter((chat) => {
    if (!chat.lastMessageAt || chat.lastMessage?.senderId === userId) {
      return false;
    }
    const readAt = chat.chatMetadata[0]?.readAt;
    return !readAt || readAt < chat.lastMessageAt;
  }).length;
}

export function toAttentionCounts(
  unreadChatCount: number,
  pendingRequestCount: number,
): AttentionCounts {
  return {
    unreadChatCount,
    pendingRequestCount,
    totalCount: unreadChatCount + pendingRequestCount,
  };
}

@Injectable()
export class AttentionCountsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCounts(
    userId: string,
    tx: PrismaReader = this.prisma,
  ): Promise<AttentionCounts> {
    const [unreadChatCount, pendingRequestCount] = await Promise.all([
      this.unreadChatCount(userId, tx),
      this.pendingRequestCount(userId, tx),
    ]);
    return toAttentionCounts(unreadChatCount, pendingRequestCount);
  }

  async unreadChatCount(userId: string, tx: PrismaReader = this.prisma) {
    const chats = await tx.leank.findMany({
      where: {
        status: LeankStatus.ACTIVE,
        lastMessageAt: { not: null },
        OR: [{ ownerId: userId }, { participants: { some: { userId } } }],
      },
      select: {
        lastMessageAt: true,
        lastMessage: { select: { senderId: true } },
        chatMetadata: {
          where: { userId },
          select: { readAt: true },
          take: 1,
        },
      },
    });
    return countUnreadChatRows(chats, userId);
  }

  pendingRequestCount(userId: string, tx: PrismaReader = this.prisma) {
    return tx.reaction.count({
      where: {
        isLiked: true,
        status: ReactionStatus.PENDING,
        leank: { ownerId: userId },
      },
    });
  }
}
