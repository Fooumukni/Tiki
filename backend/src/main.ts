import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { EnvironmentVariables, NodeEnvironment } from './config/environment.validation';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService<EnvironmentVariables, true>);
  const expressInstance = app.getHttpAdapter().getInstance() as { disable: (setting: string) => void };

  app.useLogger(app.get(Logger));
  expressInstance.disable('etag');
  app.use(helmet());
  app.setGlobalPrefix('api');
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (request.path.startsWith('/api')) {
      response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.setHeader('Pragma', 'no-cache');
      response.setHeader('Expires', '0');
      response.setHeader('Surrogate-Control', 'no-store');
    }

    next();
  });
  const configuredOrigins = [
    configService.get('FRONTEND_URL', { infer: true }),
    ...configService
      .get('APP_CORS_ORIGIN', { infer: true })
      .split(',')
      .map((origin) => origin.trim()),
  ].filter((origin) => origin.length > 0);
  const corsOrigins = Array.from(new Set(configuredOrigins));

  if (configService.get('NODE_ENV', { infer: true }) === NodeEnvironment.Production && corsOrigins.includes('*')) {
    throw new Error('Wildcard CORS origin is not allowed in production');
  }

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(app.get(HttpExceptionFilter));

  const openApiConfig = new DocumentBuilder()
    .setTitle('Tiki API')
    .setDescription('API for the Tiki AI-powered multichannel issue intake platform.')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(configService.get('BACKEND_PORT', { infer: true }) ?? configService.get('APP_PORT', { infer: true }));
}

void bootstrap();
