import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { apiErrorInterceptor } from './core/interceptors/api-error.interceptor';
import { apiTimeoutInterceptor } from './core/interceptors/api-timeout.interceptor';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';
import { routes } from './app.routes';

function initializeAuthentication(authService: AuthService): () => Promise<void> {
  return () => authService.initialize();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptors([apiTimeoutInterceptor, authTokenInterceptor, apiErrorInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuthentication,
      deps: [AuthService],
      multi: true,
    },
  ],
};
