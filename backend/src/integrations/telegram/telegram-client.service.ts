import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../../config/environment.validation';

@Injectable()
export class TelegramClientService {
  constructor(private readonly configService: ConfigService<EnvironmentVariables, true>) {}

  async sendMessage(chatId: string, text: string): Promise<void> {
    const token = this.getBotToken();
    let response: Response;

    try {
      response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
        }),
      });
    } catch {
      throw new ServiceUnavailableException('Telegram sendMessage request failed');
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(`Telegram sendMessage failed with status ${response.status}`);
    }
  }

  private getBotToken(): string {
    const token = this.configService.get('TELEGRAM_BOT_TOKEN', { infer: true });

    if (!token || token.trim().length === 0) {
      throw new ServiceUnavailableException('Telegram bot token is not configured');
    }

    return token;
  }
}
