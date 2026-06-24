import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  LeankStatus,
  Prisma,
  ReactionStatus,
  UsageFeature,
  User,
} from "@prisma/client";
import { AttentionCountsService } from "../attention/attention-counts.service";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { EntitlementsService } from "../entitlements/entitlements.service";
import { JobsService } from "../jobs/jobs.service";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { FREE_LIMITS, utcUsageDate } from "../usage/usage.service";
import { CreateReactionDto } from "./dto/create-reaction.dto";

@Injectable()
export class ReactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
    private readonly realtime: RealtimeGateway,
    private readonly attention: AttentionCountsService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async react(user: User, input: CreateReactionDto) {
    let shouldNotify = false;
    const result = await this.prisma.$transaction(
      async (tx) => {
        const leank = await tx.leank.findUnique({
          where: { id: input.leankId },
          include: { owner: { select: { appwriteUserId: true, name: true } } },
        });
        if (!leank) throw new NotFoundException("Leank not found");
        if (leank.ownerId === user.id)
          throw new BadRequestException("You cannot react to your own leank");
        if (leank.status !== LeankStatus.ACTIVE)
          throw new ConflictException("This leank is closed");

        const existing = await tx.reaction.findUnique({
          where: {
            userId_leankId: { userId: user.id, leankId: input.leankId },
          },
        });
        const isLiked = input.action === "like";
        if (existing?.status === ReactionStatus.ACCEPTED && !isLiked) {
          throw new ConflictException(
            "Leave the leank instead of changing an accepted reaction",
          );
        }
        if (
          existing?.isLiked === isLiked &&
          existing.status === ReactionStatus.PENDING
        ) {
          return { reaction: existing, leank };
        }

        if (isLiked) {
          await this.consumeInterest(tx, user);
          shouldNotify = true;
        }
        const reaction = await tx.reaction.upsert({
          where: {
            userId_leankId: { userId: user.id, leankId: input.leankId },
          },
          create: {
            userId: user.id,
            leankId: input.leankId,
            isLiked,
            status: ReactionStatus.PENDING,
          },
          update: { isLiked, status: ReactionStatus.PENDING },
        });
        return { reaction, leank };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (shouldNotify) {
      const badge = await this.badgeForUser(result.leank.ownerId);
      await this.jobs
        .enqueuePush({
          recipients: [result.leank.owner.appwriteUserId],
          title: "New leank request",
          body: `${user.name} wants to join ${result.leank.title}`,
          badge,
          data: { type: "Alert", leankId: result.leank.id },
        })
        .catch(() => undefined);
    }
    this.realtime.emitLeank(input.leankId, "reaction.updated", result.reaction);
    this.realtime.emitUser(result.leank.ownerId, "attention.changed", {
      leankId: input.leankId,
    });
    return { reaction: result.reaction };
  }

  async undo(user: User, leankId: string) {
    const result = await this.prisma.$transaction(
      async (tx) => {
        await this.lockUser(tx, user.id);
        const reaction = await tx.reaction.findUnique({
          where: { userId_leankId: { userId: user.id, leankId } },
        });
        if (!reaction) return { leankId, undone: false };
        if (reaction.status === ReactionStatus.ACCEPTED) {
          throw new ConflictException("Accepted requests cannot be undone");
        }
        if (!(await this.entitlements.isEffectivePro(user, tx))) {
          const usage = await this.usage(tx, user.id, UsageFeature.UNDO);
          if (usage.count >= FREE_LIMITS.undos) {
            throw new HttpException(
              { code: "UNDO_LIMIT", message: "Daily undo limit reached" },
              HttpStatus.PAYMENT_REQUIRED,
            );
          }
          await tx.dailyUsage.update({
            where: { id: usage.id },
            data: { count: { increment: 1 } },
          });
        }
        await tx.reaction.delete({ where: { id: reaction.id } });
        return { leankId, undone: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    this.realtime.emitLeank(leankId, "reaction.updated", result);
    return result;
  }

  async requests(user: User, query: PaginationQueryDto) {
    const decodedCursor = query.cursor ? this.decodeCursor(query.cursor) : null;
    const isPro = await this.entitlements.isEffectivePro(user);
    const cursor = isPro ? decodedCursor : null;
    const effectiveLimit = isPro ? query.limit : 1;
    const where = {
      isLiked: true,
      status: ReactionStatus.PENDING,
      leank: { ownerId: user.id },
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              { createdAt: cursor.createdAt, id: { lt: cursor.id } },
            ],
          }
        : {}),
    } satisfies Prisma.ReactionWhereInput;
    const [total, requests] = await Promise.all([
      this.prisma.reaction.count({
        where: {
          isLiked: true,
          status: ReactionStatus.PENDING,
          leank: { ownerId: user.id },
        },
      }),
      this.prisma.reaction.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, age: true, avatarUrl: true },
          },
          leank: { select: { id: true, title: true, ownerId: true } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: effectiveLimit + (isPro ? 1 : 0),
      }),
    ]);
    const hasMore = isPro && requests.length > effectiveLimit;
    const visible = requests.slice(0, effectiveLimit);
    const last = visible.at(-1);
    return {
      requests: visible.map((request) => ({
        id: request.id,
        userId: request.userId,
        leankId: request.leankId,
        user: {
          id: request.user.id,
          name: request.user.name,
          age: request.user.age,
          avatar: request.user.avatarUrl || "",
        },
        leank: request.leank,
        createdAt: request.createdAt,
      })),
      totalPending: total,
      visibleCount: visible.length,
      isPro,
      isLocked: !isPro && total > visible.length,
      nextCursor:
        hasMore && last ? this.encodeCursor(last.createdAt, last.id) : null,
      hasMore,
    };
  }

  async accept(user: User, reactionId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const reaction = await tx.reaction.findUnique({
        where: { id: reactionId },
        include: {
          leank: true,
          user: { select: { id: true, appwriteUserId: true, name: true } },
        },
      });
      if (!reaction) throw new NotFoundException("Request not found");
      if (reaction.leank.ownerId !== user.id)
        throw new ForbiddenException("Only the host can accept requests");
      if (!reaction.isLiked)
        throw new ConflictException("This reaction is not a join request");
      if (reaction.status === ReactionStatus.DECLINED)
        throw new ConflictException("This request was declined");
      const participant = await tx.participant.upsert({
        where: {
          leankId_userId: {
            leankId: reaction.leankId,
            userId: reaction.userId,
          },
        },
        create: { leankId: reaction.leankId, userId: reaction.userId },
        update: {},
      });
      let systemMessage = null;
      if (reaction.status !== ReactionStatus.ACCEPTED) {
        await tx.reaction.update({
          where: { id: reaction.id },
          data: { status: ReactionStatus.ACCEPTED },
        });
        systemMessage = await this.addSystemMessage(
          tx,
          reaction.leankId,
          `${reaction.user.name} joined the leank`,
        );
      }
      return {
        participant,
        reaction,
        alreadyAccepted: reaction.status === ReactionStatus.ACCEPTED,
        systemMessage,
      };
    });

    if (!result.alreadyAccepted) {
      const badge = await this.badgeForUser(result.reaction.user.id);
      await this.jobs
        .enqueuePush({
          recipients: [result.reaction.user.appwriteUserId],
          title: "Leank request accepted",
          body: result.reaction.leank.title,
          badge,
          data: { type: "Alert", leankId: result.reaction.leankId },
        })
        .catch(() => undefined);
    }
    this.realtime.emitLeank(result.reaction.leankId, "reaction.updated", {
      id: result.reaction.id,
      status: ReactionStatus.ACCEPTED,
    });
    if (result.systemMessage) {
      this.realtime.emitLeank(
        result.reaction.leankId,
        "message.created",
        result.systemMessage,
      );
      this.realtime.emitUser(result.reaction.user.id, "unread.changed", {
        leankId: result.reaction.leankId,
      });
    }
    return {
      participant: result.participant,
      alreadyAccepted: result.alreadyAccepted,
    };
  }

  async decline(user: User, reactionId: string) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const reaction = await tx.reaction.findUnique({
        where: { id: reactionId },
        include: { leank: { select: { ownerId: true } } },
      });
      if (!reaction) throw new NotFoundException("Request not found");
      if (reaction.leank.ownerId !== user.id)
        throw new ForbiddenException("Only the host can decline requests");
      if (reaction.status === ReactionStatus.ACCEPTED)
        throw new ConflictException("Accepted requests cannot be declined");
      return tx.reaction.update({
        where: { id: reactionId },
        data: { status: ReactionStatus.DECLINED },
      });
    });
    this.realtime.emitLeank(updated.leankId, "reaction.updated", updated);
    this.realtime.emitUser(user.id, "attention.changed", {
      leankId: updated.leankId,
    });
    return { reaction: updated };
  }

  async participants(user: User, leankId: string) {
    await this.assertMember(user, leankId);
    const rows = await this.prisma.participant.findMany({
      where: { leankId },
      include: {
        user: { select: { id: true, name: true, age: true, avatarUrl: true } },
      },
      orderBy: { joinedAt: "asc" },
    });
    return {
      participants: rows.map((row) => ({
        id: row.id,
        joinedAt: row.joinedAt,
        user: { ...row.user, avatar: row.user.avatarUrl || "" },
      })),
    };
  }

  async leave(user: User, leankId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const leank = await tx.leank.findUnique({ where: { id: leankId } });
      if (!leank) throw new NotFoundException("Leank not found");
      if (leank.ownerId === user.id)
        throw new BadRequestException("Hosts must close the leank");
      const deleted = await tx.participant.deleteMany({
        where: { leankId, userId: user.id },
      });
      const message = deleted.count
        ? await this.addSystemMessage(
            tx,
            leankId,
            `${user.name} left the leank`,
          )
        : null;
      return { leankId, left: deleted.count > 0, message };
    });
    if (result.message)
      this.realtime.emitLeank(leankId, "message.created", result.message);
    return { leankId, left: result.left };
  }

  async remove(user: User, leankId: string, participantUserId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const leank = await tx.leank.findUnique({ where: { id: leankId } });
      if (!leank) throw new NotFoundException("Leank not found");
      if (leank.ownerId !== user.id)
        throw new ForbiddenException("Only the host can remove participants");
      if (participantUserId === user.id)
        throw new BadRequestException("Hosts cannot remove themselves");
      const participant = await tx.user.findUnique({
        where: { id: participantUserId },
        select: { name: true },
      });
      const deleted = await tx.participant.deleteMany({
        where: { leankId, userId: participantUserId },
      });
      const message = deleted.count
        ? await this.addSystemMessage(
            tx,
            leankId,
            `${participant?.name || "A participant"} was removed`,
          )
        : null;
      return { removed: deleted.count > 0, message };
    });
    if (result.message)
      this.realtime.emitLeank(leankId, "message.created", result.message);
    this.realtime.emitUser(participantUserId, "leank.updated", {
      leankId,
      removed: result.removed,
    });
    return { leankId, userId: participantUserId, removed: result.removed };
  }

  private async consumeInterest(tx: Prisma.TransactionClient, user: User) {
    await this.lockUser(tx, user.id);
    if (await this.entitlements.isEffectivePro(user, tx)) return;
    const usage = await this.usage(tx, user.id, UsageFeature.INTEREST);
    if (usage.count < FREE_LIMITS.interests) {
      await tx.dailyUsage.update({
        where: { id: usage.id },
        data: { count: { increment: 1 } },
      });
      return;
    }
    const quotaUser = await tx.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { bonusInterests: true },
    });
    if (quotaUser.bonusInterests > 0) {
      await tx.user.update({
        where: { id: user.id },
        data: { bonusInterests: { decrement: 1 } },
      });
      return;
    }
    throw new HttpException(
      { code: "INTEREST_LIMIT", message: "Daily interest limit reached" },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }

  private usage(
    tx: Prisma.TransactionClient,
    userId: string,
    feature: UsageFeature,
  ) {
    return tx.dailyUsage.upsert({
      where: {
        userId_feature_usageDate: {
          userId,
          feature,
          usageDate: utcUsageDate(),
        },
      },
      create: { userId, feature, usageDate: utcUsageDate(), count: 0 },
      update: {},
    });
  }

  private async lockUser(tx: Prisma.TransactionClient, userId: string) {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
  }

  private async assertMember(user: User, leankId: string) {
    const leank = await this.prisma.leank.findFirst({
      where: {
        id: leankId,
        OR: [
          { ownerId: user.id },
          { participants: { some: { userId: user.id } } },
        ],
      },
      select: { id: true },
    });
    if (!leank)
      throw new ForbiddenException("You are not a member of this leank");
  }

  private async addSystemMessage(
    tx: Prisma.TransactionClient,
    leankId: string,
    content: string,
  ) {
    const message = await tx.message.create({
      data: {
        leankId,
        senderName: "Leankly",
        content,
        type: "SYSTEM",
      },
    });
    await tx.leank.update({
      where: { id: leankId },
      data: {
        lastMessageId: message.id,
        lastMessageAt: message.createdAt,
        lastActivityAt: message.createdAt,
      },
    });
    return message;
  }

  private async badgeForUser(userId: string) {
    try {
      return (await this.attention.getCounts(userId)).totalCount;
    } catch {
      return undefined;
    }
  }

  private encodeCursor(createdAt: Date, id: string) {
    return Buffer.from(
      JSON.stringify({ createdAt: createdAt.toISOString(), id }),
    ).toString("base64url");
  }

  private decodeCursor(cursor: string): { createdAt: Date; id: string } {
    try {
      const value = JSON.parse(
        Buffer.from(cursor, "base64url").toString("utf8"),
      );
      if (!value.id || Number.isNaN(Date.parse(value.createdAt))) {
        throw new Error("invalid");
      }
      return { id: String(value.id), createdAt: new Date(value.createdAt) };
    } catch {
      throw new BadRequestException("Invalid requests cursor");
    }
  }
}
