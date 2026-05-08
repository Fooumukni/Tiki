import { ForbiddenException, Injectable } from '@nestjs/common';
import { OrganizationRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipSummary } from './membership-summary.interface';

const membershipSummarySelect = {
  id: true,
  organizationId: true,
  role: true,
  organization: {
    select: {
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.OrganizationMemberSelect;

type MembershipRecord = Prisma.OrganizationMemberGetPayload<{
  select: typeof membershipSummarySelect;
}>;

@Injectable()
export class MembershipsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findUserMemberships(userProfileId: string): Promise<MembershipSummary[]> {
    const memberships = await this.prismaService.organizationMember.findMany({
      where: { userProfileId },
      orderBy: { createdAt: 'asc' },
      select: membershipSummarySelect,
    });

    return memberships.map((membership) => this.toMembershipSummary(membership));
  }

  async ensureOrganizationMember(userProfileId: string, organizationId: string): Promise<MembershipSummary> {
    const membership = await this.prismaService.organizationMember.findUnique({
      where: {
        organizationId_userProfileId: {
          organizationId,
          userProfileId,
        },
      },
      select: membershipSummarySelect,
    });

    if (!membership) {
      throw new ForbiddenException('User is not a member of this organization');
    }

    return this.toMembershipSummary(membership);
  }

  async ensureOrganizationRole(
    userProfileId: string,
    organizationId: string,
    allowedRoles: OrganizationRole[],
  ): Promise<MembershipSummary> {
    const membership = await this.ensureOrganizationMember(userProfileId, organizationId);

    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('User does not have permission for this organization');
    }

    return membership;
  }

  private toMembershipSummary(membership: MembershipRecord): MembershipSummary {
    return {
      id: membership.id,
      organizationId: membership.organizationId,
      organizationName: membership.organization.name,
      organizationSlug: membership.organization.slug,
      role: membership.role,
    };
  }
}
