import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { Prisma, User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const BONUS_PER_REFERRAL = 10;

@Injectable()
export class ReferralsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(user: User) {
    const current = user.referralCode
      ? user
      : await this.assignReferralCode(user);
    return {
      referralCode: current.referralCode,
      referralCount: current.referralCount,
      bonusInterests: current.bonusInterests,
    };
  }

  async apply(user: User, rawCode: string) {
    const code = rawCode.trim().toUpperCase();
    const referrer = await this.prisma.user.findFirst({
      where: { referralCode: code, isActive: true, deletedAt: null },
    });
    if (!referrer) {
      throw new BadRequestException({
        code: "INVALID_CODE",
        message: "Invalid referral code",
      });
    }
    if (referrer.id === user.id) {
      throw new BadRequestException({
        code: "SELF_REFERRAL",
        message: "You cannot refer yourself",
      });
    }

    const existing = await this.prisma.referral.findUnique({
      where: { referredId: user.id },
    });
    if (existing) {
      if (existing.referrerId === referrer.id)
        return { applied: false, reason: "ALREADY_APPLIED" };
      throw new ConflictException({
        code: "ALREADY_APPLIED",
        message: "A referral has already been applied",
      });
    }

    try {
      await this.prisma.$transaction(
        async (tx) => {
          await tx.referral.create({
            data: { referrerId: referrer.id, referredId: user.id, code },
          });
          await tx.user.update({
            where: { id: user.id },
            data: { referredById: referrer.id },
          });
          await tx.user.update({
            where: { id: referrer.id },
            data: {
              referralCount: { increment: 1 },
              bonusInterests: { increment: BONUS_PER_REFERRAL },
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return { applied: false, reason: "ALREADY_APPLIED" };
      }
      throw error;
    }
    return { applied: true, bonusAwarded: BONUS_PER_REFERRAL };
  }

  private async assignReferralCode(user: User) {
    const prefix =
      user.name
        .replace(/[^a-z0-9]/gi, "")
        .slice(0, 4)
        .toUpperCase() || "USER";
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const suffix = Math.floor(1000 + Math.random() * 9000);
      try {
        return await this.prisma.user.update({
          where: { id: user.id },
          data: { referralCode: `${prefix}-${suffix}` },
        });
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== "P2002"
        )
          throw error;
      }
    }
    throw new ConflictException("Could not allocate a unique referral code");
  }
}
