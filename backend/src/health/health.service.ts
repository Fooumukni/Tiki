import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../queues/redis.service';
import { HealthResponseDto } from './dto/health-response.dto';

@Injectable()
export class HealthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async getHealth(): Promise<HealthResponseDto> {
    await this.prismaService.$queryRaw`SELECT 1`;
    await this.redisService.ping();

    return {
      status: 'up',
      dependencies: {
        database: 'up',
        redis: 'up',
      },
    };
  }
}
