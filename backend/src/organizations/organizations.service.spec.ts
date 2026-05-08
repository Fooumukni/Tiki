import { OrganizationPlan, OrganizationRole, Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { MembershipsService } from '../memberships/memberships.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from './organizations.service';

const now = new Date('2026-05-07T12:00:00.000Z');
const organizationId = '11111111-1111-4111-8111-111111111111';
const userProfileId = '22222222-2222-4222-8222-222222222222';

const currentUser: AuthenticatedUser = {
  id: userProfileId,
  keycloakUserId: 'keycloak-user-id',
  email: 'admin@example.com',
  fullName: 'Admin User',
  preferredUsername: 'admin',
  memberships: [],
};

function createOrganizationRecord(slug = 'acme-support') {
  return {
    id: organizationId,
    name: 'Acme Support',
    slug,
    plan: OrganizationPlan.DEMO,
    aiUsageLimit: 100,
    aiUsageCount: 0,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

function createUniqueConstraintError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

describe('OrganizationsService', () => {
  const transaction = {
    organization: {
      create: vi.fn(),
    },
    organizationMember: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };
  const prismaService = {
    $transaction: vi.fn(),
    organization: {
      findMany: vi.fn(),
    },
  };
  const membershipsService = {};
  let organizationsService: OrganizationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    prismaService.organization.findMany.mockResolvedValue([]);
    prismaService.$transaction.mockImplementation((input: unknown) => {
      if (typeof input === 'function') {
        return input(transaction);
      }

      return Promise.reject(new Error('Unsupported transaction input'));
    });
    transaction.organization.create.mockResolvedValue(createOrganizationRecord());
    transaction.organizationMember.create.mockResolvedValue({ role: OrganizationRole.ORG_ADMIN });
    transaction.auditLog.create.mockResolvedValue({});
    organizationsService = new OrganizationsService(
      prismaService as unknown as PrismaService,
      membershipsService as unknown as MembershipsService,
    );
  });

  it('creates an organization and returns the creator role', async () => {
    const organization = await organizationsService.createOrganization(currentUser, { name: 'Acme Support' });

    expect(organization.slug).toBe('acme-support');
    expect(organization.role).toBe(OrganizationRole.ORG_ADMIN);
    expect(transaction.organization.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          name: 'Acme Support',
          slug: 'acme-support',
        },
      }),
    );
  });

  it('creates the creator membership as ORG_ADMIN', async () => {
    await organizationsService.createOrganization(currentUser, { name: 'Acme Support' });

    expect(transaction.organizationMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          organizationId,
          userProfileId,
          role: OrganizationRole.ORG_ADMIN,
        },
      }),
    );
  });

  it('generates a unique slug with suffixes', async () => {
    prismaService.organization.findMany.mockResolvedValue([{ slug: 'acme-support' }]);
    transaction.organization.create.mockResolvedValue(createOrganizationRecord('acme-support-2'));

    const organization = await organizationsService.createOrganization(currentUser, { name: 'Acme Support' });

    expect(organization.slug).toBe('acme-support-2');
    expect(transaction.organization.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: 'acme-support-2' }),
      }),
    );
  });

  it('retries organization creation when a slug collision happens during write', async () => {
    transaction.organization.create
      .mockRejectedValueOnce(createUniqueConstraintError())
      .mockResolvedValueOnce(createOrganizationRecord('acme-support'));

    const organization = await organizationsService.createOrganization(currentUser, { name: 'Acme Support' });

    expect(organization.slug).toBe('acme-support');
    expect(transaction.organization.create).toHaveBeenCalledTimes(2);
  });
});
