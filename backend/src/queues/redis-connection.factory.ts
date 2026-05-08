import { RedisOptions } from 'ioredis';

export interface RedisConnectionSettings {
  redisHost?: string;
  redisPort?: number;
  redisPassword?: string;
  redisUrl?: string;
}

export function redisConnectionFactory(settings: RedisConnectionSettings): RedisOptions {
  if (settings.redisHost) {
    return {
      host: settings.redisHost,
      port: settings.redisPort ?? 6379,
      password: normalizeOptionalString(settings.redisPassword),
      maxRetriesPerRequest: null,
    };
  }

  const parsedUrl = new URL(settings.redisUrl ?? 'redis://localhost:6379');

  return {
    host: parsedUrl.hostname,
    port: Number(parsedUrl.port || 6379),
    username: parsedUrl.username || undefined,
    password: parsedUrl.password || undefined,
    db: parsedUrl.pathname ? Number(parsedUrl.pathname.replace('/', '') || 0) : 0,
    maxRetriesPerRequest: null,
  };
}

function normalizeOptionalString(value?: string): string | undefined {
  if (!value || value.trim().length === 0) {
    return undefined;
  }

  return value;
}
