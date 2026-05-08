import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TelegramConnection } from '../../../shared/models/telegram.model';

@Injectable({ providedIn: 'root' })
export class TelegramSettingsService {
  private readonly httpClient = inject(HttpClient);

  listConnections(organizationId: string): Observable<TelegramConnection[]> {
    return this.httpClient.get<TelegramConnection[]>(this.connectionsUrl(organizationId));
  }

  createConnection(organizationId: string): Observable<TelegramConnection> {
    return this.httpClient.post<TelegramConnection>(this.connectionsUrl(organizationId), {});
  }

  private connectionsUrl(organizationId: string): string {
    return `${environment.apiBaseUrl}/organizations/${organizationId}/integrations/telegram/connections`;
  }
}
