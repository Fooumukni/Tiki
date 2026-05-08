import { Injectable, NotFoundException } from '@nestjs/common';
import { SourceChannel } from '@prisma/client';
import { sanitizeTextValue } from '../common/utils/string-sanitizer';
import { IssuesService } from '../issues/issues.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePublicIssueDto } from './dto/create-public-issue.dto';
import { PublicIssueCreatedResponseDto } from './dto/public-issue-created-response.dto';

const organizationSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const maxOrganizationSlugLength = 120;

@Injectable()
export class PublicReportService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly issuesService: IssuesService,
  ) {}

  async createIssue(
    organizationSlug: string,
    createPublicIssueDto: CreatePublicIssueDto,
  ): Promise<PublicIssueCreatedResponseDto> {
    const normalizedOrganizationSlug = this.normalizeOrganizationSlug(organizationSlug);
    const organization = await this.prismaService.organization.findFirst({
      where: {
        slug: normalizedOrganizationSlug,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const issue = await this.issuesService.createIssueFromChannel({
      organizationId: organization.id,
      requesterName: createPublicIssueDto.requesterName,
      requesterEmail: createPublicIssueDto.requesterEmail,
      title: createPublicIssueDto.title,
      originalDescription: createPublicIssueDto.originalDescription,
      sourceChannel: SourceChannel.PUBLIC_FORM,
      auditAction: 'issue.public_created',
      auditUserProfileId: null,
    });

    return {
      code: issue.code,
      message: 'Your issue was created successfully',
    };
  }

  private normalizeOrganizationSlug(organizationSlug: string): string {
    const normalizedOrganizationSlug = sanitizeTextValue(organizationSlug).toLowerCase();

    if (
      normalizedOrganizationSlug.length === 0 ||
      normalizedOrganizationSlug.length > maxOrganizationSlugLength ||
      !organizationSlugPattern.test(normalizedOrganizationSlug)
    ) {
      throw new NotFoundException('Organization not found');
    }

    return normalizedOrganizationSlug;
  }
}
