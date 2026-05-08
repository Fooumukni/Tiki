import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { TelegramSettingsService } from './telegram-settings.service';

describe('TelegramSettingsService', () => {
  let service: TelegramSettingsService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TelegramSettingsService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('lists Telegram connections for an organization', () => {
    service.listConnections('organization-id').subscribe((connections) => {
      expect(connections[0].botUsername).toBe('support_bot');
    });

    const request = httpTestingController.expectOne(
      `${environment.apiBaseUrl}/organizations/organization-id/integrations/telegram/connections`,
    );

    expect(request.request.method).toBe('GET');
    request.flush([createTelegramConnection()]);
  });

  it('creates a Telegram connection for an organization', () => {
    service.createConnection('organization-id').subscribe((connection) => {
      expect(connection.link).toContain('https://t.me/support_bot');
    });

    const request = httpTestingController.expectOne(
      `${environment.apiBaseUrl}/organizations/organization-id/integrations/telegram/connections`,
    );

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush(createTelegramConnection());
  });
});

function createTelegramConnection() {
  return {
    id: 'connection-id',
    channel: 'TELEGRAM',
    isActive: true,
    isLinked: false,
    botUsername: 'support_bot',
    link: 'https://t.me/support_bot?start=secret',
    linkedChatId: null,
    linkedAt: null,
    createdAt: '2026-05-07T12:00:00.000Z',
    updatedAt: '2026-05-07T12:00:00.000Z',
  };
}
