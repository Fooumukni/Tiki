import { OrganizationRole } from '@prisma/client';

export interface MembershipSummary {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: OrganizationRole;
}
