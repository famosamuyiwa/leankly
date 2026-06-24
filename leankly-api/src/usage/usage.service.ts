import { Injectable } from "@nestjs/common";
import { UsageFeature, User } from "@prisma/client";
import { EntitlementsService } from "../entitlements/entitlements.service";
import { PrismaService } from "../prisma/prisma.service";

export const FREE_LIMITS = { interests: 5, undos: 1 } as const;

export function utcUsageDate(now = new Date()) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

@Injectable()
export class UsageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async getUsage(user: User) {
    const [usage, entitlement] = await Promise.all([
      this.prisma.dailyUsage.findMany({
        where: { userId: user.id, usageDate: utcUsageDate() },
      }),
      this.entitlements.get(user),
    ]);
    const count = (feature: UsageFeature) =>
      usage.find((item) => item.feature === feature)?.count || 0;
    return {
      interestsUsedToday: count(UsageFeature.INTEREST),
      undosUsedToday: count(UsageFeature.UNDO),
      bonusInterests: user.bonusInterests,
      isPro: entitlement.isPro,
      limits: FREE_LIMITS,
    };
  }

  async getEntitlements(user: User) {
    return this.entitlements.get(user);
  }
}
