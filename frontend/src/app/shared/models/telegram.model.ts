export interface TelegramConnection {
  id: string;
  channel: 'TELEGRAM';
  isActive: boolean;
  isLinked: boolean;
  botUsername: string;
  link: string | null;
  linkedChatId: string | null;
  linkedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
