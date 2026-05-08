import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { organizationMemberGuard } from './core/guards/organization-member.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing-page.component').then((module) => module.LandingPageComponent),
  },
  {
    path: 'report/:organizationSlug',
    loadComponent: () =>
      import('./features/public-report/pages/public-report-page/public-report-page.component').then(
        (module) => module.PublicReportPageComponent,
      ),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then((module) => module.DashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'organizations',
    loadComponent: () =>
      import('./features/organizations/pages/organizations-page/organizations-page.component').then(
        (module) => module.OrganizationsPageComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'organizations/new',
    loadComponent: () =>
      import('./features/organizations/pages/create-organization-page/create-organization-page.component').then(
        (module) => module.CreateOrganizationPageComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'organizations/:organizationId/issues',
    loadComponent: () =>
      import('./features/issues/pages/issues-page/issues-page.component').then((module) => module.IssuesPageComponent),
    canActivate: [authGuard, organizationMemberGuard],
  },
  {
    path: 'organizations/:organizationId/issues/new',
    loadComponent: () =>
      import('./features/issues/pages/create-issue-page/create-issue-page.component').then(
        (module) => module.CreateIssuePageComponent,
      ),
    canActivate: [authGuard, organizationMemberGuard],
  },
  {
    path: 'organizations/:organizationId/issues/:issueId',
    loadComponent: () =>
      import('./features/issues/pages/issue-detail-page/issue-detail-page.component').then(
        (module) => module.IssueDetailPageComponent,
      ),
    canActivate: [authGuard, organizationMemberGuard],
  },
  {
    path: 'organizations/:organizationId/telegram',
    loadComponent: () =>
      import('./features/telegram-settings/pages/telegram-settings-page/telegram-settings-page.component').then(
        (module) => module.TelegramSettingsPageComponent,
      ),
    canActivate: [authGuard, organizationMemberGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
