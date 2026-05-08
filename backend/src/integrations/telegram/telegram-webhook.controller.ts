import { Body, Controller, Headers, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { TelegramWebhookResponseDto } from './dto/telegram-webhook-response.dto';
import { TelegramService } from './telegram.service';

@ApiTags('telegram-integrations')
@Controller('integrations/telegram')
export class TelegramWebhookController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOkResponse({ type: TelegramWebhookResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid Telegram webhook secret' })
  @ApiTooManyRequestsResponse({ description: 'Too many Telegram webhook requests' })
  handleWebhook(
    @Headers('x-telegram-bot-api-secret-token') webhookSecret: string | undefined,
    @Body() payload: unknown,
  ): Promise<TelegramWebhookResponseDto> {
    return this.telegramService.handleWebhook(webhookSecret, payload);
  }
}
