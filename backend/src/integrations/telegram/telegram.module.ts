import { Module } from '@nestjs/common';
import { AiModule } from '../../ai/ai.module';
import { IssuesModule } from '../../issues/issues.module';
import { MembershipsModule } from '../../memberships/memberships.module';
import { TelegramClientService } from './telegram-client.service';
import { TelegramConnectionsController } from './telegram-connections.controller';
import { TelegramWebhookController } from './telegram-webhook.controller';
import { TelegramService } from './telegram.service';

@Module({
  imports: [IssuesModule, MembershipsModule, AiModule],
  controllers: [TelegramConnectionsController, TelegramWebhookController],
  providers: [TelegramService, TelegramClientService],
})
export class TelegramModule {}
