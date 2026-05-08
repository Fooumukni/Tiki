import { ApiProperty } from '@nestjs/swagger';

export class PublicIssueCreatedResponseDto {
  @ApiProperty({ example: 'ISSUE-00003' })
  code!: string;

  @ApiProperty({ example: 'Your issue was created successfully' })
  message!: string;
}
