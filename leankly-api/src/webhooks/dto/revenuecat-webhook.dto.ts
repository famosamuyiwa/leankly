import { IsObject } from "class-validator";

export class RevenueCatWebhookDto {
  @IsObject()
  event!: Record<string, unknown>;
}
