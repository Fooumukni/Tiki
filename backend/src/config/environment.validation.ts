import { plainToInstance, Transform } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Max, Min, validateSync } from 'class-validator';
import { AiProviderName } from '../ai/types/ai-provider-name.enum';

export enum NodeEnvironment {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

export class EnvironmentVariables {
  @IsEnum(NodeEnvironment)
  NODE_ENV: NodeEnvironment = NodeEnvironment.Development;

  @Transform(({ value }: { value?: string | number }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    return Number(value);
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  BACKEND_PORT?: number;

  @Transform(({ value }: { value: string }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(65535)
  APP_PORT = 3000;

  @IsString()
  @IsNotEmpty()
  APP_CORS_ORIGIN = 'http://localhost:4200';

  @IsUrl({ require_tld: false })
  APP_BASE_URL = 'http://localhost:3000';

  @IsUrl({ require_tld: false })
  FRONTEND_URL = 'http://localhost:4210';

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  REDIS_HOST = 'localhost';

  @Transform(({ value }: { value?: string | number }) => {
    if (value === undefined || value === null || value === '') {
      return 6379;
    }

    return Number(value);
  })
  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT = 6379;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  @IsOptional()
  @IsString()
  REDIS_URL?: string;

  @IsUrl({ require_tld: false })
  KEYCLOAK_BASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  KEYCLOAK_REALM!: string;

  @IsUrl({ require_tld: false })
  KEYCLOAK_ISSUER_URL!: string;

  @IsUrl({ require_tld: false })
  KEYCLOAK_JWKS_URI!: string;

  @IsString()
  @IsNotEmpty()
  KEYCLOAK_FRONTEND_CLIENT_ID = 'tiki-frontend';

  @IsString()
  @IsNotEmpty()
  KEYCLOAK_BACKEND_CLIENT_ID = 'tiki-api';

  @IsString()
  @IsNotEmpty()
  KEYCLOAK_AUDIENCE = 'tiki-api';

  @Transform(({ value }: { value?: string }) => (value && value.trim().length > 0 ? value.trim() : AiProviderName.Mock))
  @IsEnum(AiProviderName)
  AI_PROVIDER: AiProviderName = AiProviderName.Mock;

  @IsOptional()
  @IsString()
  OPENAI_API_KEY?: string;

  @Transform(({ value }: { value?: string }) => (value && value.trim().length > 0 ? value.trim() : 'gpt-4.1-mini'))
  @IsString()
  @IsNotEmpty()
  OPENAI_MODEL = 'gpt-4.1-mini';

  @IsOptional()
  @IsString()
  GEMINI_API_KEY?: string;

  @Transform(({ value }: { value?: string }) => (value && value.trim().length > 0 ? value.trim() : 'gemini-2.0-flash'))
  @IsString()
  @IsNotEmpty()
  GEMINI_MODEL = 'gemini-2.0-flash';

  @Transform(({ value }: { value?: string | number }) => {
    if (value === undefined || value === null || value === '') {
      return 30000;
    }

    return Number(value);
  })
  @IsInt()
  @Min(1000)
  @Max(120000)
  AI_TIMEOUT_MS = 30000;

  @IsOptional()
  @IsString()
  TELEGRAM_BOT_TOKEN?: string;

  @IsOptional()
  @IsString()
  TELEGRAM_WEBHOOK_SECRET?: string;

  @IsOptional()
  @IsString()
  TELEGRAM_BOT_USERNAME?: string;
}

export function environmentValidation(configuration: Record<string, unknown>): EnvironmentVariables {
  const validatedConfiguration = plainToInstance(EnvironmentVariables, configuration, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfiguration, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfiguration;
}
