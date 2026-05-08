import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiAnalysisStatus, IssuePriority, IssueStatus, SenderType, Sentiment, SourceChannel } from '@prisma/client';

export class IssueRequesterResponseDto {
  @ApiProperty({ example: '8b6ad4a0-0521-43f6-bda1-8324108d8818' })
  id!: string;

  @ApiProperty({ example: 'Jane Customer' })
  name!: string;

  @ApiPropertyOptional({ example: 'jane.customer@example.com', nullable: true })
  email!: string | null;
}

export class IssueMessageResponseDto {
  @ApiProperty({ example: '8b6ad4a0-0521-43f6-bda1-8324108d8818' })
  id!: string;

  @ApiProperty({ enum: SenderType, example: SenderType.REQUESTER })
  senderType!: SenderType;

  @ApiPropertyOptional({ example: 'Jane Customer', nullable: true })
  senderName!: string | null;

  @ApiProperty({ example: 'I receive an error when I try to open billing settings.' })
  content!: string;

  @ApiProperty({ enum: SourceChannel, example: SourceChannel.DASHBOARD })
  sourceChannel!: SourceChannel;

  @ApiProperty({ example: '2026-05-07T01:00:00.000Z' })
  createdAt!: Date;
}

export class IssueResponseDto {
  @ApiProperty({ example: '8b6ad4a0-0521-43f6-bda1-8324108d8818' })
  id!: string;

  @ApiProperty({ example: '8b6ad4a0-0521-43f6-bda1-8324108d8818' })
  organizationId!: string;

  @ApiPropertyOptional({ example: '8b6ad4a0-0521-43f6-bda1-8324108d8818', nullable: true })
  requesterId!: string | null;

  @ApiProperty({ example: 'ISSUE-00001' })
  code!: string;

  @ApiProperty({ example: 'Cannot access billing settings' })
  title!: string;

  @ApiProperty({ example: 'I receive an error when I try to open billing settings.' })
  originalDescription!: string;

  @ApiPropertyOptional({ example: 'Billing settings unavailable', nullable: true })
  generatedTitle!: string | null;

  @ApiPropertyOptional({ example: 'The customer cannot open billing settings.', nullable: true })
  summary!: string | null;

  @ApiPropertyOptional({ example: 'Billing', nullable: true })
  category!: string | null;

  @ApiProperty({ enum: IssuePriority, example: IssuePriority.MEDIUM })
  priority!: IssuePriority;

  @ApiPropertyOptional({ enum: Sentiment, nullable: true })
  sentiment!: Sentiment | null;

  @ApiPropertyOptional({ example: 'Billing Support', nullable: true })
  suggestedTeam!: string | null;

  @ApiPropertyOptional({ example: 'We are checking the billing settings issue.', nullable: true })
  suggestedResponse!: string | null;

  @ApiProperty({ example: ['login', 'backend'] })
  tags!: string[];

  @ApiProperty({ enum: SourceChannel, example: SourceChannel.DASHBOARD })
  sourceChannel!: SourceChannel;

  @ApiProperty({ enum: IssueStatus, example: IssueStatus.NEW })
  status!: IssueStatus;

  @ApiProperty({ enum: AiAnalysisStatus, example: AiAnalysisStatus.PENDING })
  aiAnalysisStatus!: AiAnalysisStatus;

  @ApiPropertyOptional({ type: IssueRequesterResponseDto, nullable: true })
  requester!: IssueRequesterResponseDto | null;

  @ApiPropertyOptional({ type: [IssueMessageResponseDto] })
  messages?: IssueMessageResponseDto[];

  @ApiProperty({ example: '2026-05-07T01:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-07T01:00:00.000Z' })
  updatedAt!: Date;

  @ApiPropertyOptional({ example: '2026-05-07T01:00:00.000Z', nullable: true })
  resolvedAt!: Date | null;
}
