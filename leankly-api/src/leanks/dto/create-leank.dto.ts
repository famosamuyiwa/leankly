import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";

export class CreateLeankDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description = "";

  @IsOptional()
  @IsString()
  @MaxLength(36)
  coverFileId?: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  time = "";

  @IsBoolean()
  isOnline: boolean;

  @ValidateIf((input: CreateLeankDto) => !input.isOnline)
  @IsString()
  @MinLength(2)
  @MaxLength(256)
  location?: string;

  @ValidateIf((input: CreateLeankDto) => !input.isOnline)
  @Type(() => Number)
  @IsLatitude()
  locationLat?: number;

  @ValidateIf((input: CreateLeankDto) => !input.isOnline)
  @Type(() => Number)
  @IsLongitude()
  locationLng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  peopleRequired = 1;
}

export class UpdateLeankDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  coverFileId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  time?: string;

  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  location?: string;

  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  locationLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  locationLng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  peopleRequired?: number;
}
