import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationRole, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { MembershipsService } from '../memberships/memberships.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddOrganizationMemberDto } from './dto/add-organization-member.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationMemberResponseDto } from './dto/organization-member-response.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { UpdateOrganizationMemberRoleDto } from './dto/update-organization-member-role.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import {
  OrganizationBaseRecord,
  OrganizationMemberRecord,
  OrganizationWithRoleRecord,
  organizationBaseSelect,
  organizationMemberSelect,
} from './organization-record.types';

const organizationAdminRoles = [OrganizationRole.ORG_ADMIN];
const maxSlugCreationAttempts = 5;

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly membershipsService: MembershipsService,
  ) {}

  async createOrganization(
    currentUser: AuthenticatedUser,
    createOrganizationDto: CreateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    for (let attempt = 0; attempt < maxSlugCreationAttempts; attempt += 1) {
      const slug = await this.generateAvailableSlug(createOrganizationDto.name);

      try {
        return await this.prismaService.$transaction(async (transaction) => {
          const organization = await transaction.organization.create({
            data: {
              name: createOrganizationDto.name,
              slug,
            },
            select: organizationBaseSelect,
          });
          const member = await transaction.organizationMember.create({
            data: {
              organizationId: organization.id,
              userProfileId: currentUser.id,
              role: OrganizationRole.ORG_ADMIN,
            },
            select: {
              role: true,
            },
          });
          await this.createAuditLog(transaction, {
            userProfileId: currentUser.id,
            organizationId: organization.id,
            action: 'organization.created',
            entityType: 'Organization',
            entityId: organization.id,
            metadata: {
              name: organization.name,
              slug: organization.slug,
            },
          });

          return this.toOrganizationResponse(organization, member.role);
        });
      } catch (error) {
        if (this.isUniqueConstraintError(error)) {
          continue;
        }

        throw error;
      }
    }

    throw new ConflictException('Organization slug could not be generated');
  }

  async listOrganizations(currentUser: AuthenticatedUser): Promise<OrganizationResponseDto[]> {
    const organizations = await this.prismaService.organization.findMany({
      where: {
        members: {
          some: {
            userProfileId: currentUser.id,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: this.organizationWithCurrentUserRoleSelect(currentUser.id),
    });

    return organizations.map((organization) => this.toOrganizationResponseFromMembership(organization));
  }

  async getOrganization(currentUser: AuthenticatedUser, organizationId: string): Promise<OrganizationResponseDto> {
    const membership = await this.membershipsService.ensureOrganizationMember(currentUser.id, organizationId);
    const organization = await this.findOrganizationOrThrow(organizationId);

    return this.toOrganizationResponse(organization, membership.role);
  }

  async updateOrganization(
    currentUser: AuthenticatedUser,
    organizationId: string,
    updateOrganizationDto: UpdateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    const membership = await this.membershipsService.ensureOrganizationRole(
      currentUser.id,
      organizationId,
      organizationAdminRoles,
    );

    if (!updateOrganizationDto.name) {
      const organization = await this.findOrganizationOrThrow(organizationId);
      return this.toOrganizationResponse(organization, membership.role);
    }

    const organization = await this.prismaService.$transaction(async (transaction) => {
      const existingOrganization = await transaction.organization.findUnique({
        where: { id: organizationId },
        select: organizationBaseSelect,
      });

      if (!existingOrganization) {
        throw new NotFoundException('Organization not found');
      }

      const updatedOrganization = await transaction.organization.update({
        where: { id: organizationId },
        data: { name: updateOrganizationDto.name },
        select: organizationBaseSelect,
      });

      if (existingOrganization.name !== updatedOrganization.name) {
        await this.createAuditLog(transaction, {
          userProfileId: currentUser.id,
          organizationId,
          action: 'organization.renamed',
          entityType: 'Organization',
          entityId: organizationId,
          metadata: {
            previousName: existingOrganization.name,
            newName: updatedOrganization.name,
          },
        });
      }

      return updatedOrganization;
    });

    return this.toOrganizationResponse(organization, membership.role);
  }

  async listOrganizationMembers(
    currentUser: AuthenticatedUser,
    organizationId: string,
  ): Promise<OrganizationMemberResponseDto[]> {
    await this.membershipsService.ensureOrganizationRole(currentUser.id, organizationId, organizationAdminRoles);

    const members = await this.prismaService.organizationMember.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      select: organizationMemberSelect,
    });

    return members.map((member) => this.toOrganizationMemberResponse(member));
  }

  async addOrganizationMember(
    currentUser: AuthenticatedUser,
    organizationId: string,
    addOrganizationMemberDto: AddOrganizationMemberDto,
  ): Promise<OrganizationMemberResponseDto> {
    await this.membershipsService.ensureOrganizationRole(currentUser.id, organizationId, organizationAdminRoles);

    const userProfile = await this.prismaService.userProfile.findFirst({
      where: {
        email: {
          equals: addOrganizationMemberDto.email,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
      },
    });

    if (!userProfile) {
      throw new NotFoundException('User profile not found for email');
    }

    const existingMember = await this.prismaService.organizationMember.findUnique({
      where: {
        organizationId_userProfileId: {
          organizationId,
          userProfileId: userProfile.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already an organization member');
    }

    try {
      return await this.prismaService.$transaction(async (transaction) => {
        const member = await transaction.organizationMember.create({
          data: {
            organizationId,
            userProfileId: userProfile.id,
            role: addOrganizationMemberDto.role,
          },
          select: organizationMemberSelect,
        });
        await this.createAuditLog(transaction, {
          userProfileId: currentUser.id,
          organizationId,
          action: 'organization.member_added',
          entityType: 'OrganizationMember',
          entityId: member.id,
          metadata: {
            addedUserProfileId: userProfile.id,
            role: member.role,
          },
        });

        return this.toOrganizationMemberResponse(member);
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('User is already an organization member');
      }

      throw error;
    }
  }

  async updateOrganizationMemberRole(
    currentUser: AuthenticatedUser,
    organizationId: string,
    memberId: string,
    updateOrganizationMemberRoleDto: UpdateOrganizationMemberRoleDto,
  ): Promise<OrganizationMemberResponseDto> {
    await this.membershipsService.ensureOrganizationRole(currentUser.id, organizationId, organizationAdminRoles);

    const existingMember = await this.prismaService.organizationMember.findFirst({
      where: {
        id: memberId,
        organizationId,
      },
      select: organizationMemberSelect,
    });

    if (!existingMember) {
      throw new NotFoundException('Organization member not found');
    }

    if (existingMember.role === updateOrganizationMemberRoleDto.role) {
      return this.toOrganizationMemberResponse(existingMember);
    }

    const updatedMember = await this.prismaService.$transaction(async (transaction) => {
      const member = await transaction.organizationMember.update({
        where: { id: memberId },
        data: { role: updateOrganizationMemberRoleDto.role },
        select: organizationMemberSelect,
      });
      await this.createAuditLog(transaction, {
        userProfileId: currentUser.id,
        organizationId,
        action: 'organization.member_role_updated',
        entityType: 'OrganizationMember',
        entityId: member.id,
        metadata: {
          previousRole: existingMember.role,
          newRole: member.role,
          targetUserProfileId: member.userProfile.id,
        },
      });

      return member;
    });

    return this.toOrganizationMemberResponse(updatedMember);
  }

  private async generateAvailableSlug(name: string): Promise<string> {
    const baseSlug = this.slugify(name);
    const matchingOrganizations = await this.prismaService.organization.findMany({
      where: {
        slug: {
          startsWith: baseSlug,
        },
      },
      select: {
        slug: true,
      },
    });
    const existingSlugs = new Set(matchingOrganizations.map((organization) => organization.slug));

    if (!existingSlugs.has(baseSlug)) {
      return baseSlug;
    }

    for (let suffix = 2; suffix <= 1000; suffix += 1) {
      const candidate = `${baseSlug}-${suffix}`;

      if (!existingSlugs.has(candidate)) {
        return candidate;
      }
    }

    throw new ConflictException('Organization slug could not be generated');
  }

  private slugify(name: string): string {
    const slug = name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');

    return slug || 'organization';
  }

  private async findOrganizationOrThrow(organizationId: string): Promise<OrganizationBaseRecord> {
    const organization = await this.prismaService.organization.findUnique({
      where: { id: organizationId },
      select: organizationBaseSelect,
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  private organizationWithCurrentUserRoleSelect(userProfileId: string): Prisma.OrganizationSelect {
    return {
      ...organizationBaseSelect,
      members: {
        where: {
          userProfileId,
        },
        select: {
          role: true,
        },
        take: 1,
      },
    };
  }

  private toOrganizationResponseFromMembership(organization: OrganizationWithRoleRecord): OrganizationResponseDto {
    const membership = organization.members[0];

    if (!membership) {
      throw new NotFoundException('Organization membership not found');
    }

    return this.toOrganizationResponse(organization, membership.role);
  }

  private toOrganizationResponse(
    organization: OrganizationBaseRecord,
    role: OrganizationRole,
  ): OrganizationResponseDto {
    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      plan: organization.plan,
      aiUsageLimit: organization.aiUsageLimit,
      aiUsageCount: organization.aiUsageCount,
      isActive: organization.isActive,
      role,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }

  private toOrganizationMemberResponse(member: OrganizationMemberRecord): OrganizationMemberResponseDto {
    return {
      id: member.id,
      role: member.role,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      userProfile: {
        id: member.userProfile.id,
        email: member.userProfile.email,
        fullName: member.userProfile.fullName,
      },
    };
  }

  private async createAuditLog(
    transaction: Prisma.TransactionClient,
    input: {
      userProfileId: string;
      organizationId: string;
      action: string;
      entityType: string;
      entityId: string;
      metadata: Prisma.InputJsonObject;
    },
  ): Promise<void> {
    await transaction.auditLog.create({
      data: input,
    });
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}

