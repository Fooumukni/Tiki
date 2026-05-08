import {
  AiAnalysisStatus,
  IssuePriority,
  IssueStatus,
  OrganizationRole,
  SenderType,
  SourceChannel,
} from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiAnalysisQueueService } from '../ai/ai-analysis-queue.service';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { MembershipsService } from '../memberships/memberships.service';
import { PrismaService } from '../prisma/prisma.service';
import { IssuesService } from './issues.service';

const now = new Date('2026-05-07T12:00:00.000Z');
const organizationId = '11111111-1111-4111-8111-111111111111';
const userProfileId = '22222222-2222-4222-8222-222222222222';
const issueId = '33333333-3333-4333-8333-333333333333';
const requesterId = '44444444-4444-4444-8444-444444444444';

const currentUser: AuthenticatedUser = {
  id: userProfileId,
  keycloakUserId: 'keycloak-user-id',
  email: 'agent@example.com',
  fullName: 'Support Agent',
  preferredUsername: 'agent',
  memberships: [],
};

function createIssueRecord(code = 'ISSUE-00001') {
  return {
    id: issueId,
    organizationId,
    requesterId,
    code,
    title: 'Cannot access billing settings',
    originalDescription: 'The billing page returns a server error.',
    generatedTitle: null,
    summary: null,
    category: null,
    priority: IssuePriority.MEDIUM,
    sentiment: null,
    suggestedTeam: null,
    suggestedResponse: null,
    tags: [],
    sourceChannel: SourceChannel.DASHBOARD,
    status: IssueStatus.NEW,
    aiAnalysisStatus: AiAnalysisStatus.PENDING,
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
    requester: {
      id: requesterId,
      name: 'Jane Customer',
      email: 'jane@example.com',
    },
    messages: [
      {
        id: '55555555-5555-4555-8555-555555555555',
        senderType: SenderType.REQUESTER,
        senderName: 'Jane Customer',
        content: 'The billing page returns a server error.',
        sourceChannel: SourceChannel.DASHBOARD,
        createdAt: now,
      },
    ],
  };
}

describe('IssuesService', () => {
  const transaction = {
    requester: {
      upsert: vi.fn(),
    },
    issue: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };
  const prismaService = {
    $transaction: vi.fn(),
    issue: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  };
  const membershipsService = {
    ensureOrganizationRole: vi.fn(),
    ensureOrganizationMember: vi.fn(),
  };
  const aiAnalysisQueueService = {
    enqueueIssueAnalysis: vi.fn(),
  };
  const logger = {
    warn: vi.fn(),
  };

  let issuesService: IssuesService;

  beforeEach(() => {
    vi.clearAllMocks();
    transaction.requester.upsert.mockResolvedValue({ id: requesterId });
    transaction.issue.findFirst.mockResolvedValue(null);
    transaction.issue.create.mockResolvedValue(createIssueRecord());
    transaction.auditLog.create.mockResolvedValue({});
    prismaService.$transaction.mockImplementation((input: unknown) => {
      if (Array.isArray(input)) {
        return Promise.all(input);
      }

      if (typeof input === 'function') {
        return input(transaction);
      }

      return Promise.reject(new Error('Unsupported transaction input'));
    });
    prismaService.issue.findMany.mockResolvedValue([createIssueRecord()]);
    prismaService.issue.count.mockResolvedValue(1);
    membershipsService.ensureOrganizationRole.mockResolvedValue({
      id: 'membership-id',
      organizationId,
      organizationName: 'Acme Support',
      organizationSlug: 'acme-support',
      role: OrganizationRole.AGENT,
    });
    membershipsService.ensureOrganizationMember.mockResolvedValue({
      id: 'membership-id',
      organizationId,
      organizationName: 'Acme Support',
      organizationSlug: 'acme-support',
      role: OrganizationRole.VIEWER,
    });
    aiAnalysisQueueService.enqueueIssueAnalysis.mockResolvedValue(undefined);
    issuesService = new IssuesService(
      prismaService as unknown as PrismaService,
      membershipsService as unknown as MembershipsService,
      aiAnalysisQueueService as unknown as AiAnalysisQueueService,
      logger as never,
    );
  });

  it('creates a dashboard issue and enqueues AI analysis', async () => {
    const issue = await issuesService.createIssue(currentUser, organizationId, {
      requesterName: 'Jane Customer',
      requesterEmail: 'jane@example.com',
      title: 'Cannot access billing settings',
      originalDescription: 'The billing page returns a server error.',
    });

    expect(issue.code).toBe('ISSUE-00001');
    expect(transaction.issue.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: 'ISSUE-00001',
          sourceChannel: SourceChannel.DASHBOARD,
          status: IssueStatus.NEW,
          aiAnalysisStatus: AiAnalysisStatus.PENDING,
        }),
      }),
    );
    expect(aiAnalysisQueueService.enqueueIssueAnalysis).toHaveBeenCalledWith({ organizationId, issueId });
  });

  it('generates the next organization-scoped issue code', async () => {
    transaction.issue.findFirst.mockResolvedValue({ code: 'ISSUE-00001' });
    transaction.issue.create.mockResolvedValue(createIssueRecord('ISSUE-00002'));

    const issue = await issuesService.createIssue(currentUser, organizationId, {
      requesterName: 'Jane Customer',
      requesterEmail: 'jane@example.com',
      originalDescription: 'Second issue.',
    });

    expect(issue.code).toBe('ISSUE-00002');
    expect(transaction.issue.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ code: 'ISSUE-00002' }),
      }),
    );
  });

  it('filters issue list by organization', async () => {
    await issuesService.listIssues(currentUser, organizationId, { status: IssueStatus.NEW });

    expect(prismaService.issue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId,
          status: IssueStatus.NEW,
        }),
      }),
    );
    expect(prismaService.issue.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        organizationId,
        status: IssueStatus.NEW,
      }),
    });
  });

  it('prevents cross-organization access when membership validation fails', async () => {
    membershipsService.ensureOrganizationMember.mockRejectedValue(new ForbiddenException('Forbidden'));

    await expect(issuesService.listIssues(currentUser, organizationId, {})).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaService.issue.findMany).not.toHaveBeenCalled();
  });

  it('keeps created issues usable when AI enqueue fails', async () => {
    aiAnalysisQueueService.enqueueIssueAnalysis.mockRejectedValue(new Error('Queue unavailable'));

    const issue = await issuesService.createIssue(currentUser, organizationId, {
      requesterName: 'Jane Customer',
      requesterEmail: 'jane@example.com',
      originalDescription: 'The billing page returns a server error.',
    });

    expect(issue.id).toBe(issueId);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId, issueId }),
      'Issue AI analysis enqueue failed',
    );
  });
});
