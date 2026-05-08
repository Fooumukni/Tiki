import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  AiAnalysisStatus,
  IssuePriority,
  IssueStatus,
  OrganizationRole,
  Prisma,
  SenderType,
  SourceChannel,
} from '@prisma/client';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AiAnalysisQueueService } from '../ai/ai-analysis-queue.service';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { sanitizeTextValue, truncateSanitizedText } from '../common/utils/string-sanitizer';
import { MembershipsService } from '../memberships/memberships.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { IssueMessageResponseDto, IssueRequesterResponseDto, IssueResponseDto } from './dto/issue-response.dto';
import { ListIssuesQueryDto } from './dto/list-issues-query.dto';
import { PaginatedIssuesResponseDto } from './dto/paginated-issues-response.dto';
import { UpdateIssueStatusDto } from './dto/update-issue-status.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { defaultIssueTitle } from './issue.constants';
import { IssueBaseRecord, IssueDetailRecord, issueBaseSelect, issueDetailSelect } from './issue-record.types';

const issueManagerRoles = [OrganizationRole.ORG_ADMIN, OrganizationRole.AGENT];
const issueCodePrefix = 'ISSUE-';
const issueCodePadding = 5;
const maxIssueCodeCreationAttempts = 5;
const resolvedStatuses: IssueStatus[] = [IssueStatus.RESOLVED, IssueStatus.CLOSED];
const maxRequesterNameLength = 120;
const maxIssueTitleLength = 160;
const maxIssueDescriptionLength = 10000;

interface CreateIssueFromChannelInput {
  organizationId: string;
  requesterName: string;
  requesterEmail?: string;
  requesterTelegramUserId?: string;
  requesterTelegramChatId?: string;
  title?: string;
  originalDescription: string;
  sourceChannel: SourceChannel;
  auditAction?: string;
  auditUserProfileId?: string | null;
}

