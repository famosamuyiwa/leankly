import { ForbiddenException, Injectable } from "@nestjs/common";
import { Prisma, User, UserEntitlement, UserRole } from "@prisma/client";
import {
  canUseDeveloperMode,
  hasPermission,
  UserPermission,
} from "../auth/permissions";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(user: User) {
    const entitlement = await this.loadEntitlement(this.prisma, user.id);
    return this.toResponse(user, entitlement);
  }

  async setDeveloperMode(user: User, enabled: boolean) {
    if (user.role === UserRole.ADMIN) {
      return this.get(user);
    }
    if (!canUseDeveloperMode(user.role)) {
      throw new ForbiddenException("Developer Mode is not available");
    }

    const now = new Date();
    const entitlement = await this.prisma.userEntitlement.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        developerModeEnabled: enabled,
        developerModeUpdatedAt: now,
      },
      update: {
        developerModeEnabled: enabled,
        developerModeUpdatedAt: now,
      },
    });
    return this.toResponse(user, entitlement);
  }

  async isEffectivePro(
    user: Pick<User, "id" | "role">,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const entitlement = await this.loadEntitlement(client, user.id);
    return this.toResponse(user, entitlement).isPro;
  }

  private async loadEntitlement(
    client: PrismaService | Prisma.TransactionClient,
    userId: string,
  ) {
    return client.userEntitlement.findUnique({
      where: { userId },
    });
  }

  private toResponse(
    user: Pick<User, "role">,
    entitlement: UserEntitlement | null,
  ) {
    const paidActive = this.isPaidActive(entitlement);
    const roleCanUseDeveloperMode =
      canUseDeveloperMode(user.role) &&
      hasPermission(user.role, UserPermission.LEANKLY_PLUS_BYPASS);
    const developerModeEnabled = roleCanUseDeveloperMode
      ? Boolean(entitlement?.developerModeEnabled)
      : false;
    const bypassActive =
      user.role === UserRole.ADMIN ||
      (roleCanUseDeveloperMode && developerModeEnabled);

    return {
      isPro: paidActive || bypassActive,
      paidActive,
      bypassActive,
      developerModeEnabled,
      canUseDeveloperMode: roleCanUseDeveloperMode,
      expiresAt: entitlement?.expiresAt || null,
      updatedAt: entitlement?.updatedAt || null,
    };
  }

  private isPaidActive(
    entitlement:
      | Pick<UserEntitlement, "isPro" | "expiresAt">
      | null
      | undefined,
  ) {
    return Boolean(
      entitlement?.isPro &&
      (!entitlement.expiresAt || entitlement.expiresAt > new Date()),
    );
  }
}
