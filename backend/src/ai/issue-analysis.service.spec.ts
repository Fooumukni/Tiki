import { AiAnalysisStatus, IssuePriority, Sentiment } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultIssueTitle } from '../issues/issue.constants';
import { PrismaService } from '../prisma/prisma.service';
import { AiUsageService } from './ai-usage.service';
import { IssueAnalysisService } from './issue-analysis.service';
import { AIProvider, IssueAnalysis } from './types/ai-provider.interface';
import { InvalidAiResponseError, parseIssueAnalysisResponse } from './utils/ai-analysis-validation';

const organizationId = '11111111-1111-4111-8111-111111111111';
const issueId = '33333333-3333-4333-8333-333333333333';

const validAnalysis: IssueAnalysis = {
  generatedTitle: 'Error 500 on login',
  summary: 'The user cannot log in because the server returns a 500 error.',
  category: 'Backend / Authentication',
  priority: IssuePriority.HIGH,
  sentiment: Sentiment.FRUSTRATED,
  suggestedTeam: 'Backend',
  suggestedResponse: 'Thank you for reporting this. We will review the authentication service logs.',
  tags: ['login', 'error-500'],
};

const issueForAnalysis = {
  id: issueId,
  organizationId,
  code: 'ISSUE-00001',
  title: defaultIssueTitle,
  originalDescription: 'Login returns error 500.',
  aiAnalysisStatus: AiAnalysisStatus.PENDING,
};

describe('AI analysis validation', () => {
  it('parses valid JSON analysis', () => {
    expect(parseIssueAnalysisResponse(JSON.stringify(validAnalysis))).toEqual(validAnalysis);
  });

  it('rejects invalid JSON analysis', () => {
    expect(() => parseIssueAnalysisResponse('not-json')).toThrow(InvalidAiResponseError);
  });
});

describe('IssueAnalysisService', () => {
  const transaction = {
    aiAnalysisLog: {
      create: vi.fn(),
    },
    issue: {
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };
  const prismaService = {
    $transaction: vi.fn(),
    issue: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  };
  const aiUsageService = {
    reserveIssueAnalysisUsage: vi.fn(),
  };
  const aiProvider = {
    name: 'test-provider',
    analyzeIssue: vi.fn(),
  };
  const logger = {
    debug: vi.fn(),
    warn: vi.fn(),
  };
  let issueAnalysisService: IssueAnalysisService;

  beforeEach(() => {
    vi.clearAllMocks();
    prismaService.issue.findFirst.mockResolvedValue(issueForAnalysis);
    prismaService.issue.update.mockResolvedValue({ id: issueId });
    prismaService.$transaction.mockImplementation((input: unknown) => {
      if (typeof input === 'function') {
        return input(transaction);
      }

      return Promise.reject(new Error('Unsupported transaction input'));
    });
    transaction.aiAnalysisLog.create.mockResolvedValue({});
    transaction.issue.update.mockResolvedValue({ id: issueId });
    transaction.auditLog.create.mockResolvedValue({});
    aiUsageService.reserveIssueAnalysisUsage.mockResolvedValue({
      allowed: true,
      aiUsageLimit: 100,
      aiUsageCount: 1,
    });
    aiProvider.analyzeIssue.mockResolvedValue({
      rawResponse: JSON.stringify(validAnalysis),
      parsedResponse: validAnalysis,
    });
    issueAnalysisService = new IssueAnalysisService(
      prismaService as unknown as PrismaService,
      aiUsageService as unknown as AiUsageService,
      aiProvider as unknown as AIProvider,
      logger as never,
    );
  });

  it('updates an issue with successful AI analysis', async () => {
    await issueAnalysisService.analyzeIssue({
      organizationId,
      issueId,
      force: false,
      attemptNumber: 1,
      maxAttempts: 3,
    });

    expect(aiProvider.analyzeIssue).toHaveBeenCalledWith({ message: issueForAnalysis.originalDescription });
    expect(transaction.issue.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          generatedTitle: validAnalysis.generatedTitle,
          aiAnalysisStatus: AiAnalysisStatus.COMPLETED,
        }),
      }),
    );
  });

  it('applies fallback analysis on final provider failure', async () => {
    aiProvider.analyzeIssue.mockRejectedValue(new InvalidAiResponseError('Invalid JSON', 'not-json'));

    await expect(
      issueAnalysisService.analyzeIssue({
        organizationId,
        issueId,
        force: false,
        attemptNumber: 3,
        maxAttempts: 3,
      }),
    ).rejects.toBeInstanceOf(InvalidAiResponseError);

    expect(transaction.aiAnalysisLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: AiAnalysisStatus.FAILED,
          errorMessage: 'Invalid JSON',
        }),
      }),
    );
    expect(transaction.issue.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          aiAnalysisStatus: AiAnalysisStatus.FAILED,
          suggestedTeam: 'General',
        }),
      }),
    );
  });

  it('does not call the provider when organization AI usage limit is reached', async () => {
    aiUsageService.reserveIssueAnalysisUsage.mockResolvedValue({
      allowed: false,
      aiUsageLimit: 1,
      aiUsageCount: 1,
    });

    await issueAnalysisService.analyzeIssue({
      organizationId,
      issueId,
      force: true,
      attemptNumber: 1,
      maxAttempts: 3,
      requestedByUserProfileId: '22222222-2222-4222-8222-222222222222',
    });

    expect(aiProvider.analyzeIssue).not.toHaveBeenCalled();
    expect(transaction.aiAnalysisLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: AiAnalysisStatus.FAILED,
          errorMessage: 'AI usage limit reached',
        }),
      }),
    );
    expect(transaction.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'ai.usage_limit_reached',
          organizationId,
          entityId: issueId,
        }),
      }),
    );
  });
});
