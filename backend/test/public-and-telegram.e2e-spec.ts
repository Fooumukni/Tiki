import 'reflect-metadata';
import { HttpStatus, INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TelegramWebhookController } from '../src/integrations/telegram/telegram-webhook.controller';
import { TelegramService } from '../src/integrations/telegram/telegram.service';
import { CreatePublicIssueDto } from '../src/public-report/dto/create-public-issue.dto';
import { PublicReportController } from '../src/public-report/public-report.controller';
import { PublicReportService } from '../src/public-report/public-report.service';

Reflect.defineMetadata('design:paramtypes', [PublicReportService], PublicReportController);
Reflect.defineMetadata('design:paramtypes', [TelegramService], TelegramWebhookController);
Reflect.defineMetadata('design:paramtypes', [String, CreatePublicIssueDto], PublicReportController.prototype, 'createIssue');

describe('public endpoints', () => {
  let app: INestApplication;
  const publicReportService = {
    createIssue: vi.fn(),
  };
  const telegramService = {
    handleWebhook: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    publicReportService.createIssue.mockResolvedValue({
      code: 'ISSUE-00003',
      message: 'Your issue was created successfully',
    });
    telegramService.handleWebhook.mockImplementation((secret: string | undefined) => {
      if (secret !== 'webhook-secret') {
        throw new UnauthorizedException('Invalid Telegram webhook secret');
      }

      return Promise.resolve({ ok: true });
    });

    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 100,
          },
        ]),
      ],
      controllers: [PublicReportController, TelegramWebhookController],
      providers: [
        { provide: PublicReportService, useValue: publicReportService },
        { provide: TelegramService, useValue: telegramService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('accepts a valid public report payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/public-report/acme-support/issues')
      .send({
        requesterName: 'Jane Customer',
        requesterEmail: 'jane@example.com',
        title: 'Cannot access billing settings',
        originalDescription: 'The billing page returns a server error.',
      })
      .expect(HttpStatus.CREATED);

    expect(response.body).toEqual({
      code: 'ISSUE-00003',
      message: 'Your issue was created successfully',
    });
  });

  it('rejects extra public report fields', async () => {
    await request(app.getHttpServer())
      .post('/public-report/acme-support/issues')
      .send({
        requesterName: 'Jane Customer',
        requesterEmail: 'jane@example.com',
        title: 'Cannot access billing settings',
        originalDescription: 'The billing page returns a server error.',
        unexpectedField: true,
      })
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('rejects Telegram webhooks with a missing secret', async () => {
    await request(app.getHttpServer())
      .post('/integrations/telegram/webhook')
      .send({})
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('accepts Telegram webhooks with a valid secret', async () => {
    const response = await request(app.getHttpServer())
      .post('/integrations/telegram/webhook')
      .set('X-Telegram-Bot-Api-Secret-Token', 'webhook-secret')
      .send({})
      .expect(HttpStatus.OK);

    expect(response.body).toEqual({ ok: true });
  });
});
