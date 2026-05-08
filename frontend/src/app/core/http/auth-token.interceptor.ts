import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const isApiRequest = request.url.startsWith(environment.apiBaseUrl);
  const apiRequest = isApiRequest
    ? request.clone({
        setHeaders: {
          'Cache-Control': 'no-store',
          Pragma: 'no-cache',
        },
      })
    : request;
  const shouldAttachToken = isApiRequest && authService.isAuthenticated();

  if (!shouldAttachToken) {
    return next(apiRequest);
  }

  return from(authService.getToken()).pipe(
    switchMap((token) => {
      const authenticatedRequest = token
        ? apiRequest.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`,
            },
          })
        : apiRequest;

      return next(authenticatedRequest);
    }),
  );
};
