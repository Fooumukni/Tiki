import { Injectable } from '@angular/core';
import { MembershipSummary } from '../../../shared/models/auth.model';

const selectedOrganizationStorageKey = 'ai_issue_intake_selected_organization_id';

@Injectable({ providedIn: 'root' })
export class OrganizationContextService {
  getSelectedOrganizationId(memberships: MembershipSummary[]): string | null {
    const storedOrganizationId = localStorage.getItem(selectedOrganizationStorageKey);

    if (storedOrganizationId && memberships.some((membership) => membership.organizationId === storedOrganizationId)) {
      return storedOrganizationId;
    }

    const firstMembership = memberships[0];

    if (!firstMembership) {
      localStorage.removeItem(selectedOrganizationStorageKey);
      return null;
    }

    this.setSelectedOrganizationId(firstMembership.organizationId);
    return firstMembership.organizationId;
  }

  setSelectedOrganizationId(organizationId: string): void {
    localStorage.setItem(selectedOrganizationStorageKey, organizationId);
  }
}
