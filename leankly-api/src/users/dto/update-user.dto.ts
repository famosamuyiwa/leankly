import { Type } from "class-transformer";
import {
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(128)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(16)
  @Max(120)
  age?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  sex?: string;

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
  @IsString()
  avatarFileId?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
