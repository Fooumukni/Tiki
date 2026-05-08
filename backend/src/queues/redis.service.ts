import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { redisConnectionFactory } from './redis-connection.factory';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis({
      ...redisConnectionFactory({
        redisHost: this.configService.get<string>('REDIS_HOST'),
        redisPort: this.configService.get<number>('REDIS_PORT'),
        redisPassword: this.configService.get<string>('REDIS_PASSWORD'),
        redisUrl: this.configService.get<string>('REDIS_URL'),
      }),
      lazyConnect: true,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }
}
