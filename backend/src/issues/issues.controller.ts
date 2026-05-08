import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateIssueDto } from './dto/create-issue.dto';
import { IssueResponseDto } from './dto/issue-response.dto';
import { ListIssuesQueryDto } from './dto/list-issues-query.dto';
import { PaginatedIssuesResponseDto } from './dto/paginated-issues-response.dto';
import { UpdateIssueStatusDto } from './dto/update-issue-status.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { IssuesService } from './issues.service';

@ApiTags('issues')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid Keycloak access token' })
@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/issues')
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Get()
  @ApiOkResponse({ type: PaginatedIssuesResponseDto })
  @ApiForbiddenResponse({ description: 'User is not a member of this organization' })
  listIssues(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() listIssuesQueryDto: ListIssuesQueryDto,
  ): Promise<PaginatedIssuesResponseDto> {
    return this.issuesService.listIssues(currentUser, organizationId, listIssuesQueryDto);
  }

  @Get(':issueId')
  @ApiOkResponse({ type: IssueResponseDto })
  @ApiForbiddenResponse({ description: 'User is not a member of this organization' })
  @ApiNotFoundResponse({ description: 'Issue not found' })
  getIssue(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('issueId', ParseUUIDPipe) issueId: string,
  ): Promise<IssueResponseDto> {
    return this.issuesService.getIssue(currentUser, organizationId, issueId);
  }

  @Post()
  @ApiCreatedResponse({ type: IssueResponseDto })
  @ApiForbiddenResponse({ description: 'Only organization admins and agents can create issues' })
  createIssue(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() createIssueDto: CreateIssueDto,
  ): Promise<IssueResponseDto> {
    return this.issuesService.createIssue(currentUser, organizationId, createIssueDto);
  }

  @Patch(':issueId')
  @ApiOkResponse({ type: IssueResponseDto })
  @ApiForbiddenResponse({ description: 'Only organization admins and agents can update issues' })
  @ApiNotFoundResponse({ description: 'Issue not found' })
  updateIssue(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('issueId', ParseUUIDPipe) issueId: string,
    @Body() updateIssueDto: UpdateIssueDto,
  ): Promise<IssueResponseDto> {
    return this.issuesService.updateIssue(currentUser, organizationId, issueId, updateIssueDto);
  }

  @Patch(':issueId/status')
  @ApiOkResponse({ type: IssueResponseDto })
  @ApiForbiddenResponse({ description: 'Only organization admins and agents can update issue status' })
  @ApiNotFoundResponse({ description: 'Issue not found' })
  updateIssueStatus(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('issueId', ParseUUIDPipe) issueId: string,
    @Body() updateIssueStatusDto: UpdateIssueStatusDto,
  ): Promise<IssueResponseDto> {
    return this.issuesService.updateIssueStatus(currentUser, organizationId, issueId, updateIssueStatusDto);
  }

  @Post(':issueId/retry-ai-analysis')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiAcceptedResponse({ type: IssueResponseDto })
  @ApiForbiddenResponse({ description: 'Only organization admins and agents can retry issue AI analysis' })
  @ApiNotFoundResponse({ description: 'Issue not found' })
  @ApiConflictResponse({ description: 'Issue AI analysis is already processing' })
  retryIssueAnalysis(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('issueId', ParseUUIDPipe) issueId: string,
  ): Promise<IssueResponseDto> {
    return this.issuesService.retryIssueAnalysis(currentUser, organizationId, issueId);
  }
}
