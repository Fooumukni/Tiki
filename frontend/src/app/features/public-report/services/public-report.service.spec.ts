import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { PublicReportService } from './public-report.service';

describe('PublicReportService', () => {
  let service: PublicReportService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PublicReportService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('posts public issue reports by organization slug', () => {
    const payload = {
      requesterName: 'Jane Customer',
      requesterEmail: 'jane@example.com',
      title: 'Login error',
      originalDescription: 'Login returns error 500.',
    };

    service.createIssue('acme-support', payload).subscribe((response) => {
      expect(response.code).toBe('ISSUE-00003');
    });

    const request = httpTestingController.expectOne(`${environment.apiBaseUrl}/public-report/acme-support/issues`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({
      code: 'ISSUE-00003',
      message: 'Your issue was created successfully',
    });
  });
});
