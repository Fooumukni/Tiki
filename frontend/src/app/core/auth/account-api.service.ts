import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthenticatedUser } from '../../shared/models/auth.model';

@Injectable({ providedIn: 'root' })
export class AccountApiService {
  private readonly httpClient = inject(HttpClient);

  getCurrentUser(): Observable<AuthenticatedUser> {
    return this.httpClient.get<AuthenticatedUser>(`${environment.apiBaseUrl}/auth/me`);
  }
}
