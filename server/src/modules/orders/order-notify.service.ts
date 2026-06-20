import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { Context, Markup } from 'telegraf';
import { BotAuthorizedUser } from '../../entities/bot-authorized-user.entity';
import { Order } from '../../entities/order.entity';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class OrderNotifyService {
  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    @InjectRepository(BotAuthorizedUser)
    private readonly adminRepo: Repository<BotAuthorizedUser>,
    private readonly chatService: ChatService,
  ) {}

  async notifyNewOrder(order: Order): Promise<void> {
    const admins = await this.adminRepo.find();
    if (!admins.length) return;

    const itemLines = order.items
      .map((it) => `• ${it.productType} × ${it.qty} — ${it.price}`)
      .join('\n');

    const text =
      `🛍 *Новый заказ #${order.id.slice(0, 8)}*\n\n` +
      `👤 *Клиент:* ${order.customerName}\n` +
      `📞 *Телефон:* ${order.customerPhone}\n\n` +
      `📦 *Товары:*\n${itemLines}\n\n` +
      `💰 *Итого:* ${order.total}`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🖼 Посмотреть товары', `order_items:${order.id}:0`)],
    ]);

    for (const admin of admins) {
      // Не отвлекаем оператора, который сейчас ведёт диалог с клиентом в чате.
      if (await this.chatService.isHandlingChat(Number(admin.telegramId))) continue;
      try {
        await this.bot.telegram.sendMessage(Number(admin.telegramId), text, {
          parse_mode: 'Markdown',
          ...keyboard,
        });
      } catch {
        // admin may have blocked the bot
      }
    }
  }
}
