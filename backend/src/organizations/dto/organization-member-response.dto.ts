import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationRole } from '@prisma/client';

export class OrganizationMemberUserResponseDto {
  @ApiProperty({ example: '37d3be22-ef91-4fb1-bcb9-0ff519f8668f' })
  id!: string;

  @ApiProperty({ example: 'agent@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: 'Agent Smith' })
  fullName?: string | null;
}

export class OrganizationMemberResponseDto {
  @ApiProperty({ example: '1d1a0601-07ff-4b71-b746-51aaf8d23a99' })
  id!: string;

  @ApiProperty({ enum: OrganizationRole, example: OrganizationRole.AGENT })
  role!: OrganizationRole;

  @ApiProperty({ example: '2026-05-07T01:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-07T01:00:00.000Z' })
  updatedAt!: Date;

  @ApiProperty({ type: OrganizationMemberUserResponseDto })
  userProfile!: OrganizationMemberUserResponseDto;
}

