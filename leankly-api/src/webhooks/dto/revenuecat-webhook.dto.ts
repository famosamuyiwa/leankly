import { IsObject, IsString } from "class-validator";

export class RevenueCatWebhookDto {
  @IsString()
  api_version!: string;
  @IsObject()
  event!: Record<string, unknown>;
}
