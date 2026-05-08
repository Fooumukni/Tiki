import { Inject, Injectable } from '@nestjs/common';
import { AiAnalysisStatus, IssuePriority, Prisma, Sentiment } from '@prisma/client';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { defaultIssueTitle } from '../issues/issue.constants';
import { PrismaService } from '../prisma/prisma.service';
import { AiUsageReservation, AiUsageService } from './ai-usage.service';
import { buildIssueAnalysisPrompt } from './prompts/issue-analysis.prompt';
import { AIProvider, aiProviderToken, IssueAnalysis } from './types/ai-provider.interface';
import { InvalidAiResponseError } from './utils/ai-analysis-validation';

interface AnalyzeIssueInput {
  organizationId: string;
  issueId: string;
  force: boolean;
  attemptNumber: number;
  maxAttempts: number;
  requestedByUserProfileId?: string;
}

interface IssueForAnalysis {
  id: string;
  organizationId: string;
  code: string;
  title: string;
  originalDescription: string;
  aiAnalysisStatus: AiAnalysisStatus;
}

const aiUsageLimitReachedMessage = 'AI usage limit reached';

@Injectable()
export class IssueAnalysisService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiUsageService: AiUsageService,
    @Inject(aiProviderToken)
    private readonly aiProvider: AIProvider,
    @InjectPinoLogger(IssueAnalysisService.name)
    private readonly logger: PinoLogger,
  ) {}

  async analyzeIssue(input: AnalyzeIssueInput): Promise<void> {
    const issue = await this.prismaService.issue.findFirst({
      where: {
        id: input.issueId,
        organizationId: input.organizationId,
      },
      select: {
        id: true,
        organizationId: true,
        code: true,
        title: true,
        originalDescription: true,
        aiAnalysisStatus: true,
      },
    });

    if (!issue) {
      this.logger.warn(input, 'Issue analysis skipped because issue was not found');
      return;
    }

    if (issue.aiAnalysisStatus === AiAnalysisStatus.COMPLETED && !input.force) {
      this.logger.debug(
        {
          issueId: issue.id,
          organizationId: issue.organizationId,
        },
        'Issue analysis skipped because issue is already completed',
      );
      return;
    }

    const prompt = buildIssueAnalysisPrompt(issue.originalDescription);
    const usageReservation = await this.aiUsageService.reserveIssueAnalysisUsage(issue.organizationId);

    if (!usageReservation.allowed) {
      await this.applyUsageLimitReachedAnalysis(issue, prompt, usageReservation, input.requestedByUserProfileId);
      return;
    }

    await this.prismaService.issue.update({
      where: { id: issue.id },
      data: { aiAnalysisStatus: AiAnalysisStatus.PROCESSING },
      select: { id: true },
    });

    try {
      const providerResponse = await this.aiProvider.analyzeIssue({ message: issue.originalDescription });
      await this.applySuccessfulAnalysis(issue, prompt, providerResponse.rawResponse, providerResponse.parsedResponse);
    } catch (error) {
      const isFinalAttempt = input.attemptNumber >= input.maxAttempts;
      await this.applyFailedAttempt(issue, prompt, error, input.attemptNumber, isFinalAttempt);
      throw error;
    }
  }

  private async applyUsageLimitReachedAnalysis(
    issue: IssueForAnalysis,
    prompt: string,
    usageReservation: AiUsageReservation,
    requestedByUserProfileId?: string,
  ): Promise<void> {
    const fallbackAnalysis = this.buildFallbackAnalysis(issue);

    this.logger.warn(
      {
        issueId: issue.id,
        organizationId: issue.organizationId,
        aiUsageCount: usageReservation.aiUsageCount,
        aiUsageLimit: usageReservation.aiUsageLimit,
      },
      'Issue AI analysis skipped because organization usage limit was reached',
    );

    await this.prismaService.$transaction(async (transaction) => {
      await transaction.aiAnalysisLog.create({
        data: {
          issueId: issue.id,
          provider: this.aiProvider.name,
          prompt,
          parsedResponse: this.toAnalysisJson(fallbackAnalysis),
          status: AiAnalysisStatus.FAILED,
          errorMessage: aiUsageLimitReachedMessage,
        },
      });

      await transaction.issue.update({
        where: { id: issue.id },
        data: this.buildIssueAnalysisUpdateData(issue, fallbackAnalysis, AiAnalysisStatus.FAILED),
        select: { id: true },
      });

      await transaction.auditLog.create({
        data: {
          userProfileId: requestedByUserProfileId ?? null,
          organizationId: issue.organizationId,
          action: 'ai.usage_limit_reached',
          entityType: 'Issue',
          entityId: issue.id,
          metadata: {
            code: issue.code,
            provider: this.aiProvider.name,
            aiUsageCount: usageReservation.aiUsageCount,
            aiUsageLimit: usageReservation.aiUsageLimit,
          },
        },
      });
    });
  }

  private async applySuccessfulAnalysis(
    issue: IssueForAnalysis,
    prompt: string,
    rawResponse: string,
    analysis: IssueAnalysis,
  ): Promise<void> {
    await this.prismaService.$transaction(async (transaction) => {
      await transaction.aiAnalysisLog.create({
        data: {
          issueId: issue.id,
          provider: this.aiProvider.name,
          prompt,
          rawResponse,
          parsedResponse: this.toAnalysisJson(analysis),
          status: AiAnalysisStatus.COMPLETED,
        },
      });
      await transaction.issue.update({
        where: { id: issue.id },
        data: this.buildIssueAnalysisUpdateData(issue, analysis, AiAnalysisStatus.COMPLETED),
        select: { id: true },
      });
    });
  }

  private async applyFailedAttempt(
    issue: IssueForAnalysis,
    prompt: string,
    error: unknown,
    attemptNumber: number,
    isFinalAttempt: boolean,
  ): Promise<void> {
    const fallbackAnalysis = isFinalAttempt ? this.buildFallbackAnalysis(issue) : undefined;
    const rawResponse = error instanceof InvalidAiResponseError ? error.rawResponse : undefined;
    const errorMessage = error instanceof Error ? error.message : 'Unknown AI analysis error';

    this.logger.warn(
      {
        err: error,
        issueId: issue.id,
        organizationId: issue.organizationId,
        provider: this.aiProvider.name,
        attemptNumber,
        isFinalAttempt,
      },
      isFinalAttempt ? 'Issue AI analysis failed and fallback was applied' : 'Issue AI analysis attempt failed',
    );

    await this.prismaService.$transaction(async (transaction) => {
      await transaction.aiAnalysisLog.create({
        data: {
          issueId: issue.id,
          provider: this.aiProvider.name,
          prompt,
          rawResponse,
          parsedResponse: fallbackAnalysis ? this.toAnalysisJson(fallbackAnalysis) : undefined,
          status: AiAnalysisStatus.FAILED,
          errorMessage,
        },
      });

      if (fallbackAnalysis) {
        await transaction.issue.update({
          where: { id: issue.id },
          data: this.buildIssueAnalysisUpdateData(issue, fallbackAnalysis, AiAnalysisStatus.FAILED),
          select: { id: true },
        });
      }
    });
  }

  private buildIssueAnalysisUpdateData(
    issue: IssueForAnalysis,
    analysis: IssueAnalysis,
    aiAnalysisStatus: AiAnalysisStatus,
  ): Prisma.IssueUpdateInput {
    return {
      generatedTitle: analysis.generatedTitle,
      title: issue.title === defaultIssueTitle ? analysis.generatedTitle : issue.title,
      summary: analysis.summary,
      category: analysis.category,
      priority: analysis.priority,
      sentiment: analysis.sentiment,
      suggestedTeam: analysis.suggestedTeam,
      suggestedResponse: analysis.suggestedResponse,
      tags: analysis.tags,
      aiAnalysisStatus,
    };
  }

  private buildFallbackAnalysis(issue: IssueForAnalysis): IssueAnalysis {
    return {
      generatedTitle: issue.title === defaultIssueTitle ? 'Support issue pending review' : issue.title,
      summary: this.compactText(issue.originalDescription, 300),
      category: 'General Support',
      priority: IssuePriority.MEDIUM,
      sentiment: Sentiment.NEUTRAL,
      suggestedTeam: 'General',
      suggestedResponse: 'Thank you for reporting this. Our team will review the issue and follow up.',
      tags: ['support', 'manual-review'],
    };
  }

  private compactText(value: string, maxLength: number): string {
    const compactValue = value.replace(/\s+/g, ' ').trim();

    if (compactValue.length <= maxLength) {
      return compactValue;
    }

    return `${compactValue.slice(0, maxLength - 3).trim()}...`;
  }

  private toAnalysisJson(analysis: IssueAnalysis): Prisma.InputJsonObject {
    return {
      generatedTitle: analysis.generatedTitle,
      summary: analysis.summary,
      category: analysis.category,
      priority: analysis.priority,
      sentiment: analysis.sentiment,
      suggestedTeam: analysis.suggestedTeam,
      suggestedResponse: analysis.suggestedResponse,
      tags: analysis.tags,
    };
  }
}
