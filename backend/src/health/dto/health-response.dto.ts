import { ApiProperty } from '@nestjs/swagger';

class DependencyHealthDto {
  @ApiProperty({ example: 'up' })
  database!: string;

  @ApiProperty({ example: 'up' })
  redis!: string;
}

export class HealthResponseDto {
  @ApiProperty({ example: 'up' })
  status!: string;

  @ApiProperty({ type: DependencyHealthDto })
  dependencies!: DependencyHealthDto;
}

