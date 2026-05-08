import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreatePublicIssueRequest,
  PublicIssueCreatedResponse,
} from '../../../shared/models/public-report.model';

@Injectable({ providedIn: 'root' })
export class PublicReportService {
  private readonly httpClient = inject(HttpClient);

  createIssue(organizationSlug: string, request: CreatePublicIssueRequest): Observable<PublicIssueCreatedResponse> {
    return this.httpClient.post<PublicIssueCreatedResponse>(
      `${environment.apiBaseUrl}/public-report/${organizationSlug}/issues`,
      request,
    );
  }
}
