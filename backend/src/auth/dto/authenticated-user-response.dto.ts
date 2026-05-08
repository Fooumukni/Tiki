import { ApiProperty } from '@nestjs/swagger';
import { OrganizationRole } from '@prisma/client';

export class AuthenticatedUserMembershipResponseDto {
  @ApiProperty({ example: '37d3be22-ef91-4fb1-bcb9-0ff519f8668f' })
  id!: string;

  @ApiProperty({ example: '8b6ad4a0-0521-43f6-bda1-8324108d8818' })
  organizationId!: string;

  @ApiProperty({ example: 'Acme Support' })
  organizationName!: string;

  @ApiProperty({ example: 'acme-support' })
  organizationSlug!: string;

  @ApiProperty({ enum: OrganizationRole, example: OrganizationRole.ORG_ADMIN })
  role!: OrganizationRole;
}

export class AuthenticatedUserResponseDto {
  @ApiProperty({ example: '37d3be22-ef91-4fb1-bcb9-0ff519f8668f' })
  id!: string;

  @ApiProperty({ example: 'af9a8c14-8df5-4a61-a58c-6a1b0975fd21' })
  keycloakUserId!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'User Name' })
  fullName!: string;

  @ApiProperty({ type: [AuthenticatedUserMembershipResponseDto] })
  memberships!: AuthenticatedUserMembershipResponseDto[];
}
