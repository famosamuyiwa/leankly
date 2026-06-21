import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateReportDto } from "./dto/create-report.dto";

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  async listBlocks(user: User) {
    const blocks = await this.prisma.block.findMany({
      where: { blockerId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, blockedId: true, createdAt: true },
    });
    return { blockedUserIds: blocks.map((block) => block.blockedId), blocks };
  }

  async block(user: User, blockedId: string) {
    if (blockedId === user.id)
      throw new BadRequestException("You cannot block yourself");
    const target = await this.prisma.user.findFirst({
      where: { id: blockedId, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (!target) throw new NotFoundException("User not found");
    return this.prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: user.id, blockedId } },
      create: { blockerId: user.id, blockedId },
      update: {},
    });
  }

  async report(user: User, input: CreateReportDto) {
    if (input.reportedId === user.id)
      throw new BadRequestException("You cannot report yourself");
    return this.prisma.report.create({
      data: {
        reporterId: user.id,
        reportedId: input.reportedId,
        reason: input.reason.trim(),
        notes: input.notes?.trim() || null,
      },
      select: { id: true, createdAt: true },
    });
  }
}
