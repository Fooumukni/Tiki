import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  CreateIssueRequest,
  Issue,
  ListIssuesQuery,
  PaginatedIssues,
  UpdateIssueStatusRequest,
} from '../../../shared/models/issue.model';

@Injectable({ providedIn: 'root' })
export class IssuesService {
  private readonly httpClient = inject(HttpClient);

  listIssues(organizationId: string, query: ListIssuesQuery = {}): Observable<PaginatedIssues> {
    return this.httpClient.get<PaginatedIssues>(this.issuesUrl(organizationId), {
      params: this.buildQueryParams(query),
    });
  }

  getIssueCount(organizationId: string, query: ListIssuesQuery = {}): Observable<number> {
    return this.listIssues(organizationId, {
      ...query,
      page: 1,
      limit: 1,
    }).pipe(map((response) => response.total));
  }

  getIssue(organizationId: string, issueId: string): Observable<Issue> {
    return this.httpClient.get<Issue>(`${this.issuesUrl(organizationId)}/${issueId}`);
  }

  createIssue(organizationId: string, request: CreateIssueRequest): Observable<Issue> {
    return this.httpClient.post<Issue>(this.issuesUrl(organizationId), request);
  }

  updateIssueStatus(organizationId: string, issueId: string, request: UpdateIssueStatusRequest): Observable<Issue> {
    return this.httpClient.patch<Issue>(`${this.issuesUrl(organizationId)}/${issueId}/status`, request);
  }

  retryAiAnalysis(organizationId: string, issueId: string): Observable<Issue> {
    return this.httpClient.post<Issue>(`${this.issuesUrl(organizationId)}/${issueId}/retry-ai-analysis`, {});
  }

  private issuesUrl(organizationId: string): string {
    return `${environment.apiBaseUrl}/organizations/${organizationId}/issues`;
  }

  private buildQueryParams(query: ListIssuesQuery): HttpParams {
    let params = new HttpParams();

    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return params;
  }
}
