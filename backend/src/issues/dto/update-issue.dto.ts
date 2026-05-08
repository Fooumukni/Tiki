import { ApiPropertyOptional } from '@nestjs/swagger';
import { IssuePriority } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { sanitizeOptionalString } from '../../common/utils/string-sanitizer';

export class UpdateIssueDto {
  @ApiPropertyOptional({ example: 'Cannot access billing settings' })
  @Transform(({ value }: { value: unknown }) => sanitizeOptionalString(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title?: string;

  @ApiPropertyOptional({ example: 'The customer receives a 403 error on billing settings.' })
  @Transform(({ value }: { value: unknown }) => sanitizeOptionalString(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  originalDescription?: string;

  @ApiPropertyOptional({ example: 'Billing' })
  @Transform(({ value }: { value: unknown }) => sanitizeOptionalString(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  category?: string;

  @ApiPropertyOptional({ enum: IssuePriority, example: IssuePriority.HIGH })
  @IsOptional()
  @IsEnum(IssuePriority)
  priority?: IssuePriority;
}
