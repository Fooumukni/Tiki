export type OrganizationRole = 'ORG_ADMIN' | 'AGENT' | 'VIEWER';

export interface MembershipSummary {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: OrganizationRole;
}

export interface AuthenticatedUser {
  id: string;
  keycloakUserId: string;
  email: string;
  fullName: string;
  memberships: MembershipSummary[];
}
