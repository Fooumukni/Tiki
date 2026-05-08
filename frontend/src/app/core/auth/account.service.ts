import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthenticatedUser } from '../../shared/models/auth.model';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly httpClient = inject(HttpClient);
  private readonly currentUserSubject = new BehaviorSubject<AuthenticatedUser | null>(null);
  private currentUserRequest$?: Observable<AuthenticatedUser>;

  readonly currentUser$ = this.currentUserSubject.asObservable();

  getCurrentUser(refresh = false): Observable<AuthenticatedUser> {
    if (!this.currentUserRequest$ || refresh) {
      this.currentUserRequest$ = this.httpClient
        .get<AuthenticatedUser>(`${environment.apiBaseUrl}/auth/me`)
        .pipe(
          tap((currentUser) => {
            this.currentUserSubject.next(currentUser);
          }),
          catchError((error: unknown) => {
            this.currentUserRequest$ = undefined;
            return throwError(() => error);
          }),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }

    return this.currentUserRequest$;
  }

  clearCache(): void {
    this.currentUserRequest$ = undefined;
  }
}
