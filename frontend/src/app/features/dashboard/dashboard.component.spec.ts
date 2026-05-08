import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountService } from '../../core/auth/account.service';
import { Issue } from '../../shared/models/issue.model';
import { IssuesService } from '../issues/services/issues.service';
import { OrganizationContextService } from '../organizations/services/organization-context.service';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  const accountService = {
    getCurrentUser: vi.fn(),
  };
  const issuesService = {
    getIssueCount: vi.fn(),
    listIssues: vi.fn(),
  };
  const organizationContextService = {
    getSelectedOrganizationId: vi.fn(),
    setSelectedOrganizationId: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
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
    organizationContextService.getSelectedOrganizationId.mockReturnValue('organization-id');
    issuesService.getIssueCount.mockReturnValueOnce(of(10)).mockReturnValueOnce(of(4)).mockReturnValueOnce(of(2)).mockReturnValueOnce(of(3));
    issuesService.listIssues.mockReturnValue(
      of({
        items: [createIssue()],
        page: 1,
        limit: 5,
        total: 1,
        totalPages: 1,
      }),
    );
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: AccountService, useValue: accountService },
        { provide: IssuesService, useValue: issuesService },
        { provide: OrganizationContextService, useValue: organizationContextService },
      ],
    });
  });

  it('renders dashboard metrics and latest issues', () => {
    const fixture: ComponentFixture<DashboardComponent> = TestBed.createComponent(DashboardComponent);

    fixture.detectChanges();

    const pageText = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(pageText).toContain('Total issues');
    expect(pageText).toContain('10');
    expect(pageText).toContain('Critical issues');
    expect(pageText).toContain('Login error');
  });
});

function createIssue(): Issue {
  return {
    id: 'issue-id',
    organizationId: 'organization-id',
    requesterId: 'requester-id',
    code: 'ISSUE-00001',
    title: 'Login error',
    originalDescription: 'Login returns error 500.',
    generatedTitle: null,
    summary: null,
    category: null,
    priority: 'HIGH',
    sentiment: null,
    suggestedTeam: null,
    suggestedResponse: null,
    tags: [],
    sourceChannel: 'DASHBOARD',
    status: 'NEW',
    aiAnalysisStatus: 'PENDING',
    requester: {
      id: 'requester-id',
      name: 'Jane Customer',
      email: 'jane@example.com',
    },
    createdAt: '2026-05-07T12:00:00.000Z',
    updatedAt: '2026-05-07T12:00:00.000Z',
    resolvedAt: null,
  };
}
