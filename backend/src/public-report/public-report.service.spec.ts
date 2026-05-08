import { NotFoundException } from '@nestjs/common';
import { SourceChannel } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IssuesService } from '../issues/issues.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicReportService } from './public-report.service';

const organizationId = '11111111-1111-4111-8111-111111111111';

describe('PublicReportService', () => {
  const prismaService = {
    organization: {
      findFirst: vi.fn(),
    },
  };
  const issuesService = {
    createIssueFromChannel: vi.fn(),
  };
  let publicReportService: PublicReportService;

  beforeEach(() => {
    vi.clearAllMocks();
    prismaService.organization.findFirst.mockResolvedValue({ id: organizationId });
    issuesService.createIssueFromChannel.mockResolvedValue({ code: 'ISSUE-00003' });
    publicReportService = new PublicReportService(
      prismaService as unknown as PrismaService,
      issuesService as unknown as IssuesService,
    );
  });

  it('creates a public issue for an active organization slug', async () => {
    const response = await publicReportService.createIssue('acme-support', {
      requesterName: 'Jane Customer',
      requesterEmail: 'jane@example.com',
      title: 'Cannot access billing settings',
      originalDescription: 'The billing page returns a server error.',
    });

    expect(response).toEqual({
      code: 'ISSUE-00003',
      message: 'Your issue was created successfully',
    });
    expect(issuesService.createIssueFromChannel).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId,
        sourceChannel: SourceChannel.PUBLIC_FORM,
        auditAction: 'issue.public_created',
        auditUserProfileId: null,
      }),
    );
  });

  it('rejects missing organizations', async () => {
    prismaService.organization.findFirst.mockResolvedValue(null);

    await expect(
      publicReportService.createIssue('missing-organization', {
        requesterName: 'Jane Customer',
        requesterEmail: 'jane@example.com',
        title: 'Cannot access billing settings',
        originalDescription: 'The billing page returns a server error.',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(issuesService.createIssueFromChannel).not.toHaveBeenCalled();
  });
});
