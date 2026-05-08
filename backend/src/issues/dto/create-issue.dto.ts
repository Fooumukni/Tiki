import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { normalizeEmail, sanitizeOptionalString, sanitizeString } from '../../common/utils/string-sanitizer';

export class CreateIssueDto {
  @ApiProperty({ example: 'Jane Customer' })
  @Transform(({ value }: { value: unknown }) => sanitizeString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  requesterName!: string;

  @ApiProperty({ example: 'jane.customer@example.com' })
  @Transform(({ value }: { value: unknown }) => normalizeEmail(value))
  @IsEmail()
  @MaxLength(254)
  requesterEmail!: string;

  @ApiPropertyOptional({ example: 'Cannot access billing settings' })
  @Transform(({ value }: { value: unknown }) => sanitizeOptionalString(value))
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @ApiProperty({ example: 'I receive an error when I try to open the billing settings page.' })
  @Transform(({ value }: { value: unknown }) => sanitizeString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  originalDescription!: string;
}
