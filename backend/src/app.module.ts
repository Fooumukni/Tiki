import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { environmentValidation } from './config/environment.validation';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { IssuesModule } from './issues/issues.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PrismaModule } from './prisma/prisma.module';
import { PublicReportModule } from './public-report/public-report.module';
import { redisConnectionFactory } from './queues/redis-connection.factory';
import { RedisModule } from './queues/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
      validate: environmentValidation,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        redact: ['req.headers.authorization', 'req.headers.x-telegram-bot-api-secret-token'],
      },
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: redisConnectionFactory({
          redisHost: configService.get<string>('REDIS_HOST'),
          redisPort: configService.get<number>('REDIS_PORT'),
          redisPassword: configService.get<string>('REDIS_PASSWORD'),
          redisUrl: configService.get<string>('REDIS_URL'),
        }),
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    RedisModule,
    AuthModule,
    OrganizationsModule,
    IssuesModule,
    IntegrationsModule,
    PublicReportModule,
    HealthModule,
  ],
  providers: [HttpExceptionFilter],
})
export class AppModule {}
