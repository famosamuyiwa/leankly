import { IsBoolean } from "class-validator";

export class SetDeveloperModeDto {
  @IsBoolean()
  enabled!: boolean;
}
