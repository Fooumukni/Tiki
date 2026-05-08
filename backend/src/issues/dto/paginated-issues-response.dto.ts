import { ApiProperty } from '@nestjs/swagger';
import { IssueResponseDto } from './issue-response.dto';

export class PaginatedIssuesResponseDto {
  @ApiProperty({ type: [IssueResponseDto] })
  items!: IssueResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}
