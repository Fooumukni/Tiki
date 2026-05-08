import { ApiProperty } from '@nestjs/swagger';
import { OrganizationRole } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum } from 'class-validator';
import { normalizeEmail } from '../../common/utils/string-sanitizer';

export class AddOrganizationMemberDto {
  @ApiProperty({ example: 'agent@example.com' })
  @Transform(({ value }: { value: unknown }) => normalizeEmail(value))
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: OrganizationRole, example: OrganizationRole.AGENT })
  @IsEnum(OrganizationRole)
  role!: OrganizationRole;
}
