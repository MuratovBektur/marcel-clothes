import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectBot } from 'nestjs-telegraf';
import { Context, Markup, Telegraf } from 'telegraf';
import { BotAuthorizedUser } from '../../entities/bot-authorized-user.entity';
import { ChatThread } from '../../entities/chat-thread.entity';
import { ChatService } from './chat.service';

@Injectable()
export class ChatNotifyService {
  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    @InjectRepository(BotAuthorizedUser)
    private readonly adminRepo: Repository<BotAuthorizedUser>,
    private readonly chatService: ChatService,
  ) {}

  async notifyNewThread(thread: ChatThread, text: string): Promise<void> {
    const caption =
      `💬 *Новое сообщение с сайта*\n\n` +
      `👤 *Имя:* ${thread.name}\n` +
      `📞 *Телефон:* ${thread.phone}\n\n` +
      `✉️ ${text}`;
    await this.broadcastWithClaim(thread.id, caption);
  }

  async notifyNewMessage(thread: ChatThread, text: string): Promise<void> {
    if (thread.claimedBy != null) {
      const caption = `💬 *${thread.name}* (${thread.phone}):\n\n${text}`;
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('💬 Ответить', `chat_focus:${thread.id}`),
          Markup.button.callback('🔚 Завершить диалог', `chat_end:${thread.id}`),
        ],
      ]);
      await this.sendToAdmin(thread.id, Number(thread.claimedBy), caption, keyboard);
      return;
    }
    const caption =
      `💬 *Новое сообщение с сайта*\n\n` +
      `👤 *Имя:* ${thread.name}\n` +
      `📞 *Телефон:* ${thread.phone}\n\n` +
      `✉️ ${text}`;
    await this.broadcastWithClaim(thread.id, caption);
  }

  /** Сообщает оператору, что клиент закрыл/перезагрузил вкладку и диалог завершён. */
  async notifyThreadClosed(thread: ChatThread): Promise<void> {
    if (thread.claimedBy == null) return;
    const text = `💬 ${thread.name} (${thread.phone})\n\n🚪 Клиент закрыл чат. Диалог завершён.`;
    try {
      await this.bot.telegram.sendMessage(Number(thread.claimedBy), text);
    } catch {
      // admin may have blocked the bot
    }
  }

  /** Удаляет приглашения у всех остальных операторов, после того как один из них забрал диалог. */
  async markClaimedForOthers(threadId: string, claimerId: number): Promise<void> {
    const refs = await this.chatService.getTelegramRefs(threadId);
    for (const ref of refs) {
      const chatId = Number(ref.telegramChatId);
      if (chatId === claimerId) continue;
      try {
        await this.bot.telegram.deleteMessage(chatId, ref.telegramMessageId);
      } catch {
        // сообщение уже удалено или слишком старое для удаления — игнорируем
      }
    }
  }

  private async broadcastWithClaim(threadId: string, text: string): Promise<void> {
    const admins = await this.adminRepo.find();
    if (!admins.length) return;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('✅ Ответить', `chat_claim:${threadId}`)],
    ]);

    for (const admin of admins) {
      try {
        const msg = await this.bot.telegram.sendMessage(Number(admin.telegramId), text, {
          parse_mode: 'Markdown',
          ...keyboard,
        });
        await this.chatService.saveTelegramRef(threadId, msg.chat.id, msg.message_id);
      } catch {
        // admin may have blocked the bot
      }
    }
  }

  private async sendToAdmin(
    threadId: string,
    telegramId: number,
    text: string,
    keyboard?: ReturnType<typeof Markup.inlineKeyboard>,
  ): Promise<void> {
    try {
      const msg = await this.bot.telegram.sendMessage(telegramId, text, {
        parse_mode: 'Markdown',
        ...keyboard,
      });
      await this.chatService.saveTelegramRef(threadId, msg.chat.id, msg.message_id);
    } catch {
      // admin may have blocked the bot
    }
  }
}
