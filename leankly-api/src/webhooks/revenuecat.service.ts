import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { RevenueCatWebhookDto } from "./dto/revenuecat-webhook.dto";

@Injectable()
export class RevenueCatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async handle(authorization: string | undefined, body: RevenueCatWebhookDto) {
    const secret = this.config.getOrThrow<string>("REVENUECAT_WEBHOOK_SECRET");
    if (authorization !== `Bearer ${secret}`) {
      throw new UnauthorizedException("Invalid RevenueCat webhook secret");
    }
    const event = body.event;
    const eventId = this.string(event.id);
    const eventType = this.string(event.type);
    const appUserId = this.string(event.app_user_id);
    if (!eventId || !eventType)
      throw new BadRequestException("Malformed RevenueCat event");

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.revenueCatWebhookEvent.findUnique({
        where: { eventId },
      });
      if (existing) return { received: true, duplicate: true };
      await tx.revenueCatWebhookEvent.create({
        data: {
          eventId,
          eventType,
          appUserId,
          payload: event as Prisma.InputJsonObject,
        },
      });
      if (appUserId) {
        const user = await tx.user.findUnique({
          where: { appwriteUserId: appUserId },
          select: { id: true },
        });
        if (user) {
          const eventAtMs = Number(event.event_timestamp_ms || Date.now());
          const eventAt = new Date(eventAtMs);
          const expiresAtMs = Number(event.expiration_at_ms || 0);
          const expiresAt = expiresAtMs ? new Date(expiresAtMs) : null;
          const inactive = new Set(["EXPIRATION", "SUBSCRIPTION_PAUSED"]);
          const entitlementIds = Array.isArray(event.entitlement_ids)
            ? event.entitlement_ids.map(String)
            : [];
          const requiredId = this.config.get<string>(
            "REVENUECAT_ENTITLEMENT_ID",
          );
          const isPro =
            !inactive.has(eventType) &&
            (!requiredId || entitlementIds.includes(requiredId)) &&
            (!expiresAt || expiresAt > new Date());
          const current = await tx.userEntitlement.findUnique({
            where: { userId: user.id },
          });
          if (!current?.lastEventAt || current.lastEventAt <= eventAt) {
            await tx.userEntitlement.upsert({
              where: { userId: user.id },
              create: {
                userId: user.id,
                isPro,
                expiresAt,
                lastEventAt: eventAt,
              },
              update: { isPro, expiresAt, lastEventAt: eventAt },
            });
          }
        }
      }
      return { received: true, duplicate: false };
    });
  }

  private string(value: unknown) {
    return typeof value === "string" && value ? value : null;
  }
}
