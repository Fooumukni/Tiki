import { ApiProperty } from '@nestjs/swagger';
import { OrganizationPlan, OrganizationRole } from '@prisma/client';

export class OrganizationResponseDto {
  @ApiProperty({ example: '8b6ad4a0-0521-43f6-bda1-8324108d8818' })
  id!: string;

  @ApiProperty({ example: 'Acme Support' })
  name!: string;

  @ApiProperty({ example: 'acme-support' })
  slug!: string;

  @ApiProperty({ enum: OrganizationPlan, example: OrganizationPlan.DEMO })
  plan!: OrganizationPlan;

  @ApiProperty({ example: 100 })
  aiUsageLimit!: number;

  @ApiProperty({ example: 0 })
  aiUsageCount!: number;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: OrganizationRole.ORG_ADMIN, enum: OrganizationRole })
  role!: OrganizationRole;

  @ApiProperty({ example: '2026-05-07T01:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-07T01:00:00.000Z' })
  updatedAt!: Date;
}

