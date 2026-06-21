import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateReportDto {
  @IsUUID()
  reportedId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(128)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
