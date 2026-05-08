import { MembershipSummary } from '../memberships/membership-summary.interface';

export interface AuthenticatedUser {
  id: string;
  keycloakUserId: string;
  email: string;
  fullName: string;
  preferredUsername?: string;
  memberships: MembershipSummary[];
}
