import { IsIn, IsString, MaxLength } from "class-validator";

export class ConfirmMediaDto {
  @IsString()
  @MaxLength(36)
  fileId: string;

  @IsIn(["avatars", "leank_covers"])
  bucket: "avatars" | "leank_covers";

  @IsIn(["avatar", "leank_cover"])
  purpose: "avatar" | "leank_cover";
}
