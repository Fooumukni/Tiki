import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { sanitizeString } from '../../common/utils/string-sanitizer';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Acme Support' })
  @Transform(({ value }: { value: unknown }) => sanitizeString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;
}
