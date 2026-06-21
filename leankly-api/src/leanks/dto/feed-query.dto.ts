import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

const toBoolean = ({ value }: { value: unknown }) =>
  value === true || value === "true";

export class FeedQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  today?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  thisWeek?: boolean;

  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : String(value).split(","),
  )
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ageMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ageMax?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includeOnline?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  nearbyLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  nearbyLng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  radiusKm = 25;
}
