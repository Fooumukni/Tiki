import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from './authenticated-user.interface';
import { AuthenticatedUserResponseDto } from './dto/authenticated-user-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: AuthenticatedUserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid Keycloak access token' })
  getCurrentUser(@CurrentUser() currentUser: AuthenticatedUser): AuthenticatedUserResponseDto {
    return {
      id: currentUser.id,
      keycloakUserId: currentUser.keycloakUserId,
      email: currentUser.email,
      fullName: currentUser.fullName,
      memberships: currentUser.memberships,
    };
  }
}
