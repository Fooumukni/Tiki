import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { PaginatedIssues } from '../../../shared/models/issue.model';
import { IssuesService } from './issues.service';

describe('IssuesService', () => {
  let service: IssuesService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(IssuesService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('lists issues with filters and pagination', () => {
    service
      .listIssues('organization-id', {
        status: 'NEW',
        priority: 'CRITICAL',
        sourceChannel: 'TELEGRAM',
        search: 'login',
        page: 2,
        limit: 10,
      })
      .subscribe((response) => {
        expect(response.total).toBe(1);
      });

    const request = httpTestingController.expectOne((httpRequest) => {
      return httpRequest.url === `${environment.apiBaseUrl}/organizations/organization-id/issues`;
    });

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('status')).toBe('NEW');
    expect(request.request.params.get('priority')).toBe('CRITICAL');
    expect(request.request.params.get('sourceChannel')).toBe('TELEGRAM');
    expect(request.request.params.get('search')).toBe('login');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('limit')).toBe('10');
    request.flush(createPaginatedIssuesResponse());
  });

  it('posts retry AI analysis to the issue retry endpoint', () => {
    service.retryAiAnalysis('organization-id', 'issue-id').subscribe((issue) => {
      expect(issue.id).toBe('issue-id');
    });

    const request = httpTestingController.expectOne(
      `${environment.apiBaseUrl}/organizations/organization-id/issues/issue-id/retry-ai-analysis`,
    );

    expect(request.request.method).toBe('POST');
    request.flush(createPaginatedIssuesResponse().items[0]);
  });
});

function createPaginatedIssuesResponse(): PaginatedIssues {
  return {
    items: [
      {
        id: 'issue-id',
        organizationId: 'organization-id',
        requesterId: 'requester-id',
        code: 'ISSUE-00001',
        title: 'Login error',
        originalDescription: 'Login returns error 500.',
        generatedTitle: null,
        summary: null,
        category: null,
        priority: 'CRITICAL',
        sentiment: null,
        suggestedTeam: null,
        suggestedResponse: null,
        tags: [],
        sourceChannel: 'TELEGRAM',
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
      },
    ],
    page: 1,
    limit: 1,
    total: 1,
    totalPages: 1,
  };
}
