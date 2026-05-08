import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TelegramConnectionResponseDto } from './dto/telegram-connection-response.dto';
import { TelegramService } from './telegram.service';

@ApiTags('telegram-integrations')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid Keycloak access token' })
@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/integrations/telegram/connections')
export class TelegramConnectionsController {
  constructor(private readonly telegramService: TelegramService) {}

  @Get()
  @ApiOkResponse({ type: [TelegramConnectionResponseDto] })
  @ApiForbiddenResponse({ description: 'Only organization admins can list Telegram connections' })
  listConnections(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<TelegramConnectionResponseDto[]> {
    return this.telegramService.listConnections(currentUser, organizationId);
  }

  @Post()
  @ApiCreatedResponse({ type: TelegramConnectionResponseDto })
  @ApiForbiddenResponse({ description: 'Only organization admins can create Telegram connections' })
  createConnection(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<TelegramConnectionResponseDto> {
    return this.telegramService.createConnection(currentUser, organizationId);
  }
}
