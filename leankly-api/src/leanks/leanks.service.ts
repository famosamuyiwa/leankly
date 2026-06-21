import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LeankCategory, LeankStatus, Prisma, User } from "@prisma/client";
import { JobsService } from "../jobs/jobs.service";
import { MediaService } from "../media/media.service";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { categoryFromValue } from "./leank.constants";
import { CreateLeankDto, UpdateLeankDto } from "./dto/create-leank.dto";
import { FeedQueryDto } from "./dto/feed-query.dto";
import { presentLeank } from "./leank.presenter";

const include = {
  owner: { select: { id: true, name: true, age: true, avatarUrl: true } },
  participants: { select: { userId: true } },
} satisfies Prisma.LeankInclude;

@Injectable()
export class LeanksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly jobs: JobsService,
    private readonly config: ConfigService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async create(user: User, input: CreateLeankDto) {
    const cover = input.coverFileId
      ? await this.media.confirm(user, {
          fileId: input.coverFileId,
          bucket: "leank_covers",
          purpose: "leank_cover",
        })
      : null;
    const coverUrl = cover?.viewUrl || this.defaultCover();
    if (!coverUrl) throw new BadRequestException("A cover image is required");

    const leank = await this.prisma.leank.create({
      data: {
        ownerId: user.id,
        title: input.title.trim(),
        description: input.description.trim(),
        coverUrl,
        coverFileId: cover?.fileId || null,
        eventDate: this.dateOnly(input.date),
        time: input.time,
        isOnline: input.isOnline,
        location: input.isOnline ? "Online" : input.location!,
        locationLat: input.isOnline ? null : input.locationLat,
        locationLng: input.isOnline ? null : input.locationLng,
        peopleRequired: input.peopleRequired,
      },
      include,
    });
    await this.jobs
      .enqueueClassification({
        leankId: leank.id,
        title: leank.title,
        description: leank.description,
      })
      .catch(() => undefined);
    return presentLeank(leank);
  }

  async feed(user: User, query: FeedQueryDto) {
    const hasProFilter = Boolean(
      query.today ||
      query.thisWeek ||
      query.categories?.length ||
      query.ageMin ||
      query.ageMax,
    );
    if (hasProFilter && !(await this.isPro(user.id))) {
      throw new ForbiddenException({
        code: "PRO_REQUIRED",
        message: "This feed filter requires Leankly+",
      });
    }

    const categories = query.categories?.map(categoryFromValue);
    if (categories?.some((category) => !category)) {
      throw new BadRequestException("Unknown leank category");
    }
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : null;
    const dateFilter = this.dateFilter(query);
    const nearby = this.nearbyFilter(query);
    const where: Prisma.LeankWhereInput = {
      status: LeankStatus.ACTIVE,
      ownerId: { not: user.id },
      participants: { none: { userId: user.id } },
      reactions: { none: { userId: user.id } },
      owner: {
        isActive: true,
        deletedAt: null,
        blocksCreated: { none: { blockedId: user.id } },
        blocksReceived: { none: { blockerId: user.id } },
        ...(query.ageMin || query.ageMax
          ? { age: { gte: query.ageMin, lte: query.ageMax } }
          : {}),
      },
      ...(categories?.length
        ? { category: { in: categories as LeankCategory[] } }
        : {}),
      ...(dateFilter ? { eventDate: dateFilter } : {}),
      ...(nearby ? nearby : {}),
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              { createdAt: cursor.createdAt, id: { lt: cursor.id } },
            ],
          }
        : {}),
    };
    const rows = await this.prisma.leank.findMany({
      where,
      include,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
    });
    const exactRows = this.filterDistance(rows, query);
    const hasMore = rows.length > query.limit;
    const items = exactRows.slice(0, query.limit);
    const last = items.at(-1);
    return {
      items: items.map(presentLeank),
      nextCursor:
        hasMore && last ? this.encodeCursor(last.createdAt, last.id) : null,
      hasMore,
    };
  }

  async getById(id: string) {
    const leank = await this.prisma.leank.findUnique({
      where: { id },
      include,
    });
    if (!leank) throw new NotFoundException("Leank not found");
    return presentLeank(leank);
  }

  async hosted(user: User) {
    const rows = await this.prisma.leank.findMany({
      where: { ownerId: user.id },
      include,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { items: rows.map(presentLeank) };
  }

  async attended(user: User) {
    const rows = await this.prisma.leank.findMany({
      where: { participants: { some: { userId: user.id } } },
      include,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { items: rows.map(presentLeank) };
  }

  async chats(user: User) {
    const rows = await this.prisma.leank.findMany({
      where: {
        status: LeankStatus.ACTIVE,
        OR: [
          { ownerId: user.id },
          { participants: { some: { userId: user.id } } },
        ],
      },
      include,
      orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
      take: 100,
    });
    return { items: rows.map(presentLeank) };
  }

  async update(user: User, id: string, input: UpdateLeankDto) {
    await this.assertOwner(user, id);
    const cover = input.coverFileId
      ? await this.media.confirm(user, {
          fileId: input.coverFileId,
          bucket: "leank_covers",
          purpose: "leank_cover",
        })
      : null;
    const online = input.isOnline;
    const leank = await this.prisma.leank.update({
      where: { id },
      data: {
        title: input.title?.trim(),
        description: input.description?.trim(),
        eventDate: input.date ? this.dateOnly(input.date) : undefined,
        time: input.time,
        peopleRequired: input.peopleRequired,
        isOnline: online,
        location: online === true ? "Online" : input.location,
        locationLat: online === true ? null : input.locationLat,
        locationLng: online === true ? null : input.locationLng,
        coverFileId: cover?.fileId,
        coverUrl: cover?.viewUrl,
      },
      include,
    });
    return presentLeank(leank);
  }

  async close(user: User, id: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.leank.findUnique({
        where: { id },
        select: { ownerId: true, status: true },
      });
      if (!existing) throw new NotFoundException("Leank not found");
      if (existing.ownerId !== user.id)
        throw new ForbiddenException("Only the host can close this leank");
      if (existing.status === LeankStatus.COMPLETED) {
        return {
          leank: await tx.leank.findUniqueOrThrow({ where: { id }, include }),
          message: null,
        };
      }
      const message = await tx.message.create({
        data: {
          leankId: id,
          senderName: "Leankly",
          content: "This leank has ended",
          type: "SYSTEM",
        },
      });
      const leank = await tx.leank.update({
        where: { id },
        data: {
          status: LeankStatus.COMPLETED,
          lastMessageId: message.id,
          lastMessageAt: message.createdAt,
        },
        include,
      });
      return { leank, message };
    });
    this.realtime.emitLeank(id, "leank.updated", presentLeank(result.leank));
    if (result.message)
      this.realtime.emitLeank(id, "message.created", result.message);
    return presentLeank(result.leank);
  }

  private async assertOwner(user: User, id: string) {
    const leank = await this.prisma.leank.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    if (!leank) throw new NotFoundException("Leank not found");
    if (leank.ownerId !== user.id)
      throw new ForbiddenException("Only the host can update this leank");
  }

  private async isPro(userId: string) {
    const entitlement = await this.prisma.userEntitlement.findUnique({
      where: { userId },
    });
    return Boolean(
      entitlement?.isPro &&
      (!entitlement.expiresAt || entitlement.expiresAt > new Date()),
    );
  }

  private defaultCover() {
    return (this.config.get<string>("DEFAULT_LEANK_COVER_URLS") || "")
      .split(",")
      .map((value) => value.trim())
      .find(Boolean);
  }

  private dateOnly(value: string) {
    return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  }

  private dateFilter(query: FeedQueryDto): Prisma.DateTimeFilter | null {
    if (!query.today && !query.thisWeek) return null;
    const start = this.dateOnly(new Date().toISOString());
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + (query.thisWeek ? 7 : 1));
    return { gte: start, lt: end };
  }

  private nearbyFilter(query: FeedQueryDto): Prisma.LeankWhereInput | null {
    if (query.nearbyLat === undefined || query.nearbyLng === undefined) {
      return query.includeOnline ? { isOnline: true } : null;
    }
    const latDelta = query.radiusKm / 111;
    const lngDelta =
      query.radiusKm /
      (111 * Math.max(Math.cos((query.nearbyLat * Math.PI) / 180), 0.01));
    const nearby = {
      isOnline: false,
      locationLat: {
        gte: query.nearbyLat - latDelta,
        lte: query.nearbyLat + latDelta,
      },
      locationLng: {
        gte: query.nearbyLng - lngDelta,
        lte: query.nearbyLng + lngDelta,
      },
    };
    return query.includeOnline ? { OR: [{ isOnline: true }, nearby] } : nearby;
  }

  private filterDistance<
    T extends {
      isOnline: boolean;
      locationLat: number | null;
      locationLng: number | null;
    },
  >(rows: T[], query: FeedQueryDto) {
    if (query.nearbyLat === undefined || query.nearbyLng === undefined)
      return rows;
    return rows.filter((row) => {
      if (row.isOnline) return Boolean(query.includeOnline);
      if (row.locationLat === null || row.locationLng === null) return false;
      const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
      const dLat = toRadians(row.locationLat - query.nearbyLat!);
      const dLng = toRadians(row.locationLng - query.nearbyLng!);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(query.nearbyLat!)) *
          Math.cos(toRadians(row.locationLat)) *
          Math.sin(dLng / 2) ** 2;
      return (
        6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= query.radiusKm
      );
    });
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
      if (!value.id || Number.isNaN(Date.parse(value.createdAt)))
        throw new Error("invalid");
      return { id: String(value.id), createdAt: new Date(value.createdAt) };
    } catch {
      throw new BadRequestException("Invalid feed cursor");
    }
  }
}
