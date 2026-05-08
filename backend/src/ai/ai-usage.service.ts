import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AiUsageReservation {
  allowed: boolean;
  aiUsageLimit: number;
  aiUsageCount: number;
}

@Injectable()
export class AiUsageService {
  constructor(private readonly prismaService: PrismaService) {}

  async reserveIssueAnalysisUsage(organizationId: string): Promise<AiUsageReservation> {
    const updatedRows = await this.prismaService.$executeRaw`
      UPDATE "Organization"
      SET "aiUsageCount" = "aiUsageCount" + 1
      WHERE "id" = ${organizationId}::uuid
        AND "aiUsageCount" < "aiUsageLimit"
    `;

    const organization = await this.prismaService.organization.findUnique({
      where: { id: organizationId },
      select: {
        aiUsageLimit: true,
        aiUsageCount: true,
      },
    });

    return {
      allowed: updatedRows > 0,
      aiUsageLimit: organization?.aiUsageLimit ?? 0,
      aiUsageCount: organization?.aiUsageCount ?? 0,
    };
  }
}
