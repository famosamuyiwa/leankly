import { Injectable } from "@nestjs/common";
import { User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UpdatePushTargetDto } from "./dto/update-push-target.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { MediaService } from "../media/media.service";
import { AttentionCountsService } from "../attention/attention-counts.service";
import { permissionsForRole } from "../auth/permissions";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly attention: AttentionCountsService,
  ) {}

  getProfile(user: User) {
    return this.toResponse(user);
  }

  async updateProfile(user: User, input: UpdateUserDto) {
    const avatar = input.avatarFileId
      ? await this.media.confirm(user, {
          fileId: input.avatarFileId,
          bucket: "avatars",
          purpose: "avatar",
        })
      : null;
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        ...input,
        avatarFileId: avatar?.fileId || input.avatarFileId,
        avatarUrl: avatar?.viewUrl,
      },
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

  attentionCounts(user: User) {
    return this.attention.getCounts(user.id);
  }

  async deleteProfile(user: User) {
    const deletedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.leank.deleteMany({ where: { ownerId: user.id } });
      await tx.participant.deleteMany({ where: { userId: user.id } });
      await tx.reaction.deleteMany({ where: { userId: user.id } });
      await tx.userChatMeta.deleteMany({ where: { userId: user.id } });
      await tx.leank.updateMany({
        where: { lastMessage: { is: { senderId: user.id } } },
        data: { lastMessageId: null, lastMessageAt: null },
      });
      await tx.message.deleteMany({ where: { senderId: user.id } });
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
        data: {
          deletedAt,
          isActive: false,
          pushEnabled: false,
          pushTargetId: null,
          pushProviderId: null,
          pushPlatform: null,
        },
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
      role: user.role,
      permissions: permissionsForRole(user.role),
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
