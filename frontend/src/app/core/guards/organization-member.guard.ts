import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AccountService } from '../auth/account.service';
import { OrganizationContextService } from '../../features/organizations/services/organization-context.service';

export const organizationMemberGuard: CanActivateFn = (route) => {
  const accountService = inject(AccountService);
  const organizationContextService = inject(OrganizationContextService);
  const router = inject(Router);
  const organizationId = route.paramMap.get('organizationId');

  if (!organizationId) {
    return router.createUrlTree(['/dashboard']);
  }

  return accountService.getCurrentUser().pipe(
    map((currentUser) => {
      const isMember = currentUser.memberships.some((membership) => membership.organizationId === organizationId);

      if (!isMember) {
        return router.createUrlTree(['/organizations']);
      }

      organizationContextService.setSelectedOrganizationId(organizationId);
      return true;
    }),
    catchError(() => of(router.createUrlTree(['/dashboard']))),
  );
};
