import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApplicationStatus } from '@prisma/client';

export class QueryApplicationsDto {
  @IsOptional()
  @IsEnum(ApplicationStatus, { message: 'status must be a valid ApplicationStatus' })
  status?: ApplicationStatus;

  @IsOptional()
  @IsString()
  search?: string;
}
