import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CreateOrganizationRequest, Organization } from '../../../shared/models/organization.model';

@Injectable({ providedIn: 'root' })
export class OrganizationsService {
  private readonly httpClient = inject(HttpClient);

  listOrganizations(): Observable<Organization[]> {
    return this.httpClient.get<Organization[]>(`${environment.apiBaseUrl}/organizations`);
  }

  createOrganization(request: CreateOrganizationRequest): Observable<Organization> {
    return this.httpClient.post<Organization>(`${environment.apiBaseUrl}/organizations`, request);
  }

  getOrganization(organizationId: string): Observable<Organization> {
    return this.httpClient.get<Organization>(`${environment.apiBaseUrl}/organizations/${organizationId}`);
  }
}
