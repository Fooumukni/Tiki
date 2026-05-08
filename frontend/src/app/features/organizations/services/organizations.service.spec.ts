import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OrganizationsService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('loads organizations from the organizations endpoint', () => {
    service.listOrganizations().subscribe((organizations) => {
      expect(organizations[0].slug).toBe('acme-support');
    });

    const request = httpTestingController.expectOne(`${environment.apiBaseUrl}/organizations`);

    expect(request.request.method).toBe('GET');
    request.flush([
      {
        id: 'organization-id',
        name: 'Acme Support',
        slug: 'acme-support',
        plan: 'DEMO',
        aiUsageLimit: 100,
        aiUsageCount: 0,
        isActive: true,
        role: 'ORG_ADMIN',
        createdAt: '2026-05-07T12:00:00.000Z',
        updatedAt: '2026-05-07T12:00:00.000Z',
      },
    ]);
  });

  it('creates an organization with a name payload', () => {
    service.createOrganization({ name: 'Acme Support' }).subscribe((organization) => {
      expect(organization.name).toBe('Acme Support');
    });

    const request = httpTestingController.expectOne(`${environment.apiBaseUrl}/organizations`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'Acme Support' });
    request.flush({
      id: 'organization-id',
      name: 'Acme Support',
      slug: 'acme-support',
      plan: 'DEMO',
      aiUsageLimit: 100,
      aiUsageCount: 0,
      isActive: true,
      role: 'ORG_ADMIN',
      createdAt: '2026-05-07T12:00:00.000Z',
      updatedAt: '2026-05-07T12:00:00.000Z',
    });
  });
});
