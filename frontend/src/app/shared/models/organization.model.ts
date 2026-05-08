import { OrganizationRole } from './auth.model';

export type OrganizationPlan = 'DEMO' | 'FREE' | 'PRO';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: OrganizationPlan;
  aiUsageLimit: number;
  aiUsageCount: number;
  isActive: boolean;
  role: OrganizationRole;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationRequest {
  name: string;
}
