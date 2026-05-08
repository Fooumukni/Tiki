import { ChannelType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IssuesService } from '../../issues/issues.service';
import { MembershipsService } from '../../memberships/memberships.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TelegramClientService } from './telegram-client.service';
import { TelegramService } from './telegram.service';

const organizationId = '11111111-1111-4111-8111-111111111111';

function createTelegramPayload(text: string) {
  return {
    message: {
      message_id: 100,
      chat: {
        id: 987654321,
        type: 'private',
      },
      from: {
        id: 123456789,
        first_name: 'Jane',
        last_name: 'Customer',
        username: 'jane_customer',
      },
      text,
    },
  };
}

describe('TelegramService', () => {
  const transaction = {
    channelConnection: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };
  const prismaService = {
    $transaction: vi.fn(),
    channelConnection: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    conversationSession: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
  const membershipsService = {};
  const issuesService = {
    createIssueFromChannel: vi.fn(),
  };
  const telegramClientService = {
    sendMessage: vi.fn(),
  };
  const configService = {
    get: vi.fn(),
  };
  const aiProvider = {
    name: 'mock',
    analyzeIssue: vi.fn(),
    evaluateIntakeConversation: vi.fn(),
  };
  const logger = {
    error: vi.fn(),
    warn: vi.fn(),
  };
  let telegramService: TelegramService;

  beforeEach(() => {
    vi.clearAllMocks();
    prismaService.$transaction.mockImplementation((input: unknown) => {
      if (typeof input === 'function') {
        return input(transaction);
      }

      return Promise.reject(new Error('Unsupported transaction input'));
    });
    transaction.channelConnection.findFirst.mockReset();
    transaction.channelConnection.update.mockResolvedValue({ id: 'connection-id' });
    transaction.auditLog.create.mockResolvedValue({});
    prismaService.channelConnection.findFirst.mockResolvedValue({
      id: 'connection-id',
      organizationId,
    });
    prismaService.conversationSession.findFirst.mockResolvedValue(null);
    prismaService.conversationSession.create.mockResolvedValue({
      id: 'session-id',
      organizationId,
      telegramChatId: '987654321',
      telegramUserId: '123456789',
      requesterName: 'Jane Customer',
      status: 'GATHERING',
      messages: [],
      questionCount: 0,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });
    prismaService.conversationSession.update.mockResolvedValue({});
    issuesService.createIssueFromChannel.mockResolvedValue({ code: 'ISSUE-00005' });
    telegramClientService.sendMessage.mockResolvedValue(undefined);
    aiProvider.evaluateIntakeConversation.mockResolvedValue({
      needsMoreInfo: true,
      followUpQuestion: 'Could you provide more details?',
    });
    configService.get.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        TELEGRAM_WEBHOOK_SECRET: 'webhook-secret',
        TELEGRAM_BOT_USERNAME: 'support_bot',
      };

      return values[key];
    });
    telegramService = new TelegramService(
      prismaService as unknown as PrismaService,
      membershipsService as unknown as MembershipsService,
      issuesService as unknown as IssuesService,
      telegramClientService as unknown as TelegramClientService,
      configService as never,
      aiProvider as never,
      logger as never,
    );
  });

  it('links a chat when /start contains a valid secret code', async () => {
    transaction.channelConnection.findFirst
      .mockResolvedValueOnce({
        id: 'connection-id',
        organizationId,
        channel: ChannelType.TELEGRAM,
        identifier: 'pending:SECRET_CODE',
        secretCode: 'SECRET_CODE',
        isActive: true,
        metadata: { botUsername: 'support_bot' },
        createdAt: new Date('2026-05-07T12:00:00.000Z'),
        updatedAt: new Date('2026-05-07T12:00:00.000Z'),
      })
      .mockResolvedValueOnce(null);

    await telegramService.handleWebhook('webhook-secret', createTelegramPayload('/start SECRET_CODE'));

    expect(transaction.channelConnection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          identifier: 'chat:987654321',
        }),
      }),
    );
    expect(telegramClientService.sendMessage).toHaveBeenCalledWith(
      '987654321',
      'This Telegram chat is now linked to your organization.',
    );
  });

  it('asks follow-up question when AI needs more info', async () => {
    aiProvider.evaluateIntakeConversation.mockResolvedValue({
      needsMoreInfo: true,
      followUpQuestion: '¿Qué aplicación estabas usando?',
    });

    await telegramService.handleWebhook('webhook-secret', createTelegramPayload('Mi app se cayó'));

    expect(telegramClientService.sendMessage).toHaveBeenCalledWith(
      '987654321',
      '¿Qué aplicación estabas usando?',
    );
    expect(issuesService.createIssueFromChannel).not.toHaveBeenCalled();
  });

  it('creates an issue when AI determines enough info', async () => {
    aiProvider.evaluateIntakeConversation.mockResolvedValue({
      needsMoreInfo: false,
      issueDescription: 'The mobile app crashes when opening the settings page.',
    });

    await telegramService.handleWebhook('webhook-secret', createTelegramPayload('Login returns error 500.'));

    expect(issuesService.createIssueFromChannel).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId,
        requesterName: 'Jane Customer',
        originalDescription: 'The mobile app crashes when opening the settings page.',
      }),
    );
    expect(telegramClientService.sendMessage).toHaveBeenCalledWith(
      '987654321',
      expect.stringContaining('ISSUE-00005'),
    );
  });

  it('sends setup instructions when the chat is not linked', async () => {
    prismaService.channelConnection.findFirst.mockResolvedValue(null);

    await telegramService.handleWebhook('webhook-secret', createTelegramPayload('Login returns error 500.'));

    expect(issuesService.createIssueFromChannel).not.toHaveBeenCalled();
    expect(telegramClientService.sendMessage).toHaveBeenCalledWith(
      '987654321',
      'This chat is not linked yet. Please open the Telegram link from your organization workspace to connect it.',
    );
  });
});
