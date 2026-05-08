import { Injectable } from '@angular/core';
import Keycloak, { KeycloakProfile } from 'keycloak-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenRefreshTimeoutMs = 5000;
  private readonly keycloak = new Keycloak({
    url: environment.keycloak.url,
    realm: environment.keycloak.realm,
    clientId: environment.keycloak.clientId,
  });

  async initialize(): Promise<void> {
    try {
      await this.keycloak.init({
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: new URL('assets/silent-check-sso.html', document.baseURI).toString(),
        pkceMethod: 'S256',
        checkLoginIframe: false,
      });
    } catch {
      return;
    }
  }

  isAuthenticated(): boolean {
    return Boolean(this.keycloak.authenticated);
  }

  async login(returnPath = '/dashboard'): Promise<void> {
    await this.keycloak.login({
      redirectUri: this.getApplicationUrl(returnPath),
    });
  }

  async register(returnPath = '/dashboard'): Promise<void> {
    await this.keycloak.register({
      redirectUri: this.getApplicationUrl(returnPath),
    });
  }

  async logout(): Promise<void> {
    await this.keycloak.logout({
      redirectUri: this.getApplicationUrl(),
    });
  }

  async getToken(): Promise<string | null> {
    if (!this.keycloak.token) {
      return null;
    }

    try {
      await this.withTimeout(this.keycloak.updateToken(30), this.tokenRefreshTimeoutMs);
    } catch {
      return this.keycloak.token ?? null;
    }

    return this.keycloak.token ?? null;
  }

  async getProfile(): Promise<KeycloakProfile | null> {
    if (!this.isAuthenticated()) {
      return null;
    }

    return this.keycloak.loadUserProfile();
  }

  private async withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      operation,
      new Promise<T>((_resolve, reject) => {
        window.setTimeout(() => reject(new Error('Keycloak token refresh timed out')), timeoutMs);
      }),
    ]);
  }

  private getApplicationUrl(path = ''): string {
    return new URL(path.replace(/^\/+/, ''), document.baseURI).toString();
  }
}
