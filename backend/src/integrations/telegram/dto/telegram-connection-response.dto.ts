import { ApiProperty } from '@nestjs/swagger';
import { ChannelType } from '@prisma/client';

export class TelegramConnectionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ChannelType, example: ChannelType.TELEGRAM })
  channel!: ChannelType;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  isLinked!: boolean;

  @ApiProperty({ example: 'ai_issue_intake_bot' })
  botUsername!: string;

  @ApiProperty({ nullable: true, example: 'https://t.me/ai_issue_intake_bot?start=secret-code' })
  link!: string | null;

  @ApiProperty({ nullable: true, example: '123456789' })
  linkedChatId!: string | null;

  @ApiProperty({ nullable: true })
  linkedAt!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
