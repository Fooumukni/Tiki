export interface TelegramUser {
  id: number;
  firstName?: string;
  lastName?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type?: string;
}

export interface TelegramMessage {
  messageId: number;
  chat: TelegramChat;
  from?: TelegramUser;
  text?: string;
}
