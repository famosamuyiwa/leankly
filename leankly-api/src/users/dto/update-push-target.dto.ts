import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdatePushTargetDto {
  @IsString()
  @MaxLength(36)
  targetId: string;

  @IsString()
  @MaxLength(36)
  providerId: string;

  @IsIn(["ios", "android"])
  platform: "ios" | "android";

  @IsOptional()
  @IsBoolean()
  enabled = true;
}
