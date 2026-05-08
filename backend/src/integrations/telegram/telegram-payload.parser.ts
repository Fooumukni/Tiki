import { TelegramChat, TelegramMessage, TelegramUser } from './types/telegram-message.interface';

export function parseTelegramMessage(payload: unknown): TelegramMessage | null {
  if (!isRecord(payload)) {
    return null;
  }

  const message = payload.message;
  if (!isRecord(message)) {
    return null;
  }

  const messageId = readNumber(message.message_id);
  const chat = parseTelegramChat(message.chat);

  if (messageId === null || chat === null) {
    return null;
  }

  return {
    messageId,
    chat,
    from: parseTelegramUser(message.from),
    text: readString(message.text),
  };
}

function parseTelegramChat(value: unknown): TelegramChat | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readNumber(value.id);
  if (id === null) {
    return null;
  }

  return {
    id,
    type: readString(value.type),
  };
}

function parseTelegramUser(value: unknown): TelegramUser | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = readNumber(value.id);
  if (id === null) {
    return undefined;
  }

  return {
    id,
    firstName: readString(value.first_name),
    lastName: readString(value.last_name),
    username: readString(value.username),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
