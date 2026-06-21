import { Injectable } from "@nestjs/common";
import { User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UpdatePushTargetDto } from "./dto/update-push-target.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  getProfile(user: User) {
    return this.toResponse(user);
  }

  async updateProfile(user: User, input: UpdateUserDto) {
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: input,
    });
    return this.toResponse(updated);
  }

  async updatePushTarget(user: User, input: UpdatePushTargetDto) {
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        pushTargetId: input.targetId,
        pushProviderId: input.providerId,
        pushPlatform: input.platform,
        pushEnabled: input.enabled,
      },
    });
    return {
      targetId: updated.pushTargetId,
      providerId: updated.pushProviderId,
      platform: updated.pushPlatform,
      enabled: updated.pushEnabled,
    };
  }

  async deleteProfile(user: User) {
    const deletedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.block.deleteMany({
        where: { OR: [{ blockerId: user.id }, { blockedId: user.id }] },
      });
      await tx.report.deleteMany({
        where: { OR: [{ reporterId: user.id }, { reportedId: user.id }] },
      });
      await tx.referral.deleteMany({
        where: { OR: [{ referrerId: user.id }, { referredId: user.id }] },
      });
      await tx.dailyUsage.deleteMany({ where: { userId: user.id } });
      await tx.userEntitlement.deleteMany({ where: { userId: user.id } });
      await tx.user.update({
        where: { id: user.id },
        data: { deletedAt, isActive: false, pushEnabled: false },
      });
    });
    return { deletedAt };
  }

  private toResponse(user: User) {
    const onboardingComplete = Boolean(
      user.name.trim().length >= 2 &&
      user.age &&
      user.location?.trim() &&
      typeof user.locationLat === "number" &&
      typeof user.locationLng === "number",
    );
    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      name: user.name,
      avatar: user.avatarUrl || "",
      avatarFileId: user.avatarFileId,
      age: user.age,
      sex: user.sex || "",
      location: user.location || "",
      locationLat: user.locationLat,
      locationLng: user.locationLng,
      referralCode: user.referralCode,
      referralCount: user.referralCount,
      bonusInterests: user.bonusInterests,
      onboardingComplete,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
