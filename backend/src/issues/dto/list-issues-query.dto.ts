import { ApiPropertyOptional } from '@nestjs/swagger';
import { IssuePriority, IssueStatus, SourceChannel } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { sanitizeOptionalString } from '../../common/utils/string-sanitizer';

function optionalNumber(value: unknown): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return Number(value);
}

export class ListIssuesQueryDto {
  @ApiPropertyOptional({ enum: IssueStatus })
  @IsOptional()
  @IsEnum(IssueStatus)
  status?: IssueStatus;

  @ApiPropertyOptional({ enum: IssuePriority })
  @IsOptional()
  @IsEnum(IssuePriority)
  priority?: IssuePriority;

  @ApiPropertyOptional({ enum: SourceChannel })
  @IsOptional()
  @IsEnum(SourceChannel)
  sourceChannel?: SourceChannel;

  @ApiPropertyOptional({ example: 'Billing' })
  @Transform(({ value }: { value: unknown }) => sanitizeOptionalString(value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @ApiPropertyOptional({ example: 'billing access' })
  @Transform(({ value }: { value: unknown }) => sanitizeOptionalString(value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @Transform(({ value }: { value: unknown }) => optionalNumber(value))
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1, maximum: 100 })
  @Transform(({ value }: { value: unknown }) => optionalNumber(value))
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: '2026-05-01T00:00:00.000Z' })
  @Transform(({ value }: { value: unknown }) => sanitizeOptionalString(value))
  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-05-31T23:59:59.999Z' })
  @Transform(({ value }: { value: unknown }) => sanitizeOptionalString(value))
  @IsOptional()
  @IsISO8601()
  toDate?: string;
}
