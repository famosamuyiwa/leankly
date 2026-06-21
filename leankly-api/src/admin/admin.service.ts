import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  reports() {
    return this.prisma.report.findMany({
      include: {
        reporter: { select: { id: true, name: true } },
        reported: { select: { id: true, name: true, suspendedAt: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async suspend(userId: string, suspended: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        suspendedAt: suspended ? new Date() : null,
        isActive: !suspended,
      },
      select: { id: true, isActive: true, suspendedAt: true },
    });
    return { user: updated };
  }
}
