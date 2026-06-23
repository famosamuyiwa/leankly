import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LeankStatus, Prisma, User } from "@prisma/client";
import { AttentionCountsService } from "../attention/attention-counts.service";
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
    private readonly config: ConfigService,
    private readonly attention: AttentionCountsService,
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
      await Promise.all(
        result.recipients.map((recipient) =>
          this.enqueueMessagePush({
            recipient,
            title: result.leank.title,
            body: `${user.name}: ${content}`,
            leankId,
            coverUrl: result.leank.coverUrl,
            coverFileId: result.leank.coverFileId,
          }),
        ),
      );
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
    const count = await this.attention.unreadChatCount(user.id);
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
      select: {
        id: true,
        title: true,
        status: true,
        coverUrl: true,
        coverFileId: true,
      },
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

  private async enqueueMessagePush(input: {
    recipient: { id: string; appwriteUserId: string };
    title: string;
    body: string;
    leankId: string;
    coverUrl: string;
    coverFileId: string | null;
  }) {
    let badge: number | undefined;
    try {
      badge = (await this.attention.getCounts(input.recipient.id)).totalCount;
    } catch {
      badge = undefined;
    }

    await this.jobs
      .enqueuePush({
        recipients: [input.recipient.appwriteUserId],
        title: input.title,
        body: input.body,
        badge,
        image: this.coverPushImage(input.coverFileId),
        data: {
          type: "Message",
          leankId: input.leankId,
          coverUrl: input.coverUrl,
        },
      })
      .catch(() => undefined);
  }

  private coverPushImage(coverFileId: string | null) {
    if (!coverFileId) return undefined;
    const bucketId = this.config.get<string>("APPWRITE_LEANK_COVER_BUCKET_ID");
    return bucketId ? `${bucketId}:${coverFileId}` : undefined;
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
