import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Category } from '@prisma/client';

// Kept in sync with the frontend Zod schema
// (frontend/src/features/applications/application-schema.ts).
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateApplicationDto {
  @Transform(trim)
  @IsString()
  @MinLength(5, { message: 'title must be at least 5 characters' })
  @MaxLength(120, { message: 'title must be at most 120 characters' })
  @Matches(/\p{L}/u, { message: 'title must contain letters, not just numbers or symbols' })
  title: string;

  @IsEnum(Category, { message: 'category must be one of FINANCE, PROCUREMENT, TRAVEL, OPERATIONS' })
  category: Category;

  @Transform(trim)
  @IsString()
  @MinLength(10, { message: 'description must be at least 10 characters' })
  @MaxLength(2000, { message: 'description must be at most 2000 characters' })
  description: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'amount must be a number with at most 2 decimal places' })
  @IsPositive({ message: 'amount must be greater than 0' })
  @Max(10_000_000, { message: 'amount must not exceed 10,000,000' })
  amount: number;
}
