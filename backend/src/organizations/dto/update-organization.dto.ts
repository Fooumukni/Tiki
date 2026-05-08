import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { sanitizeString } from '../../common/utils/string-sanitizer';

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ example: 'Acme Customer Support' })
  @Transform(({ value }: { value: unknown }) => sanitizeString(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;
}
