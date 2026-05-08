import { ApiProperty } from '@nestjs/swagger';
import { IssueStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateIssueStatusDto {
  @ApiProperty({ enum: IssueStatus, example: IssueStatus.IN_PROGRESS })
  @IsEnum(IssueStatus)
  status!: IssueStatus;
}
