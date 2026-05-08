import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CreatePublicIssueDto } from './dto/create-public-issue.dto';
import { PublicIssueCreatedResponseDto } from './dto/public-issue-created-response.dto';
import { PublicReportService } from './public-report.service';

@ApiTags('public-report')
@Controller('public-report')
export class PublicReportController {
  constructor(private readonly publicReportService: PublicReportService) {}

  @Post(':organizationSlug/issues')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiCreatedResponse({ type: PublicIssueCreatedResponseDto })
  @ApiNotFoundResponse({ description: 'Organization not found' })
  @ApiTooManyRequestsResponse({ description: 'Too many public report submissions' })
  createIssue(
    @Param('organizationSlug') organizationSlug: string,
    @Body() createPublicIssueDto: CreatePublicIssueDto,
  ): Promise<PublicIssueCreatedResponseDto> {
    return this.publicReportService.createIssue(organizationSlug, createPublicIssueDto);
  }
}
