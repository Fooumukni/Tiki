import { ApiProperty } from '@nestjs/swagger';

export class TelegramWebhookResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;
}
