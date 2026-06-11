import * as fs from 'fs';
import * as path from 'path';
import {
  Start,
  Update,
  Command,
  Ctx,
  InjectBot,
  Hears,
  Action,
  On,
} from 'nestjs-telegraf';
import { OnModuleInit } from '@nestjs/common';
import { Context, Markup, Telegraf } from 'telegraf';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';
import { AuthService } from './auth.service';
import { GroupService } from './group.service';
import { TgGroupService } from './messaging.service';
import { WaService } from './wa.service';
import { BOT_COMMANDS, CLOTHING_WIZARD_ID, EDIT_SCENE_ID, MAIN_KEYBOARD } from './constants';

@Update()
export class TelegramBotUpdate implements OnModuleInit {
  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly productsService: ProductsService,
    private readonly ordersService: OrdersService,
    private readonly authService: AuthService,
    private readonly groupService: GroupService,
    private readonly tgGroupService: TgGroupService,
    private readonly waService: WaService,
  ) {}

  async onModuleInit() {
    try {
      await this.bot.telegram.deleteMyCommands({});
      await this.bot.telegram.setMyCommands(BOT_COMMANDS);
    } catch (err) {
      console.warn('[TelegramBot] Could not register commands (Telegram unreachable):', (err as Error).message);
    }
  }

  // ─── Старт ────────────────────────────────────────────────────────────────────
  @Start()
  async onStart(@Ctx() ctx: any) {
    if (ctx.scene?.current) await ctx.scene.leave();

    if (this.authService.isAuthorized(ctx.from.id)) {
      await ctx.reply('👗 *Optom Store Bot*\n\nВыберите действие:', {
        parse_mode: 'Markdown',
        reply_markup: MAIN_KEYBOARD,
      });
      return;
    }

    await ctx.reply('👋 Для входа поделитесь своим номером телефона:', {
      reply_markup: {
        keyboard: [[{ text: '📱 Поделиться номером', request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }

  // ─── Контакт: авторизация ─────────────────────────────────────────────────────
  @On('contact')
  async onContact(@Ctx() ctx: any) {
    const contact = ctx.message?.contact;
    if (!contact) return;
    const authorized = await this.authService.checkAndAuthorize(contact.phone_number, ctx.from.id);
    if (authorized) {
      await ctx.reply('✅ *Доступ разрешён!*\n\nВыберите действие:', {
        parse_mode: 'Markdown',
        reply_markup: MAIN_KEYBOARD,
      });
    } else {
      await ctx.reply(
        '⛔ *Доступ запрещён*\n\nВаш номер не найден или нет активного бренда.\nОбратитесь к администратору.',
        { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } },
      );
    }
  }

  // ─── Главная клавиатура ───────────────────────────────────────────────────────
  @Hears('➕ Добавить товар')
  async onAddButton(@Ctx() ctx: any) {
    if (!this.authService.isAuthorized(ctx.from.id)) return this.requestAuth(ctx);
    return this.onAdd(ctx);
  }

  @Hears('📋 Список товаров')
  async onListButton(@Ctx() ctx: any) {
    if (!this.authService.isAuthorized(ctx.from.id)) return this.requestAuth(ctx);
    return this.onList(ctx);
  }

  @Hears('📦 Список заказов')
  async onOrdersButton(@Ctx() ctx: any) {
    if (!this.authService.isAuthorized(ctx.from.id)) return this.requestAuth(ctx);
    await this.renderOrderCard(ctx, 0, false);
  }

  @Hears('⚙️ Настройки')
  async onSettingsButton(@Ctx() ctx: any) {
    if (!this.authService.isAuthorized(ctx.from.id)) return this.requestAuth(ctx);
    await ctx.reply('⚙️ *Настройки*', {
      parse_mode: 'Markdown',
      ...this.settingsMainKeyboard(),
    });
  }

  // ═══ Настройки: навигация (inline) ═══════════════════════════════════════════

  @Action('stg:main')
  async onStgMain(@Ctx() ctx: any) {
    await ctx.answerCbQuery();
    await ctx.editMessageText('⚙️ *Настройки*', {
      parse_mode: 'Markdown',
      ...this.settingsMainKeyboard(),
    });
  }

  // ─── Раздел Доступ ────────────────────────────────────────────────────────────
  @Action('stg:access')
  async onStgAccess(@Ctx() ctx: any) {
    await ctx.answerCbQuery();
    const phones = await this.authService.getPhones();
    const text = phones.length
      ? `👥 *Доступ к боту*\n\nРазрешённые номера (${phones.length}):`
      : '👥 *Доступ к боту*\n\n_Список номеров пуст_';

    const phoneRows = phones.map((p) =>
      [Markup.button.callback(
        `🗑 ${p.label ? p.label + ' — ' : ''}+${p.phone}`,
        `stg:access_remove:${p.phone}`,
      )],
    );
    phoneRows.push([
      Markup.button.callback('➕ Добавить номер', 'stg:access_add'),
      Markup.button.callback('◀️ Назад', 'stg:main'),
    ]);

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(phoneRows),
    });
  }

  @Action('stg:access_add')
  async onStgAccessAdd(@Ctx() ctx: any) {
    await ctx.answerCbQuery();
    ctx.session.awaitingAccessPhone = true;
    await ctx.reply(
      '📱 Введите номер телефона для добавления доступа:\n\n_Пример: +996555123456_\n\n_Можно добавить метку: +996555123456 Имя_',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [[{ text: '❌ Отмена' }]],
          resize_keyboard: true,
        },
      },
    );
  }

  @Action(/^stg:access_remove:(.+)/)
  async onStgAccessRemove(@Ctx() ctx: any) {
    const phone = (ctx.callbackQuery.data as string).replace('stg:access_remove:', '');
    await this.authService.removePhone(phone);
    await ctx.answerCbQuery('✅ Номер удалён');

    const phones = await this.authService.getPhones();
    const text = phones.length
      ? `👥 *Доступ к боту*\n\nРазрешённые номера (${phones.length}):`
      : '👥 *Доступ к боту*\n\n_Список номеров пуст_';

    const phoneRows = phones.map((p) =>
      [Markup.button.callback(
        `🗑 ${p.label ? p.label + ' — ' : ''}+${p.phone}`,
        `stg:access_remove:${p.phone}`,
      )],
    );
    phoneRows.push([
      Markup.button.callback('➕ Добавить номер', 'stg:access_add'),
      Markup.button.callback('◀️ Назад', 'stg:main'),
    ]);

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(phoneRows),
    });
  }

  @Action('stg:pub')
  async onStgPub(@Ctx() ctx: any) {
    await ctx.answerCbQuery();
    await ctx.editMessageText('📢 *Публикация*\n\nВыберите канал:', {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('📱 Telegram', 'stg:tg'),
          Markup.button.callback('💬 WhatsApp', 'stg:wa'),
        ],
        [Markup.button.callback('◀️ Назад', 'stg:main')],
      ]),
    });
  }

  // ─── Раздел Telegram ──────────────────────────────────────────────────────────
  @Action('stg:tg')
  async onStgTg(@Ctx() ctx: any) {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '📱 *Telegram группы*\n\nЗдесь настраиваются группы для автопубликации через бота.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('📋 Список групп', 'stg:tg_list'),
            Markup.button.callback('➕ Добавить группу', 'stg:tg_add'),
          ],
          [Markup.button.callback('◀️ Назад', 'stg:pub')],
        ]),
      },
    );
  }

  @Action('stg:tg_list')
  async onStgTgList(@Ctx() ctx: any) {
    await ctx.answerCbQuery();
    const chatId = await this.groupService.get(ctx.from.id);
    const title = await this.groupService.getTitle(ctx.from.id);

    const text = chatId
      ? `📱 *Telegram группы*\n\n✅ Настроена группа:\n*${title ?? 'без названия'}* (\`${chatId}\`)`
      : '📱 *Telegram группы*\n\n_Группа не настроена_';

    const buttons: ReturnType<typeof Markup.button.callback>[][] = [];
    if (chatId) {
      buttons.push([Markup.button.callback('🗑 Удалить группу', 'stg:tg_remove')]);
    }
    buttons.push([Markup.button.callback('◀️ Назад', 'stg:tg')]);

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons),
    });
  }

  @Action('stg:tg_remove')
  async onStgTgRemove(@Ctx() ctx: any) {
    await this.groupService.remove(ctx.from.id);
    await ctx.answerCbQuery('✅ Группа удалена');
    await ctx.editMessageText('📱 *Telegram группы*\n\n_Группа не настроена_', {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('➕ Добавить группу', 'stg:tg_add')],
        [Markup.button.callback('◀️ Назад', 'stg:tg')],
      ]),
    });
  }

  @Action('stg:tg_add')
  async onStgTgAdd(@Ctx() ctx: any) {
    await ctx.answerCbQuery();
    ctx.session.awaitingGroupUsername = true;
    await ctx.reply(
      '📢 Введите юзернейм Telegram группы или канала:\n\n_Пример: @mygroup_',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [[{ text: '❌ Отмена' }]],
          resize_keyboard: true,
        },
      },
    );
  }

  // ─── Раздел WhatsApp ─────────────────────────────────────────────────────────
  @Action('stg:wa')
  async onStgWa(@Ctx() ctx: any) {
    await ctx.answerCbQuery();
    const isAuth = this.waService.isAuthenticated(ctx.from.id);
    const savedGroup = await this.waService.getSavedGroup(ctx.from.id);

    let text = '💬 *WhatsApp группы*\n\n';
    text += isAuth ? '🟢 WhatsApp подключён\n' : '🔴 WhatsApp не подключён\n';
    text += savedGroup
      ? `✅ Группа: *${savedGroup.waGroupName ?? savedGroup.waGroupId}*`
      : '_Группа не настроена_';

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('📋 Список групп', 'stg:wa_list'),
          Markup.button.callback('➕ Добавить группу', 'stg:wa_add'),
        ],
        [Markup.button.callback('◀️ Назад', 'stg:pub')],
      ]),
    });
  }

  @Action('stg:wa_list')
  async onStgWaList(@Ctx() ctx: any) {
    await ctx.answerCbQuery();
    const savedGroup = await this.waService.getSavedGroup(ctx.from.id);

    const text = savedGroup
      ? `💬 *WhatsApp группы*\n\n✅ Настроена группа:\n*${savedGroup.waGroupName ?? savedGroup.waGroupId}*`
      : '💬 *WhatsApp группы*\n\n_Группа не настроена_';

    const buttons: ReturnType<typeof Markup.button.callback>[][] = [];
    if (savedGroup) {
      buttons.push([Markup.button.callback('🗑 Удалить группу', 'stg:wa_remove')]);
    }
    buttons.push([Markup.button.callback('◀️ Назад', 'stg:wa')]);

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons),
    });
  }

  @Action('stg:wa_remove')
  async onStgWaRemove(@Ctx() ctx: any) {
    await this.waService.removeSavedGroup(ctx.from.id);
    await ctx.answerCbQuery('✅ Группа удалена');
    await ctx.editMessageText('💬 *WhatsApp группы*\n\n_Группа не настроена_', {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('➕ Добавить группу', 'stg:wa_add')],
        [Markup.button.callback('◀️ Назад', 'stg:wa')],
      ]),
    });
  }

  @Action('stg:wa_add')
  async onStgWaAdd(@Ctx() ctx: any) {
    await ctx.answerCbQuery();
    ctx.session.awaitingWaPhone = true;
    await ctx.reply(
      '📱 Введите ваш номер телефона WhatsApp с кодом страны:\n\n_Пример: +996555123456_',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [[{ text: '❌ Отмена' }]],
          resize_keyboard: true,
        },
      },
    );
  }

  @Action(/^stg:wa_pick:(.+)/)
  async onStgWaPick(@Ctx() ctx: any) {
    const groupId = (ctx.callbackQuery.data as string).replace('stg:wa_pick:', '');
    const groups = await this.waService.getAvailableGroups(ctx.from.id);
    const group = groups.find((g) => g.id === groupId);

    if (!group) {
      await ctx.answerCbQuery('❌ Группа не найдена', { show_alert: true });
      return;
    }

    await this.waService.saveGroup(ctx.from.id, group.id, group.name);
    await ctx.answerCbQuery('✅ Группа выбрана!');
    await ctx.editMessageText(
      `✅ *WhatsApp группа выбрана:*\n\n*${group.name}*\n\nТеперь товары можно публиковать в эту группу.`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('◀️ В настройки', 'stg:wa')],
        ]),
      },
    );
  }

  // ─── Команды ──────────────────────────────────────────────────────────────────
  @Command('add')
  async onAdd(@Ctx() ctx: any) {
    if (!this.authService.isAuthorized(ctx.from.id)) return this.requestAuth(ctx);
    try {
      if (!ctx.scene) { await ctx.reply('Ошибка: сцена не инициализирована.'); return; }
      await ctx.scene.enter(CLOTHING_WIZARD_ID);
    } catch (e) {
      console.error('[Bot] Error entering scene:', e);
      await ctx.reply('Ошибка: ' + (e as Error).message);
    }
  }

  @Command('list')
  async onList(@Ctx() ctx: any) {
    if (!this.authService.isAuthorized(ctx.from.id)) return this.requestAuth(ctx);
    await this.renderCard(ctx, 0, false);
  }

  @Command('orders')
  async onOrdersCommand(@Ctx() ctx: any) {
    if (!this.authService.isAuthorized(ctx.from.id)) return this.requestAuth(ctx);
    await this.renderOrderCard(ctx, 0, false);
  }

  @Command('settings')
  async onSettingsCommand(@Ctx() ctx: any) {
    if (!this.authService.isAuthorized(ctx.from.id)) return this.requestAuth(ctx);
    await ctx.reply('⚙️ *Настройки*', {
      parse_mode: 'Markdown',
      ...this.settingsMainKeyboard(),
    });
  }

  // ─── Ввод юзернейма TG-группы и номера WA ────────────────────────────────────
  @On('text')
  async onText(@Ctx() ctx: any) {
    if (ctx.scene?.current) return;

    const text: string = ctx.message?.text ?? '';
    if (text.startsWith('/')) return;

    // ── Ввод номера телефона для доступа к боту ──────────────────────────────
    if (ctx.session?.awaitingAccessPhone) {
      if (text === '❌ Отмена') {
        ctx.session.awaitingAccessPhone = false;
        await ctx.reply('Отменено.', { reply_markup: MAIN_KEYBOARD });
        return;
      }

      // Format: "+996555123456" or "+996555123456 Имя"
      const parts = text.trim().split(/\s+/);
      const rawPhone = parts[0];
      const label = parts.slice(1).join(' ') || undefined;

      const cleanPhone = rawPhone.replace(/\D/g, '');
      if (cleanPhone.length < 7 || cleanPhone.length > 15) {
        await ctx.reply('❗ Введите корректный номер, например: +996555123456');
        return;
      }

      ctx.session.awaitingAccessPhone = false;
      await this.authService.addPhone(cleanPhone, label);
      await ctx.reply(
        `✅ Номер *+${cleanPhone}*${label ? ` (${label})` : ''} добавлен в список доступа.`,
        { parse_mode: 'Markdown', reply_markup: MAIN_KEYBOARD },
      );
      return;
    }

    // ── Ввод номера телефона WhatsApp ─────────────────────────────────────────
    if (ctx.session?.awaitingWaPhone) {
      if (text === '❌ Отмена') {
        ctx.session.awaitingWaPhone = false;
        await ctx.reply('Отменено.', { reply_markup: MAIN_KEYBOARD });
        return;
      }

      const cleanPhone = text.replace(/[^0-9]/g, '');
      if (cleanPhone.length < 7 || cleanPhone.length > 15) {
        await ctx.reply('❗ Введите корректный номер, например: +996555123456');
        return;
      }

      ctx.session.awaitingWaPhone = false;
      await ctx.reply('🔄 Получаю код привязки...', { reply_markup: MAIN_KEYBOARD });

      this.waService
        .initClientWithPairingCode(
          ctx.from.id,
          cleanPhone,
          async (code) => {
            await ctx.reply(
              `🔑 *Ваш код для привязки WhatsApp:*\n\n` +
                `\`${code}\`\n\n` +
                `Введите его в WhatsApp:\n` +
                `*Настройки → Связанные устройства →\nПривязать устройство →\nСвязать по номеру телефона*`,
              { parse_mode: 'Markdown' },
            );
          },
          async () => {
            await ctx.reply('✅ *WhatsApp подключён!* Загружаю список групп...', {
              parse_mode: 'Markdown',
            });
            const groups = await this.waService.getAvailableGroups(ctx.from.id);
            if (!groups.length) {
              await ctx.reply(
                '❌ Группы не найдены.\nУбедитесь, что вы состоите в группах WhatsApp.',
              );
              return;
            }
            const buttons = groups.map((g) => [
              Markup.button.callback(g.name.substring(0, 40), `stg:wa_pick:${g.id}`),
            ]);
            await ctx.reply('📋 *Выберите группу для публикации:*', {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard(buttons),
            });
          },
        )
        .catch(async (e) => {
          console.error('[WA] pairing code error:', e);
          await ctx.reply('❌ Ошибка: ' + (e as Error).message);
        });
      return;
    }

    // ── Ввод юзернейма Telegram группы ───────────────────────────────────────
    if (!ctx.session?.awaitingGroupUsername) return;

    if (text === '❌ Отмена') {
      ctx.session.awaitingGroupUsername = false;
      await ctx.reply('Отменено.', { reply_markup: MAIN_KEYBOARD });
      return;
    }

    const username = text.trim().replace(/^https?:\/\/t\.me\//, '@').replace(/^t\.me\//, '@');
    if (!username.startsWith('@')) {
      await ctx.reply('❗ Введите юзернейм в формате @mygroup');
      return;
    }

    try {
      const chat = await ctx.telegram.getChat(username);
      const chatId = (chat as any).id as number;
      await this.groupService.set(ctx.from.id, chatId, (chat as any).title ?? undefined);
      ctx.session.awaitingGroupUsername = false;
      await ctx.reply(
        `✅ Telegram группа *${(chat as any).title ?? username}* сохранена!`,
        { parse_mode: 'Markdown', reply_markup: MAIN_KEYBOARD },
      );
    } catch {
      await ctx.reply(
        '❌ Не удалось найти группу. Убедитесь, что:\n• Юзернейм написан верно\n• Бот добавлен в группу',
      );
    }
  }

  // ─── Заказы: навигация ────────────────────────────────────────────────────────
  @Action(/^order_nav:(\d+)/)
  async onOrderNav(@Ctx() ctx: any) {
    const offset = parseInt((ctx.callbackQuery.data as string).replace('order_nav:', ''), 10);
    await ctx.answerCbQuery();
    await this.renderOrderCard(ctx, offset, true);
  }

  @Action(/^order_items:([^:]+):(\d+)/)
  async onOrderItems(@Ctx() ctx: any) {
    const [, orderId, idxStr] =
      /^order_items:([^:]+):(\d+)$/.exec(ctx.callbackQuery.data as string) ?? [];
    const idx = parseInt(idxStr, 10);
    await ctx.answerCbQuery();
    await this.renderOrderItemPhoto(ctx, orderId, idx, false);
  }

  @Action(/^oitem_nav:([^:]+):(\d+)/)
  async onOrderItemNav(@Ctx() ctx: any) {
    const [, orderId, idxStr] =
      /^oitem_nav:([^:]+):(\d+)$/.exec(ctx.callbackQuery.data as string) ?? [];
    const idx = parseInt(idxStr, 10);
    await ctx.answerCbQuery();
    await this.renderOrderItemPhoto(ctx, orderId, idx, true);
  }

  @Action(/^oitem_close:(.+)/)
  async onOrderItemClose(@Ctx() ctx: any) {
    await ctx.answerCbQuery();
    try { await ctx.deleteMessage(); } catch { /* ignore */ }
  }

  // ─── Вспомогательный метод: карточка заказа ──────────────────────────────────
  private async renderOrderCard(ctx: any, offset: number, edit: boolean) {
    const { data, total } = await this.ordersService.findAll(offset + 1, 1);

    if (total === 0) {
      const msg = '📦 Заказов пока нет.';
      if (edit) {
        await ctx.editMessageText(msg, { ...Markup.inlineKeyboard([]) });
      } else {
        await ctx.reply(msg, { reply_markup: MAIN_KEYBOARD });
      }
      return;
    }

    const o = data[0];
    const date = o.createdAt.toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
    const itemLines = o.items
      .map((it) => `• ${it.productType} × ${it.qty}`)
      .join('\n');

    const text =
      `📦 *Заказ #${o.id.slice(0, 8)}*\n` +
      `📅 *Дата:* ${date}\n` +
      `💰 *Сумма:* ${o.total}\n` +
      `👤 *Клиент:* ${o.customerName}\n` +
      `📞 *Телефон:* ${o.customerPhone}\n\n` +
      `🛍 *Товары:*\n${itemLines}`;

    const navRow: ReturnType<typeof Markup.button.callback>[] = [];
    if (offset > 0) navRow.push(Markup.button.callback('◀️', `order_nav:${offset - 1}`));
    navRow.push(Markup.button.callback(`${offset + 1} / ${total}`, 'orders_noop'));
    if (offset < total - 1) navRow.push(Markup.button.callback('▶️', `order_nav:${offset + 1}`));

    const keyboard = Markup.inlineKeyboard([
      navRow,
      [Markup.button.callback('🖼 Посмотреть товары', `order_items:${o.id}:0`)],
    ]);

    if (edit) {
      await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard });
    } else {
      await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
    }
  }

  // ─── Вспомогательный метод: фото товара из заказа ────────────────────────────
  private async renderOrderItemPhoto(ctx: any, orderId: string, idx: number, edit: boolean) {
    const order = await this.ordersService.findOne(orderId);
    if (!order) { await ctx.reply('Заказ не найден.'); return; }

    const items = order.items;
    const item = items[idx];
    if (!item) return;

    const caption =
      `🖼 *${item.productType}*\n` +
      `💰 ${item.price}  ×  ${item.qty} шт.\n\n` +
      `${idx + 1} из ${items.length}`;

    const navRow: ReturnType<typeof Markup.button.callback>[] = [];
    if (idx > 0) navRow.push(Markup.button.callback('◀️', `oitem_nav:${orderId}:${idx - 1}`));
    if (idx < items.length - 1) navRow.push(Markup.button.callback('▶️', `oitem_nav:${orderId}:${idx + 1}`));

    const keyboard = Markup.inlineKeyboard([
      navRow,
      [Markup.button.callback('✖ Закрыть', `oitem_close:${orderId}`)],
    ]);

    const photoPath = path.join(process.cwd(), item.photo.replace(/^\//, ''));

    if (edit) {
      try {
        await ctx.editMessageMedia(
          { type: 'photo', media: { source: fs.createReadStream(photoPath) }, caption, parse_mode: 'Markdown' },
          keyboard,
        );
      } catch {
        await ctx.replyWithPhoto(
          { source: fs.createReadStream(photoPath) },
          { caption, parse_mode: 'Markdown', ...keyboard },
        );
      }
    } else {
      await ctx.replyWithPhoto(
        { source: fs.createReadStream(photoPath) },
        { caption, parse_mode: 'Markdown', ...keyboard },
      );
    }
  }

  @Action('orders_noop')
  async onOrdersNoop(@Ctx() ctx: any) { await ctx.answerCbQuery(); }

  private async requestAuth(ctx: any) {
    await ctx.reply('🔒 Сначала пройдите идентификацию. Нажмите /start');
  }

  // ─── Карточки: навигация и действия ──────────────────────────────────────────
  @Action(/^edit_product:(.+)/)
  async onEditProduct(@Ctx() ctx: any) {
    const productId = (ctx.callbackQuery.data as string).replace('edit_product:', '');
    await ctx.answerCbQuery('✏️ Открываю редактор...');
    ctx.session.editProductId = productId;
    await ctx.scene.enter(EDIT_SCENE_ID);
  }

  @Action(/^card_nav:(\d+)/)
  async onCardNav(@Ctx() ctx: any) {
    const offset = parseInt((ctx.callbackQuery.data as string).replace('card_nav:', ''), 10);
    await ctx.answerCbQuery();
    await this.renderCard(ctx, offset, true);
  }

  @Action(/^del_ask:([^:]+):(\d+)/)
  async onDeleteAsk(@Ctx() ctx: any) {
    const [, productId, offsetStr] =
      /^del_ask:([^:]+):(\d+)$/.exec(ctx.callbackQuery.data as string) ?? [];
    const offset = parseInt(offsetStr, 10);
    const product = await this.productsService.findOne(productId);
    await ctx.answerCbQuery();
    if (!product) {
      await this.renderCard(ctx, offset, true);
      return;
    }
    await ctx.editMessageCaption(
      `🗑 *Удалить товар?*\n\n👔 ${product.type}\n💰 Опт: ${product.wholesalePrice ?? '—'} | Розница: ${product.retailPrice ?? '—'}`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('✅ Да, удалить', `del_confirm:${productId}:${offset}`),
            Markup.button.callback('❌ Отмена', `del_cancel:${offset}`),
          ],
        ]),
      },
    );
  }

  @Action(/^del_confirm:([^:]+):(\d+)/)
  async onDeleteConfirm(@Ctx() ctx: any) {
    const [, productId, offsetStr] =
      /^del_confirm:([^:]+):(\d+)$/.exec(ctx.callbackQuery.data as string) ?? [];
    const offset = parseInt(offsetStr, 10);
    const product = await this.productsService.findOne(productId);
    if (product?.publishedPost) {
      await this.tgGroupService.deleteProductCard(
        ctx.telegram, product.publishedPost.chatId, product.publishedPost.messageIds,
      );
    }
    if (product?.publishedWaPost) {
      await this.waService.deleteProductCard(ctx.from.id, product.publishedWaPost).catch(() => {});
    }
    await this.productsService.delete(productId);
    await ctx.answerCbQuery('✅ Удалено!');
    const { meta } = await this.productsService.findAll({ page: 1, limit: 1 });
    const newOffset = offset >= meta.total ? Math.max(0, meta.total - 1) : offset;
    await this.renderCard(ctx, newOffset, true);
  }

  @Action(/^del_cancel:(\d+)/)
  async onDeleteCancel(@Ctx() ctx: any) {
    const offset = parseInt((ctx.callbackQuery.data as string).replace('del_cancel:', ''), 10);
    await ctx.answerCbQuery('❌ Отменено');
    await this.renderCard(ctx, offset, true);
  }

  @Action(/^del_ask_new:(.+)/)
  async onDeleteAskNew(@Ctx() ctx: any) {
    const productId = (ctx.callbackQuery.data as string).replace('del_ask_new:', '');
    const product = await this.productsService.findOne(productId);
    await ctx.answerCbQuery();
    if (!product) return;
    await ctx.editMessageCaption(
      `🗑 *Удалить товар?*\n\n👔 ${product.type}\n💰 Опт: ${product.wholesalePrice ?? '—'} | Розница: ${product.retailPrice ?? '—'}`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('✅ Да, удалить', `del_confirm_new:${productId}`),
            Markup.button.callback('❌ Отмена', `del_cancel_new:${productId}`),
          ],
        ]),
      },
    );
  }

  @Action(/^del_confirm_new:(.+)/)
  async onDeleteConfirmNew(@Ctx() ctx: any) {
    const productId = (ctx.callbackQuery.data as string).replace('del_confirm_new:', '');
    const product = await this.productsService.findOne(productId);
    if (product?.publishedPost) {
      await this.tgGroupService.deleteProductCard(
        ctx.telegram, product.publishedPost.chatId, product.publishedPost.messageIds,
      );
    }
    if (product?.publishedWaPost) {
      await this.waService.deleteProductCard(ctx.from.id, product.publishedWaPost).catch(() => {});
    }
    await this.productsService.delete(productId);
    await ctx.answerCbQuery('✅ Удалено!');
    await ctx.editMessageCaption('✅ Товар удалён.', { ...Markup.inlineKeyboard([]) });
  }

  @Action(/^del_cancel_new:(.+)/)
  async onDeleteCancelNew(@Ctx() ctx: any) {
    const productId = (ctx.callbackQuery.data as string).replace('del_cancel_new:', '');
    const p = await this.productsService.findOne(productId);
    await ctx.answerCbQuery('❌ Отменено');
    if (!p) return;
    const caption =
      `✅ *Товар добавлен!*\n\n` +
      `🚻 *Пол:* ${p.gender ?? '—'}\n` +
      `👔 *Тип:* ${p.type}\n` +
      `💰 *Цена оптом:* ${p.wholesalePrice ?? '—'}\n💵 *Цена в розницу:* ${p.retailPrice ?? '—'}\n` +
      `🧵 *Материалы:* ${p.materials.join(', ')}\n🎨 *Цвета:* ${p.colors.join(', ')}\n` +
      `📏 *Размеры:* ${p.sizes.join(', ')}\n` +
      (p.description ? `📝 *Описание:* ${this.truncDesc(p.description)}\n` : '') +
      `📷 *Доп. фото:* ${p.extraPhotos?.length ?? 0}\n🆔 ID: \`${p.id}\``;
    await ctx.editMessageCaption(caption, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('✏️ Редактировать', `edit_product:${p.id}`),
          Markup.button.callback('🗑 Удалить', `del_ask_new:${p.id}`),
        ],
        [Markup.button.callback('📢 Опубликовать', `publish:${p.id}`)],
      ]),
    });
  }

  // ─── Публикация (Telegram + WhatsApp одновременно) ───────────────────────────
  @Action(/^publish:(.+)/)
  async onPublish(@Ctx() ctx: any) {
    const productId = (ctx.callbackQuery.data as string).replace('publish:', '');

    const p = await this.productsService.findOne(productId);
    if (!p) { await ctx.answerCbQuery('❌ Товар не найден', { show_alert: true }); return; }

    await ctx.answerCbQuery('📢 Публикую...');
    try { await ctx.editMessageReplyMarkup({ inline_keyboard: [] }); } catch { /* ignore */ }

    const results: string[] = [];

    // ── Telegram ──────────────────────────────────────────────────────────────
    const groupChatId = await this.groupService.get(ctx.from.id);
    if (groupChatId) {
      try {
        const messageIds = await this.tgGroupService.sendProductCard(ctx.telegram, groupChatId, p);
        await this.productsService.update(productId, {
          isPublished: true,
          publishedPost: { chatId: groupChatId, messageIds },
        });
        results.push('✅ Telegram');
      } catch (e) {
        console.error('[Bot] TG publish error:', e);
        results.push('❌ Telegram (ошибка)');
      }
    } else {
      results.push('⚠️ Telegram (группа не настроена)');
    }

    // ── WhatsApp ──────────────────────────────────────────────────────────────
    const waAuth = this.waService.isAuthenticated(ctx.from.id);
    const waGroup = await this.waService.getSavedGroup(ctx.from.id);
    if (waAuth && waGroup) {
      try {
        const waPost = await this.waService.sendProductCard(ctx.from.id, p);
        await this.productsService.update(productId, { publishedWaPost: waPost });
        results.push(`✅ WhatsApp (*${waGroup.waGroupName ?? waGroup.waGroupId}*)`);
      } catch (e) {
        console.error('[Bot] WA publish error:', e);
        results.push('❌ WhatsApp (ошибка)');
      }
    } else if (!waAuth) {
      results.push('⚠️ WhatsApp (не подключён)');
    } else {
      results.push('⚠️ WhatsApp (группа не выбрана)');
    }

    await ctx.reply(
      `*Результат публикации:*\n\n${results.join('\n')}`,
      { parse_mode: 'Markdown' },
    );
  }

  // ─── Пустая кнопка счётчика ───────────────────────────────────────────────────
  @Action('prods_noop')
  async onNoop(@Ctx() ctx: any) { await ctx.answerCbQuery(); }

  // ═══ Вспомогательные ═══════════════════════════════════════════════════════════

  private truncDesc(desc: string | null, max = 300): string {
    if (!desc) return '';
    return desc.length <= max ? desc : desc.slice(0, max) + '…';
  }

  private settingsMainKeyboard() {
    return Markup.inlineKeyboard([
      [Markup.button.callback('📢 Публикация', 'stg:pub')],
      [Markup.button.callback('👥 Доступ', 'stg:access')],
    ]);
  }

  private async renderCard(ctx: any, offset: number, edit: boolean) {
    const result = await this.productsService.findAll({ page: offset + 1, limit: 1 });
    const total = result.meta.total;

    if (total === 0) {
      if (edit) {
        await ctx.editMessageCaption('📦 Список товаров пуст.', { ...Markup.inlineKeyboard([]) });
      } else {
        await ctx.reply('📦 Список товаров пуст.', { reply_markup: MAIN_KEYBOARD });
      }
      return;
    }

    const p = result.data[0];

    const caption =
      `🚻 *Пол:* ${p.gender ?? '—'}\n` +
      `👔 *Тип:* ${p.type}\n` +
      `💰 *Цена оптом:* ${p.wholesalePrice ?? '—'}\n💵 *Цена в розницу:* ${p.retailPrice ?? '—'}\n` +
      `🧵 *Материалы:* ${p.materials.join(', ')}\n🎨 *Цвета:* ${p.colors.join(', ')}\n` +
      `📏 *Размеры:* ${p.sizes.join(', ')}\n` +
      (p.description ? `📝 *Описание:* ${this.truncDesc(p.description)}\n` : '') +
      `📷 *Доп. фото:* ${p.extraPhotos?.length ?? 0} шт.\n🆔 \`${p.id}\``;

    const navRow: ReturnType<typeof Markup.button.callback>[] = [];
    if (offset > 0) navRow.push(Markup.button.callback('◀️', `card_nav:${offset - 1}`));
    navRow.push(Markup.button.callback(`${offset + 1} / ${total}`, 'prods_noop'));
    if (offset < total - 1) navRow.push(Markup.button.callback('▶️', `card_nav:${offset + 1}`));

    const actionRow = [
      Markup.button.callback('✏️ Редактировать', `edit_product:${p.id}`),
      Markup.button.callback('🗑 Удалить', `del_ask:${p.id}:${offset}`),
    ];
    const publishRow = [Markup.button.callback('📢 Опубликовать', `publish:${p.id}`)];
    const keyboard = Markup.inlineKeyboard([navRow, actionRow, publishRow]);

    const photoPath = path.join(process.cwd(), p.photos[0].replace(/^\//, ''));
    const photoSource = { source: fs.createReadStream(photoPath) };

    if (edit) {
      await ctx.editMessageMedia(
        { type: 'photo', media: photoSource, caption, parse_mode: 'Markdown' },
        keyboard,
      );
    } else {
      await ctx.replyWithPhoto(photoSource, { caption, parse_mode: 'Markdown', ...keyboard });
    }
  }
}
