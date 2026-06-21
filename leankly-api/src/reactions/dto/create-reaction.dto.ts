import { IsIn, IsUUID } from "class-validator";

export class CreateReactionDto {
  @IsUUID()
  leankId: string;

  @IsIn(["like", "skip"])
  action: "like" | "skip";
}
