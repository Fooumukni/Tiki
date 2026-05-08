import {
  ConflictException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChannelType, ConversationSessionStatus, OrganizationRole, Prisma, SourceChannel } from '@prisma/client';
import { randomBytes } from 'crypto';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AIProvider, aiProviderToken } from '../../ai/types/ai-provider.interface';
import { IntakeConversationMessage } from '../../ai/types/intake-evaluation.interface';
import { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { sanitizeTextValue, truncateSanitizedText } from '../../common/utils/string-sanitizer';
import { EnvironmentVariables } from '../../config/environment.validation';
import { IssuesService } from '../../issues/issues.service';
import { MembershipsService } from '../../memberships/memberships.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TelegramConnectionResponseDto } from './dto/telegram-connection-response.dto';
import { TelegramWebhookResponseDto } from './dto/telegram-webhook-response.dto';
import { TelegramClientService } from './telegram-client.service';
import { parseTelegramMessage } from './telegram-payload.parser';
import { TelegramMessage, TelegramUser } from './types/telegram-message.interface';

const telegramAdminRoles = [OrganizationRole.ORG_ADMIN];
const telegramChannel = ChannelType.TELEGRAM;
const pendingIdentifierPrefix = 'pending:';
const chatIdentifierPrefix = 'chat:';
const inactiveIdentifierPrefix = 'inactive:';
const maxSecretCreationAttempts = 5;
const maxTelegramIssueDescriptionLength = 10000;
const maxRequesterNameLength = 120;
const sessionExpirationMinutes = 15;
const maxFollowUpQuestions = 3;

const telegramConnectionSelect = {
  id: true,
  organizationId: true,
  channel: true,
  identifier: true,
  secretCode: true,
  isActive: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ChannelConnectionSelect;

type TelegramConnectionRecord = Prisma.ChannelConnectionGetPayload<{
  select: typeof telegramConnectionSelect;
}>;

@Injectable()
export class TelegramService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly membershipsService: MembershipsService,
    private readonly issuesService: IssuesService,
    private readonly telegramClientService: TelegramClientService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
    @Inject(aiProviderToken)
    private readonly aiProvider: AIProvider,
    @InjectPinoLogger(TelegramService.name)
    private readonly logger: PinoLogger,
  ) {}

  async listConnections(
    currentUser: AuthenticatedUser,
    organizationId: string,
  ): Promise<TelegramConnectionResponseDto[]> {
    await this.membershipsService.ensureOrganizationRole(currentUser.id, organizationId, telegramAdminRoles);

    const connections = await this.prismaService.channelConnection.findMany({
      where: {
        organizationId,
        channel: telegramChannel,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: telegramConnectionSelect,
    });

    return connections.map((connection) => this.toTelegramConnectionResponse(connection));
  }

  async createConnection(
    currentUser: AuthenticatedUser,
    organizationId: string,
  ): Promise<TelegramConnectionResponseDto> {
    await this.membershipsService.ensureOrganizationRole(currentUser.id, organizationId, telegramAdminRoles);
    const botUsername = this.getBotUsernameOrThrow();

    for (let attempt = 0; attempt < maxSecretCreationAttempts; attempt += 1) {
      const secretCode = this.generateSecretCode();

      try {
        const connection = await this.prismaService.$transaction(async (transaction) => {
          await this.deactivateActiveTelegramConnections(transaction, organizationId);
          const createdConnection = await transaction.channelConnection.create({
            data: {
              organizationId,
              channel: telegramChannel,
              identifier: this.buildPendingIdentifier(secretCode),
              secretCode,
              isActive: true,
              metadata: {
                botUsername,
              },
            },
            select: telegramConnectionSelect,
          });

          await this.createAuditLog(transaction, {
            userProfileId: currentUser.id,
            organizationId,
            action: 'telegram.connection_created',
            entityType: 'ChannelConnection',
            entityId: createdConnection.id,
            metadata: {
              channel: telegramChannel,
              botUsername,
            },
          });

          return createdConnection;
        });

        return this.toTelegramConnectionResponse(connection);
      } catch (error) {
        if (this.isUniqueConstraintError(error)) {
          continue;
        }

        throw error;
      }
    }

    throw new ConflictException('Telegram connection secret could not be generated');
  }

  async handleWebhook(webhookSecret: string | undefined, payload: unknown): Promise<TelegramWebhookResponseDto> {
    this.ensureValidWebhookSecret(webhookSecret);
    const message = parseTelegramMessage(payload);

    if (!message) {
      return { ok: true };
    }

    const chatId = this.getChatId(message);

    try {
      await this.handleMessage(message);
    } catch (error) {
      this.logger.error(
        {
          err: error,
          chatId,
          messageId: message.messageId,
        },
        'Telegram webhook processing failed',
      );
      await this.sendMessageSafely(chatId, 'We could not process your Telegram message right now. Please try again later.');
    }

    return { ok: true };
  }

  private async handleMessage(message: TelegramMessage): Promise<void> {
    const text = message.text ? sanitizeTextValue(message.text) : '';

    if (!text) {
      return;
    }

    if (text.length > maxTelegramIssueDescriptionLength) {
      await this.telegramClientService.sendMessage(
        this.getChatId(message),
        'Telegram messages must be 10000 characters or fewer.',
      );
      return;
    }

    const startSecretCode = this.parseStartSecretCode(text);
    if (startSecretCode !== null) {
      await this.handleStartCommand(message, startSecretCode);
      return;
    }

    if (this.isCancelCommand(text)) {
      await this.handleCancelCommand(message);
      return;
    }

    await this.handleConversationalIntake(message, text);
  }

  private async handleStartCommand(message: TelegramMessage, secretCode: string): Promise<void> {
    const chatId = this.getChatId(message);

    if (secretCode.length === 0) {
      await this.telegramClientService.sendMessage(chatId, 'Please open the Telegram link from your organization workspace to connect this chat.');
      return;
    }

    const responseText = await this.linkTelegramChat(message, secretCode);
    await this.telegramClientService.sendMessage(chatId, responseText);
  }

  private isCancelCommand(text: string): boolean {
    return /^\/cancel(?:@\w+)?$/i.test(text);
  }

  private async handleCancelCommand(message: TelegramMessage): Promise<void> {
    const chatId = this.getChatId(message);

    if (!message.from) {
      return;
    }

    const telegramUserId = this.getTelegramUserId(message.from);
    const activeSession = await this.prismaService.conversationSession.findFirst({
      where: {
        telegramChatId: chatId,
        telegramUserId,
        status: ConversationSessionStatus.GATHERING,
        expiresAt: { gt: new Date() },
      },
    });

    if (activeSession) {
      await this.prismaService.conversationSession.update({
        where: { id: activeSession.id },
        data: { status: ConversationSessionStatus.EXPIRED },
      });
      await this.telegramClientService.sendMessage(chatId, '❌ Conversation cancelled. You can start a new report anytime by sending a message.');
    } else {
      await this.telegramClientService.sendMessage(chatId, 'No active conversation to cancel.');
    }
  }

  private async handleConversationalIntake(message: TelegramMessage, text: string): Promise<void> {
    const chatId = this.getChatId(message);
    const connection = await this.prismaService.channelConnection.findFirst({
      where: {
        channel: telegramChannel,
        identifier: this.buildChatIdentifier(chatId),
        isActive: true,
      },
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (!connection) {
      await this.telegramClientService.sendMessage(
        chatId,
        'This chat is not linked yet. Please open the Telegram link from your organization workspace to connect it.',
      );
      return;
    }

    if (!message.from) {
      await this.telegramClientService.sendMessage(
        chatId,
        'We could not identify your Telegram user. Please send the message from a Telegram user account.',
      );
      return;
    }

    const telegramUserId = this.getTelegramUserId(message.from);
    const requesterName = this.resolveTelegramUserName(message.from);

    // Find or create a conversation session
    let session = await this.findActiveSession(chatId, telegramUserId);

    if (!session) {
      session = await this.createSession(connection.organizationId, chatId, telegramUserId, requesterName);
    }

    const messages = this.parseSessionMessages(session.messages);
    messages.push({
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    });

    if (session.questionCount >= maxFollowUpQuestions) {
      await this.finalizeSession(session.id, messages, connection.organizationId, requesterName, telegramUserId, chatId);
      return;
    }

    try {
      const evaluation = await this.aiProvider.evaluateIntakeConversation({
        conversationHistory: messages,
      });

      if (evaluation.needsMoreInfo && evaluation.followUpQuestion) {
        messages.push({
          role: 'assistant',
          content: evaluation.followUpQuestion,
          timestamp: new Date().toISOString(),
        });

        await this.prismaService.conversationSession.update({
          where: { id: session.id },
          data: {
            messages: this.toConversationMessagesJson(messages),
            questionCount: session.questionCount + 1,
            expiresAt: this.buildExpirationDate(),
          },
        });

        await this.telegramClientService.sendMessage(chatId, evaluation.followUpQuestion);
      } else {
        const issueDescription = evaluation.issueDescription ?? messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n\n');
        await this.createIssueFromSession(session.id, messages, connection.organizationId, requesterName, telegramUserId, chatId, issueDescription);
      }
    } catch (error) {
      this.logger.warn(
        {
          err: error,
          chatId,
          sessionId: session.id,
        },
        'AI intake evaluation failed, creating issue with collected messages',
      );

      await this.finalizeSession(session.id, messages, connection.organizationId, requesterName, telegramUserId, chatId);
    }
  }

  private async findActiveSession(chatId: string, telegramUserId: string) {
    return this.prismaService.conversationSession.findFirst({
      where: {
        telegramChatId: chatId,
        telegramUserId,
        status: ConversationSessionStatus.GATHERING,
        expiresAt: { gt: new Date() },
      },
    });
  }

  private async createSession(organizationId: string, chatId: string, telegramUserId: string, requesterName: string) {
    return this.prismaService.conversationSession.create({
      data: {
        organizationId,
        telegramChatId: chatId,
        telegramUserId,
        requesterName,
        status: ConversationSessionStatus.GATHERING,
        messages: [],
        questionCount: 0,
        expiresAt: this.buildExpirationDate(),
      },
    });
  }

  private async finalizeSession(
    sessionId: string,
    messages: IntakeConversationMessage[],
    organizationId: string,
    requesterName: string,
    telegramUserId: string,
    chatId: string,
  ): Promise<void> {
    const issueDescription = messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n\n');
    await this.createIssueFromSession(sessionId, messages, organizationId, requesterName, telegramUserId, chatId, issueDescription);
  }

  private async createIssueFromSession(
    sessionId: string,
    messages: IntakeConversationMessage[],
    organizationId: string,
    requesterName: string,
    telegramUserId: string,
    chatId: string,
    issueDescription: string,
  ): Promise<void> {
    await this.prismaService.conversationSession.update({
      where: { id: sessionId },
      data: {
        status: ConversationSessionStatus.COMPLETED,
        messages: this.toConversationMessagesJson(messages),
      },
    });

    const issue = await this.issuesService.createIssueFromChannel({
      organizationId,
      requesterName,
      requesterTelegramUserId: telegramUserId,
      requesterTelegramChatId: chatId,
      originalDescription: issueDescription,
      sourceChannel: SourceChannel.TELEGRAM,
      auditAction: 'issue.telegram_created',
      auditUserProfileId: null,
    });

    await this.telegramClientService.sendMessage(chatId, `Your request was registered as ${issue.code}. Our team will review it shortly.`);
  }

  private toConversationMessagesJson(messages: IntakeConversationMessage[]): Prisma.InputJsonValue {
    return messages.map((message) => ({
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
    }));
  }

  private parseSessionMessages(messages: Prisma.JsonValue): IntakeConversationMessage[] {
    if (!Array.isArray(messages)) {
      return [];
    }

    const result: IntakeConversationMessage[] = [];

    for (const m of messages) {
      if (
        typeof m === 'object' &&
        m !== null &&
        'role' in m &&
        'content' in m &&
        typeof (m as Record<string, unknown>).role === 'string' &&
        typeof (m as Record<string, unknown>).content === 'string'
      ) {
        result.push({
          role: (m as Record<string, unknown>).role as 'user' | 'assistant',
          content: (m as Record<string, unknown>).content as string,
          timestamp: typeof (m as Record<string, unknown>).timestamp === 'string'
            ? ((m as Record<string, unknown>).timestamp as string)
            : new Date().toISOString(),
        });
      }
    }

    return result;
  }

  private buildExpirationDate(): Date {
    return new Date(Date.now() + sessionExpirationMinutes * 60 * 1000);
  }

  private async linkTelegramChat(message: TelegramMessage, secretCode: string): Promise<string> {
    try {
      return await this.prismaService.$transaction(async (transaction) => {
        const connection = await transaction.channelConnection.findFirst({
          where: {
            channel: telegramChannel,
            secretCode,
            isActive: true,
          },
          select: telegramConnectionSelect,
        });

        if (!connection || !connection.identifier.startsWith(pendingIdentifierPrefix)) {
          return 'This Telegram link is invalid or expired. Please generate a new link from your organization workspace.';
        }

        const chatId = this.getChatId(message);
        const chatIdentifier = this.buildChatIdentifier(chatId);
        const existingLinkedConnection = await transaction.channelConnection.findFirst({
          where: {
            channel: telegramChannel,
            identifier: chatIdentifier,
            isActive: true,
            NOT: {
              id: connection.id,
            },
          },
          select: {
            id: true,
          },
        });

        if (existingLinkedConnection) {
          return 'This Telegram chat is already linked to an organization.';
        }

        const linkedAt = new Date().toISOString();
        await transaction.channelConnection.update({
          where: {
            id: connection.id,
          },
          data: {
            identifier: chatIdentifier,
            metadata: this.buildLinkedMetadata(message, linkedAt),
          },
          select: {
            id: true,
          },
        });

        await this.createAuditLog(transaction, {
          userProfileId: null,
          organizationId: connection.organizationId,
          action: 'telegram.connection_linked',
          entityType: 'ChannelConnection',
          entityId: connection.id,
          metadata: {
            telegramChatId: chatId,
            telegramUserId: message.from ? this.getTelegramUserId(message.from) : null,
            linkedAt,
          },
        });

        return 'This Telegram chat is now linked to your organization.';
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        return 'This Telegram chat is already linked to an organization.';
      }

      throw error;
    }
  }

  private async deactivateActiveTelegramConnections(
    transaction: Prisma.TransactionClient,
    organizationId: string,
  ): Promise<void> {
    const activeConnections = await transaction.channelConnection.findMany({
      where: {
        organizationId,
        channel: telegramChannel,
        isActive: true,
      },
      select: {
        id: true,
        identifier: true,
      },
    });

    for (const connection of activeConnections) {
      await transaction.channelConnection.update({
        where: {
          id: connection.id,
        },
        data: {
          isActive: false,
          identifier: `${inactiveIdentifierPrefix}${connection.id}:${connection.identifier}`,
        },
        select: {
          id: true,
        },
      });
    }
  }

  private buildLinkedMetadata(message: TelegramMessage, linkedAt: string): Prisma.InputJsonObject {
    return {
      botUsername: this.getBotUsernameOrThrow(),
      telegramChatId: this.getChatId(message),
      linkedAt,
      ...(message.from ? this.buildTelegramUserMetadata(message.from) : {}),
    };
  }

  private buildTelegramUserMetadata(user: TelegramUser): Prisma.InputJsonObject {
    return {
      telegramUserId: this.getTelegramUserId(user),
      telegramDisplayName: this.resolveTelegramUserName(user),
      ...(user.username ? { telegramUsername: truncateSanitizedText(user.username, maxRequesterNameLength) } : {}),
      ...(user.firstName ? { telegramFirstName: truncateSanitizedText(user.firstName, maxRequesterNameLength) } : {}),
      ...(user.lastName ? { telegramLastName: truncateSanitizedText(user.lastName, maxRequesterNameLength) } : {}),
    };
  }

  private readMetadataRecord(metadata: Prisma.JsonValue): Record<string, unknown> {
    if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
      return {};
    }

    return metadata;
  }

  private toTelegramConnectionResponse(connection: TelegramConnectionRecord): TelegramConnectionResponseDto {
    const metadata = this.readMetadataRecord(connection.metadata);
    const isLinked = connection.identifier.startsWith(chatIdentifierPrefix);
    const botUsername = this.getBotUsernameOrThrow();
    const linkedChatId = this.readMetadataString(metadata, 'telegramChatId') ?? this.resolveLinkedChatId(connection);

    return {
      id: connection.id,
      channel: connection.channel,
      isActive: connection.isActive,
      isLinked,
      botUsername,
      link: isLinked ? null : this.buildLink(botUsername, connection.secretCode),
      linkedChatId,
      linkedAt: this.readMetadataString(metadata, 'linkedAt'),
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  }

  private parseStartSecretCode(text: string): string | null {
    const match = /^\/start(?:@\w+)?(?:\s+(.+))?$/i.exec(text);

    if (!match) {
      return null;
    }

    return match[1]?.trim() ?? '';
  }

  private resolveTelegramUserName(user: TelegramUser): string {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();

    if (fullName.length > 0) {
      return truncateSanitizedText(fullName, maxRequesterNameLength);
    }

    if (user.username) {
      return truncateSanitizedText(user.username, maxRequesterNameLength);
    }

    return `Telegram User ${user.id}`;
  }

  private resolveLinkedChatId(connection: TelegramConnectionRecord): string | null {
    if (!connection.identifier.startsWith(chatIdentifierPrefix)) {
      return null;
    }

    return connection.identifier.slice(chatIdentifierPrefix.length);
  }

  private buildLink(botUsername: string, secretCode: string): string {
    return `https://t.me/${botUsername}?start=${secretCode}`;
  }

  private buildPendingIdentifier(secretCode: string): string {
    return `${pendingIdentifierPrefix}${secretCode}`;
  }

  private buildChatIdentifier(chatId: string): string {
    return `${chatIdentifierPrefix}${chatId}`;
  }

  private getChatId(message: TelegramMessage): string {
    return String(message.chat.id);
  }

  private getTelegramUserId(user: TelegramUser): string {
    return String(user.id);
  }

  private generateSecretCode(): string {
    return randomBytes(24).toString('base64url');
  }

  private getBotUsernameOrThrow(): string {
    const username = this.configService.get('TELEGRAM_BOT_USERNAME', { infer: true })?.trim().replace(/^@/, '');

    if (!username) {
      throw new ServiceUnavailableException('Telegram bot username is not configured');
    }

    return username;
  }

  private ensureValidWebhookSecret(webhookSecret: string | undefined): void {
    const expectedSecret = this.configService.get('TELEGRAM_WEBHOOK_SECRET', { infer: true });

    if (!expectedSecret || webhookSecret !== expectedSecret) {
      throw new UnauthorizedException('Invalid Telegram webhook secret');
    }
  }

  private async sendMessageSafely(chatId: string, text: string): Promise<void> {
    try {
      await this.telegramClientService.sendMessage(chatId, text);
    } catch (error) {
      this.logger.warn(
        {
          err: error,
          chatId,
        },
        'Telegram error notification failed',
      );
    }
  }

  private readMetadataString(metadata: Record<string, unknown>, key: string): string | null {
    const value = metadata[key];
    return typeof value === 'string' ? value : null;
  }

  private async createAuditLog(
    transaction: Prisma.TransactionClient,
    input: {
      userProfileId: string | null;
      organizationId: string;
      action: string;
      entityType: string;
      entityId: string;
      metadata: Prisma.InputJsonObject;
    },
  ): Promise<void> {
    await transaction.auditLog.create({
      data: input,
    });
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
