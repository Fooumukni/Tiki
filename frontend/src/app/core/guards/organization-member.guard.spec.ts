import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, convertToParamMap, Router } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountService } from '../auth/account.service';
import { OrganizationContextService } from '../../features/organizations/services/organization-context.service';
import { organizationMemberGuard } from './organization-member.guard';

describe('organizationMemberGuard', () => {
  const accountService = {
    getCurrentUser: vi.fn(),
  };
  const organizationContextService = {
    setSelectedOrganizationId: vi.fn(),
  };
  const router = {
    createUrlTree: vi.fn((commands: string[]) => commands),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: AccountService, useValue: accountService },
        { provide: OrganizationContextService, useValue: organizationContextService },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('allows members and stores selected organization context', async () => {
    accountService.getCurrentUser.mockReturnValue(
      of({
        memberships: [
          {
            id: 'membership-id',
            organizationId: 'organization-id',
            organizationName: 'Acme Support',
            organizationSlug: 'acme-support',
            role: 'ORG_ADMIN',
          },
        ],
      }),
    );

    const result = await TestBed.runInInjectionContext(() =>
      firstValueFrom(organizationMemberGuard(createRoute('organization-id'), {} as never) as ReturnType<typeof of>),
    );

    expect(result).toBe(true);
    expect(organizationContextService.setSelectedOrganizationId).toHaveBeenCalledWith('organization-id');
  });

  it('redirects non-members to organizations', async () => {
    accountService.getCurrentUser.mockReturnValue(of({ memberships: [] }));

    const result = await TestBed.runInInjectionContext(() =>
      firstValueFrom(organizationMemberGuard(createRoute('organization-id'), {} as never) as ReturnType<typeof of>),
    );

    expect(result).toEqual(['/organizations']);
  });
});

function createRoute(organizationId: string): ActivatedRouteSnapshot {
  return {
    paramMap: convertToParamMap({ organizationId }),
  } as ActivatedRouteSnapshot;
}
