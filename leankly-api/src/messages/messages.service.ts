import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { LeankStatus, Prisma, User } from "@prisma/client";
import { JobsService } from "../jobs/jobs.service";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { MessagesQueryDto } from "./dto/messages-query.dto";
import { SendMessageDto } from "./dto/send-message.dto";

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async list(user: User, leankId: string, query: MessagesQueryDto) {
    await this.assertMember(user.id, leankId);
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : null;
    const rows = await this.prisma.message.findMany({
      where: {
        leankId,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
    });
    const hasMore = rows.length > query.limit;
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    return {
      messages: page.reverse(),
      nextCursor:
        hasMore && last ? this.encodeCursor(last.createdAt, last.id) : null,
      hasMore,
    };
  }

  async send(user: User, leankId: string, input: SendMessageDto) {
    const content = input.content.trim();
    if (!content) throw new BadRequestException("Message cannot be empty");
    const result = await this.prisma.$transaction(async (tx) => {
      const leank = await this.memberLeank(tx, user.id, leankId);
      if (leank.status !== LeankStatus.ACTIVE) {
        throw new ForbiddenException("Completed chats are read-only");
      }
      const reply = input.replyToId
        ? await tx.message.findFirst({
            where: { id: input.replyToId, leankId },
          })
        : null;
      if (input.replyToId && !reply) {
        throw new BadRequestException("Reply target is not in this chat");
      }
      const message = await tx.message.create({
        data: {
          leankId,
          senderId: user.id,
          senderName: user.name,
          senderPhoto: user.avatarUrl,
          content,
          replyToId: reply?.id,
          replyToContent: reply?.content,
          replyToSender: reply?.senderName,
        },
      });
      await tx.leank.update({
        where: { id: leankId },
        data: { lastMessageId: message.id, lastMessageAt: message.createdAt },
      });
      await tx.userChatMeta.upsert({
        where: { leankId_userId: { leankId, userId: user.id } },
        create: { leankId, userId: user.id, readAt: message.createdAt },
        update: { readAt: message.createdAt },
      });
      const recipients = await this.recipientUsers(tx, leankId, user.id);
      return { message, leank, recipients };
    });

    this.realtime.emitLeank(leankId, "message.created", result.message);
    for (const recipient of result.recipients) {
      this.realtime.emitUser(recipient.id, "unread.changed", { leankId });
    }
    if (result.recipients.length) {
      await this.jobs
        .enqueuePush({
          recipients: result.recipients.map((item) => item.appwriteUserId),
          title: result.leank.title,
          body: `${user.name}: ${content}`,
          data: { type: "Message", leankId },
        })
        .catch(() => undefined);
    }
    return { message: result.message };
  }

  async markRead(user: User, leankId: string) {
    await this.assertMember(user.id, leankId);
    const meta = await this.prisma.userChatMeta.upsert({
      where: { leankId_userId: { leankId, userId: user.id } },
      create: { leankId, userId: user.id, readAt: new Date() },
      update: { readAt: new Date() },
    });
    this.realtime.emitUser(user.id, "chatMeta.updated", meta);
    this.realtime.emitUser(user.id, "unread.changed", { leankId });
    return { readAt: meta.readAt };
  }

  async unreadCount(user: User) {
    const chats = await this.prisma.leank.findMany({
      where: {
        lastMessageAt: { not: null },
        OR: [
          { ownerId: user.id },
          { participants: { some: { userId: user.id } } },
        ],
      },
      select: {
        lastMessageAt: true,
        lastMessage: { select: { senderId: true } },
        chatMetadata: {
          where: { userId: user.id },
          select: { readAt: true },
          take: 1,
        },
      },
    });
    const count = chats.filter((chat) => {
      if (!chat.lastMessageAt || chat.lastMessage?.senderId === user.id)
        return false;
      const readAt = chat.chatMetadata[0]?.readAt;
      return !readAt || readAt < chat.lastMessageAt;
    }).length;
    return { count };
  }

  private async assertMember(userId: string, leankId: string) {
    await this.memberLeank(this.prisma, userId, leankId);
  }

  private async memberLeank(
    tx: Prisma.TransactionClient | PrismaService,
    userId: string,
    leankId: string,
  ) {
    const leank = await tx.leank.findFirst({
      where: {
        id: leankId,
        OR: [{ ownerId: userId }, { participants: { some: { userId } } }],
      },
      select: { id: true, title: true, status: true },
    });
    if (!leank) throw new NotFoundException("Chat not found");
    return leank;
  }

  private recipientUsers(
    tx: Prisma.TransactionClient,
    leankId: string,
    senderId: string,
  ) {
    return tx.user.findMany({
      where: {
        id: { not: senderId },
        OR: [
          { ownedLeanks: { some: { id: leankId } } },
          { participations: { some: { leankId } } },
        ],
        isActive: true,
        deletedAt: null,
      },
      select: { id: true, appwriteUserId: true },
    });
  }

  private encodeCursor(createdAt: Date, id: string) {
    return Buffer.from(JSON.stringify({ createdAt, id })).toString("base64url");
  }

  private decodeCursor(value: string) {
    try {
      const cursor = JSON.parse(
        Buffer.from(value, "base64url").toString("utf8"),
      ) as { createdAt: string; id: string };
      if (!cursor.createdAt || !cursor.id) throw new Error();
      return { createdAt: new Date(cursor.createdAt), id: cursor.id };
    } catch {
      throw new BadRequestException("Invalid message cursor");
    }
  }
}
