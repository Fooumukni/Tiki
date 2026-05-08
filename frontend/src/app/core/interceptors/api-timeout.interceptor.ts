import { HttpInterceptorFn } from '@angular/common/http';
import { timeout } from 'rxjs';
import { environment } from '../../../environments/environment';

const apiRequestTimeoutMs = 15000;

export const apiTimeoutInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(environment.apiBaseUrl)) {
    return next(request);
  }

  return next(request).pipe(timeout({ each: apiRequestTimeoutMs }));
};
