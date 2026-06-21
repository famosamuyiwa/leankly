import { Injectable } from "@nestjs/common";
import { User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(user: User) {
    const entitlement = await this.prisma.userEntitlement.findUnique({
      where: { userId: user.id },
    });
    const active = Boolean(
      entitlement?.isPro &&
      (!entitlement.expiresAt || entitlement.expiresAt > new Date()),
    );
    return {
      isPro: active,
      expiresAt: entitlement?.expiresAt || null,
      updatedAt: entitlement?.updatedAt || null,
    };
  }
}
