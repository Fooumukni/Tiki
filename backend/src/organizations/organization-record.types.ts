import { Prisma } from '@prisma/client';

export const organizationBaseSelect = {
  id: true,
  name: true,
  slug: true,
  plan: true,
  aiUsageLimit: true,
  aiUsageCount: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.OrganizationSelect;

export type OrganizationBaseRecord = Prisma.OrganizationGetPayload<{
  select: typeof organizationBaseSelect;
}>;

export const organizationWithRoleSelect = {
  id: true,
  name: true,
  slug: true,
  plan: true,
  aiUsageLimit: true,
  aiUsageCount: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  members: {
    select: {
      role: true,
    },
    take: 1,
  },
} satisfies Prisma.OrganizationSelect;

export type OrganizationWithRoleRecord = Prisma.OrganizationGetPayload<{
  select: typeof organizationWithRoleSelect;
}>;

export const organizationMemberSelect = {
  id: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  userProfile: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
} satisfies Prisma.OrganizationMemberSelect;

export type OrganizationMemberRecord = Prisma.OrganizationMemberGetPayload<{
  select: typeof organizationMemberSelect;
}>;
