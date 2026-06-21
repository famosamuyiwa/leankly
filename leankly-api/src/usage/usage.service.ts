import { Injectable } from "@nestjs/common";
import { UsageFeature, User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export const FREE_LIMITS = { interests: 5, undos: 1 } as const;

export function utcUsageDate(now = new Date()) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsage(user: User) {
    const [usage, entitlement] = await Promise.all([
      this.prisma.dailyUsage.findMany({
        where: { userId: user.id, usageDate: utcUsageDate() },
      }),
      this.prisma.userEntitlement.findUnique({ where: { userId: user.id } }),
    ]);
    const count = (feature: UsageFeature) =>
      usage.find((item) => item.feature === feature)?.count || 0;
    return {
      interestsUsedToday: count(UsageFeature.INTEREST),
      undosUsedToday: count(UsageFeature.UNDO),
      bonusInterests: user.bonusInterests,
      isPro: this.isActive(entitlement),
      limits: FREE_LIMITS,
    };
  }

  async getEntitlements(user: User) {
    const entitlement = await this.prisma.userEntitlement.findUnique({
      where: { userId: user.id },
    });
    return {
      isPro: this.isActive(entitlement),
      expiresAt: entitlement?.expiresAt || null,
    };
  }

  private isActive(
    entitlement: { isPro: boolean; expiresAt: Date | null } | null,
  ) {
    return Boolean(
      entitlement?.isPro &&
      (!entitlement.expiresAt || entitlement.expiresAt > new Date()),
    );
  }
}
