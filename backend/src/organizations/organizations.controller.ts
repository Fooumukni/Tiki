import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddOrganizationMemberDto } from './dto/add-organization-member.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationMemberResponseDto } from './dto/organization-member-response.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { UpdateOrganizationMemberRoleDto } from './dto/update-organization-member-role.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid Keycloak access token' })
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiCreatedResponse({ type: OrganizationResponseDto })
  @ApiConflictResponse({ description: 'Organization slug could not be generated' })
  createOrganization(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createOrganizationDto: CreateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.createOrganization(currentUser, createOrganizationDto);
  }

  @Get()
  @ApiOkResponse({ type: [OrganizationResponseDto] })
  listOrganizations(@CurrentUser() currentUser: AuthenticatedUser): Promise<OrganizationResponseDto[]> {
    return this.organizationsService.listOrganizations(currentUser);
  }

  @Get(':id')
  @ApiOkResponse({ type: OrganizationResponseDto })
  @ApiForbiddenResponse({ description: 'User is not a member of this organization' })
  getOrganization(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) organizationId: string,
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.getOrganization(currentUser, organizationId);
  }

  @Patch(':id')
  @ApiOkResponse({ type: OrganizationResponseDto })
  @ApiForbiddenResponse({ description: 'Only organization admins can update organizations' })
  updateOrganization(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) organizationId: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.updateOrganization(currentUser, organizationId, updateOrganizationDto);
  }

  @Get(':id/members')
  @ApiOkResponse({ type: [OrganizationMemberResponseDto] })
  @ApiForbiddenResponse({ description: 'Only organization admins can list members' })
  listOrganizationMembers(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) organizationId: string,
  ): Promise<OrganizationMemberResponseDto[]> {
    return this.organizationsService.listOrganizationMembers(currentUser, organizationId);
  }

  @Post(':id/members')
  @ApiCreatedResponse({ type: OrganizationMemberResponseDto })
  @ApiForbiddenResponse({ description: 'Only organization admins can add members' })
  @ApiNotFoundResponse({ description: 'User profile not found for email' })
  @ApiConflictResponse({ description: 'User is already an organization member' })
  addOrganizationMember(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) organizationId: string,
    @Body() addOrganizationMemberDto: AddOrganizationMemberDto,
  ): Promise<OrganizationMemberResponseDto> {
    return this.organizationsService.addOrganizationMember(currentUser, organizationId, addOrganizationMemberDto);
  }

  @Patch(':id/members/:memberId/role')
  @ApiOkResponse({ type: OrganizationMemberResponseDto })
  @ApiForbiddenResponse({ description: 'Only organization admins can update member roles' })
  @ApiNotFoundResponse({ description: 'Organization member not found' })
  updateOrganizationMemberRole(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) organizationId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() updateOrganizationMemberRoleDto: UpdateOrganizationMemberRoleDto,
  ): Promise<OrganizationMemberResponseDto> {
    return this.organizationsService.updateOrganizationMemberRole(
      currentUser,
      organizationId,
      memberId,
      updateOrganizationMemberRoleDto,
    );
  }
}