@Injectable()
export class IssuesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly membershipsService: MembershipsService,
    private readonly aiAnalysisQueueService: AiAnalysisQueueService,
    @InjectPinoLogger(IssuesService.name)
    private readonly logger: PinoLogger,
  ) {}

  async listIssues(
    currentUser: AuthenticatedUser,
    organizationId: string,
    listIssuesQueryDto: ListIssuesQueryDto,
  ): Promise<PaginatedIssuesResponseDto> {
    await this.membershipsService.ensureOrganizationMember(currentUser.id, organizationId);
    const pagination = this.resolvePagination(listIssuesQueryDto);
    const where = this.buildIssueWhere(organizationId, listIssuesQueryDto);

    const [issues, total] = await this.prismaService.$transaction([
      this.prismaService.issue.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        select: issueBaseSelect,
      }),
      this.prismaService.issue.count({ where }),
    ]);

    return {
      items: issues.map((issue) => this.toIssueResponse(issue)),
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async getIssue(currentUser: AuthenticatedUser, organizationId: string, issueId: string): Promise<IssueResponseDto> {
    await this.membershipsService.ensureOrganizationMember(currentUser.id, organizationId);
    const issue = await this.findIssueDetailOrThrow(organizationId, issueId);

    return this.toIssueResponse(issue);
  }

  async createIssue(
    currentUser: AuthenticatedUser,
    organizationId: string,
    createIssueDto: CreateIssueDto,
  ): Promise<IssueResponseDto> {
    await this.membershipsService.ensureOrganizationRole(currentUser.id, organizationId, issueManagerRoles);

    return this.createIssueFromChannel({
      organizationId,
      requesterName: createIssueDto.requesterName,
      requesterEmail: createIssueDto.requesterEmail,
      title: createIssueDto.title,
      originalDescription: createIssueDto.originalDescription,
      sourceChannel: SourceChannel.DASHBOARD,
      auditAction: 'issue.created',
      auditUserProfileId: currentUser.id,
    });
  }

  async createIssueFromChannel(input: CreateIssueFromChannelInput): Promise<IssueResponseDto> {
    const normalizedInput = this.normalizeCreateIssueFromChannelInput(input);

    for (let attempt = 0; attempt < maxIssueCodeCreationAttempts; attempt += 1) {
      try {
        const issue = await this.prismaService.$transaction(async (transaction) => {
          const requester = await this.upsertRequester(transaction, normalizedInput);
          const code = await this.generateNextIssueCode(transaction, normalizedInput.organizationId);
          const createdIssue = await transaction.issue.create({
            data: {
              organizationId: normalizedInput.organizationId,
              requesterId: requester.id,
              code,
              title: this.resolveIssueTitle(normalizedInput.title),
              originalDescription: normalizedInput.originalDescription,
              priority: IssuePriority.MEDIUM,
              sourceChannel: normalizedInput.sourceChannel,
              status: IssueStatus.NEW,
              aiAnalysisStatus: AiAnalysisStatus.PENDING,
              messages: {
                create: {
                  senderType: SenderType.REQUESTER,
                  senderName: normalizedInput.requesterName,
                  content: normalizedInput.originalDescription,
                  sourceChannel: normalizedInput.sourceChannel,
                },
              },
            },
            select: issueDetailSelect,
          });

          if (normalizedInput.auditAction) {
            await this.createAuditLog(transaction, {
              userProfileId: normalizedInput.auditUserProfileId ?? null,
              organizationId: normalizedInput.organizationId,
              action: normalizedInput.auditAction,
              entityType: 'Issue',
              entityId: createdIssue.id,
              metadata: {
                code: createdIssue.code,
                sourceChannel: createdIssue.sourceChannel,
                requesterId: requester.id,
              },
            });
          }

          return createdIssue;
        });

        await this.enqueueIssueAnalysisSafely(normalizedInput.organizationId, issue.id);

        return this.toIssueResponse(issue);
      } catch (error) {
        if (this.isUniqueConstraintError(error)) {
          continue;
        }

        throw error;
      }
    }

    throw new ConflictException('Issue code could not be generated');
  }

  private normalizeCreateIssueFromChannelInput(input: CreateIssueFromChannelInput): CreateIssueFromChannelInput {
    const requesterName = truncateSanitizedText(input.requesterName, maxRequesterNameLength);
    const originalDescription = truncateSanitizedText(input.originalDescription, maxIssueDescriptionLength);
    const title = input.title ? truncateSanitizedText(input.title, maxIssueTitleLength) : undefined;
    const requesterTelegramUserId = input.requesterTelegramUserId
      ? sanitizeTextValue(input.requesterTelegramUserId)
      : undefined;
    const requesterTelegramChatId = input.requesterTelegramChatId
      ? sanitizeTextValue(input.requesterTelegramChatId)
      : undefined;

    if (!requesterName) {
      throw new BadRequestException('Requester name is required');
    }

    if (!originalDescription) {
      throw new BadRequestException('Issue description is required');
    }

    return {
      ...input,
      requesterName,
      requesterEmail: this.normalizeOptionalEmail(input.requesterEmail),
      requesterTelegramUserId,
      requesterTelegramChatId,
      title: title && title.length > 0 ? title : undefined,
      originalDescription,
    };
  }

  async updateIssue(
    currentUser: AuthenticatedUser,
    organizationId: string,
    issueId: string,
    updateIssueDto: UpdateIssueDto,
  ): Promise<IssueResponseDto> {
    await this.membershipsService.ensureOrganizationRole(currentUser.id, organizationId, issueManagerRoles);
    const existingIssue = await this.findIssueDetailOrThrow(organizationId, issueId);
    const updateData = this.buildIssueUpdateData(updateIssueDto);

    if (Object.keys(updateData).length === 0) {
      return this.toIssueResponse(existingIssue);
    }

    const issue = await this.prismaService.issue.update({
      where: { id: issueId },
      data: updateData,
      select: issueDetailSelect,
    });

    return this.toIssueResponse(issue);
  }

  async updateIssueStatus(
    currentUser: AuthenticatedUser,
    organizationId: string,
    issueId: string,
    updateIssueStatusDto: UpdateIssueStatusDto,
  ): Promise<IssueResponseDto> {
    await this.membershipsService.ensureOrganizationRole(currentUser.id, organizationId, issueManagerRoles);
    const existingIssue = await this.findIssueDetailOrThrow(organizationId, issueId);

    if (existingIssue.status === updateIssueStatusDto.status) {
      return this.toIssueResponse(existingIssue);
    }

    const issue = await this.prismaService.$transaction(async (transaction) => {
      const updatedIssue = await transaction.issue.update({
        where: { id: issueId },
        data: {
          status: updateIssueStatusDto.status,
          resolvedAt: this.resolveResolvedAt(updateIssueStatusDto.status, existingIssue.resolvedAt),
        },
        select: issueDetailSelect,
      });

      await this.createAuditLog(transaction, {
        userProfileId: currentUser.id,
        organizationId,
        action: 'issue.status_changed',
        entityType: 'Issue',
        entityId: updatedIssue.id,
        metadata: {
          code: updatedIssue.code,
          previousStatus: existingIssue.status,
          newStatus: updatedIssue.status,
        },
      });

      return updatedIssue;
    });

    return this.toIssueResponse(issue);
  }

  async retryIssueAnalysis(
    currentUser: AuthenticatedUser,
    organizationId: string,
    issueId: string,
  ): Promise<IssueResponseDto> {
    await this.membershipsService.ensureOrganizationRole(currentUser.id, organizationId, issueManagerRoles);

    const retryState = await this.prismaService.$transaction(async (transaction) => {
      const existingIssue = await transaction.issue.findFirst({
        where: {
          id: issueId,
          organizationId,
        },
        select: issueDetailSelect,
      });

      if (!existingIssue) {
        throw new NotFoundException('Issue not found');
      }

      if (existingIssue.aiAnalysisStatus === AiAnalysisStatus.PROCESSING) {
        throw new ConflictException('Issue AI analysis is already processing');
      }

      const updatedIssue = await transaction.issue.update({
        where: { id: issueId },
        data: { aiAnalysisStatus: AiAnalysisStatus.PENDING },
        select: issueDetailSelect,
      });

      await this.createAuditLog(transaction, {
        userProfileId: currentUser.id,
        organizationId,
        action: 'issue.ai_analysis_retried',
        entityType: 'Issue',
        entityId: updatedIssue.id,
        metadata: {
          code: updatedIssue.code,
          previousAiAnalysisStatus: existingIssue.aiAnalysisStatus,
          newAiAnalysisStatus: updatedIssue.aiAnalysisStatus,
        },
      });

      return {
        issue: updatedIssue,
        previousAiAnalysisStatus: existingIssue.aiAnalysisStatus,
      };
    });

    try {
      await this.aiAnalysisQueueService.retryIssueAnalysis({
        organizationId,
        issueId,
        requestedByUserProfileId: currentUser.id,
      });
    } catch (error) {
      await this.prismaService.issue.update({
        where: { id: issueId },
        data: { aiAnalysisStatus: retryState.previousAiAnalysisStatus },
        select: { id: true },
      });
      this.logger.warn(
        {
          err: error,
          organizationId,
          issueId,
          userProfileId: currentUser.id,
        },
        'Issue AI analysis retry enqueue failed',
      );
      throw new ServiceUnavailableException('Issue AI analysis retry could not be queued');
    }

    return this.toIssueResponse(retryState.issue);
  }

  private buildIssueWhere(organizationId: string, listIssuesQueryDto: ListIssuesQueryDto): Prisma.IssueWhereInput {
    const createdAt = this.resolveCreatedAtFilter(listIssuesQueryDto.fromDate, listIssuesQueryDto.toDate);
    const where: Prisma.IssueWhereInput = {
      organizationId,
      ...(listIssuesQueryDto.status ? { status: listIssuesQueryDto.status } : {}),
      ...(listIssuesQueryDto.priority ? { priority: listIssuesQueryDto.priority } : {}),
      ...(listIssuesQueryDto.sourceChannel ? { sourceChannel: listIssuesQueryDto.sourceChannel } : {}),
      ...(listIssuesQueryDto.category
        ? {
            category: {
              equals: listIssuesQueryDto.category,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(createdAt ? { createdAt } : {}),
    };

    if (listIssuesQueryDto.search) {
      where.OR = this.buildSearchFilters(listIssuesQueryDto.search);
    }

    return where;
  }

  private buildSearchFilters(search: string): Prisma.IssueWhereInput[] {
    return [
      {
        code: {
          contains: search,
          mode: 'insensitive',
        },
      },
      {
        title: {
          contains: search,
          mode: 'insensitive',
        },
      },
      {
        originalDescription: {
          contains: search,
          mode: 'insensitive',
        },
      },
      {
        summary: {
          contains: search,
          mode: 'insensitive',
        },
      },
      {
        requester: {
          is: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      },
      {
        requester: {
          is: {
            email: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      },
    ];
  }

  private resolveCreatedAtFilter(fromDate?: string, toDate?: string): Prisma.DateTimeFilter | undefined {
    const createdAt: Prisma.DateTimeFilter = {};
    const parsedFromDate = fromDate ? this.parseIsoDate(fromDate, 'fromDate') : undefined;
    const parsedToDate = toDate ? this.parseIsoDate(toDate, 'toDate') : undefined;

    if (parsedFromDate && parsedToDate && parsedFromDate.getTime() > parsedToDate.getTime()) {
      throw new BadRequestException('fromDate must be before or equal to toDate');
    }

    if (parsedFromDate) {
      createdAt.gte = parsedFromDate;
    }

    if (parsedToDate) {
      createdAt.lte = parsedToDate;
    }

    return Object.keys(createdAt).length > 0 ? createdAt : undefined;
  }

  private parseIsoDate(value: string, fieldName: string): Date {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid ISO date`);
    }

    return date;
  }

  private resolvePagination(listIssuesQueryDto: ListIssuesQueryDto): { page: number; limit: number } {
    return {
      page: listIssuesQueryDto.page ?? 1,
      limit: listIssuesQueryDto.limit ?? 20,
    };
  }

  private async generateNextIssueCode(transaction: Prisma.TransactionClient, organizationId: string): Promise<string> {
    const latestIssue = await transaction.issue.findFirst({
      where: {
        organizationId,
        code: {
          startsWith: issueCodePrefix,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        code: true,
      },
    });
    const nextIssueNumber = latestIssue ? this.parseIssueCodeNumber(latestIssue.code) + 1 : 1;

    return this.formatIssueCode(nextIssueNumber);
  }

  private parseIssueCodeNumber(code: string): number {
    const match = new RegExp(`^${issueCodePrefix}(\\d+)$`).exec(code);

    if (!match) {
      return 0;
    }

    return Number(match[1]);
  }

  private formatIssueCode(issueNumber: number): string {
    return `${issueCodePrefix}${issueNumber.toString().padStart(issueCodePadding, '0')}`;
  }

  private resolveIssueTitle(title?: string): string {
    if (!title) {
      return defaultIssueTitle;
    }

    const trimmedTitle = title.trim();
    return trimmedTitle.length > 0 ? trimmedTitle : defaultIssueTitle;
  }

  private async upsertRequester(
    transaction: Prisma.TransactionClient,
    input: CreateIssueFromChannelInput,
  ): Promise<{ id: string }> {
    const requesterEmail = this.normalizeOptionalEmail(input.requesterEmail);

    if (input.requesterTelegramUserId) {
      return transaction.requester.upsert({
        where: {
          organizationId_telegramUserId: {
            organizationId: input.organizationId,
            telegramUserId: input.requesterTelegramUserId,
          },
        },
        update: {
          name: input.requesterName,
          telegramChatId: input.requesterTelegramChatId,
          ...(requesterEmail ? { email: requesterEmail } : {}),
        },
        create: {
          organizationId: input.organizationId,
          name: input.requesterName,
          email: requesterEmail,
          telegramUserId: input.requesterTelegramUserId,
          telegramChatId: input.requesterTelegramChatId,
        },
        select: {
          id: true,
        },
      });
    }

    if (requesterEmail) {
      return transaction.requester.upsert({
        where: {
          organizationId_email: {
            organizationId: input.organizationId,
            email: requesterEmail,
          },
        },
        update: {
          name: input.requesterName,
        },
        create: {
          organizationId: input.organizationId,
          name: input.requesterName,
          email: requesterEmail,
        },
        select: {
          id: true,
        },
      });
    }

    throw new BadRequestException('Requester email or Telegram user ID is required');
  }

  private normalizeOptionalEmail(email?: string): string | undefined {
    const normalizedEmail = email ? sanitizeTextValue(email).toLowerCase() : undefined;
    return normalizedEmail && normalizedEmail.length > 0 ? normalizedEmail : undefined;
  }

  private buildIssueUpdateData(updateIssueDto: UpdateIssueDto): Prisma.IssueUpdateInput {
    const updateData: Prisma.IssueUpdateInput = {};

    if (updateIssueDto.title !== undefined) {
      updateData.title = updateIssueDto.title;
    }

    if (updateIssueDto.originalDescription !== undefined) {
      updateData.originalDescription = updateIssueDto.originalDescription;
    }

    if (updateIssueDto.category !== undefined) {
      updateData.category = updateIssueDto.category;
    }

    if (updateIssueDto.priority !== undefined) {
      updateData.priority = updateIssueDto.priority;
    }

    return updateData;
  }

  private resolveResolvedAt(status: IssueStatus, existingResolvedAt: Date | null): Date | null {
    if (!resolvedStatuses.includes(status)) {
      return null;
    }

    return existingResolvedAt ?? new Date();
  }

  private async findIssueDetailOrThrow(organizationId: string, issueId: string): Promise<IssueDetailRecord> {
    const issue = await this.prismaService.issue.findFirst({
      where: {
        id: issueId,
        organizationId,
      },
      select: issueDetailSelect,
    });

    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    return issue;
  }

  private async enqueueIssueAnalysisSafely(organizationId: string, issueId: string): Promise<void> {
    try {
      await this.aiAnalysisQueueService.enqueueIssueAnalysis({ organizationId, issueId });
    } catch (error) {
      this.logger.warn(
        {
          err: error,
          organizationId,
          issueId,
        },
        'Issue AI analysis enqueue failed',
      );
    }
  }

  private toIssueResponse(issue: IssueBaseRecord | IssueDetailRecord): IssueResponseDto {
    return {
      id: issue.id,
      organizationId: issue.organizationId,
      requesterId: issue.requesterId,
      code: issue.code,
      title: issue.title,
      originalDescription: issue.originalDescription,
      generatedTitle: issue.generatedTitle,
      summary: issue.summary,
      category: issue.category,
      priority: issue.priority,
      sentiment: issue.sentiment,
      suggestedTeam: issue.suggestedTeam,
      suggestedResponse: issue.suggestedResponse,
      tags: issue.tags,
      sourceChannel: issue.sourceChannel,
      status: issue.status,
      aiAnalysisStatus: issue.aiAnalysisStatus,
      requester: this.toRequesterResponse(issue.requester),
      messages: 'messages' in issue ? issue.messages.map((message) => this.toIssueMessageResponse(message)) : undefined,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      resolvedAt: issue.resolvedAt,
    };
  }

  private toRequesterResponse(requester: IssueBaseRecord['requester']): IssueRequesterResponseDto | null {
    if (!requester) {
      return null;
    }

    return {
      id: requester.id,
      name: requester.name,
      email: requester.email,
    };
  }

  private toIssueMessageResponse(message: IssueDetailRecord['messages'][number]): IssueMessageResponseDto {
    return {
      id: message.id,
      senderType: message.senderType,
      senderName: message.senderName,
      content: message.content,
      sourceChannel: message.sourceChannel,
      createdAt: message.createdAt,
    };
  }

  private async createAuditLog(
    transaction: Prisma.TransactionClient,
    input: {
      userProfileId?: string | null;
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
