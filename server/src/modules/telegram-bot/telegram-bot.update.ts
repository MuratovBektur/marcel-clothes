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
import { AuthService } from './auth.service';
import { GroupService } from './group.service';
import { TgGroupService } from './messaging.service';
import { WaService } from './wa.service';
import { CLOTHING_WIZARD_ID, EDIT_SCENE_ID, MAIN_KEYBOARD } from './constants';

@Update()
export class TelegramBotUpdate implements OnModuleInit {
  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly productsService: ProductsService,
    private readonly authService: AuthService,
    private readonly groupService: GroupService,
    private readonly tgGroupService: TgGroupService,
    private readonly waService: WaService,
  ) {}

  async onModuleInit() {
    await this.bot.telegram.deleteMyCommands({});
    await this.bot.telegram.setMyCommands([
      { command: 'add', description: '➕ Добавить товар' },
      { command: 'list', description: '📋 Список товаров' },
    ]);
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
    const authorized = this.authService.checkAndAuthorize(contact.phone_number, ctx.from.id);
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

  // ─── Ввод юзернейма TG-группы и номера WA ────────────────────────────────────
  @On('text')
  async onText(@Ctx() ctx: any) {
    if (ctx.scene?.current) return;

    const text: string = ctx.message?.text ?? '';

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

  private async requestAuth(ctx: any) {
    await ctx.reply('🔒 Сначала пройдите идентификацию. Нажмите /start');
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
      `🗑 *Удалить товар?*\n\n👤 ${product.gender} | 📂 ${product.category} | 👔 ${product.type}\n💰 ${product.price} · 🌍 ${product.country}`,
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
      `🗑 *Удалить товар?*\n\n👤 ${product.gender} | 📂 ${product.category} | 👔 ${product.type}\n💰 ${product.price} · 🌍 ${product.country}`,
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
      `👤 *Пол:* ${p.gender}\n📂 *Категория:* ${p.category}\n👔 *Тип:* ${p.type}\n` +
      `🌍 *Страна:* ${p.country}\n💰 *Цена:* ${p.price}\n` +
      `🧵 *Материалы:* ${p.materials.join(', ')}\n🎨 *Цвета:* ${p.colors.join(', ')}\n` +
      `📏 *Размеры:* ${p.sizes.join(', ')}\n` +
      (p.description ? `📝 *Описание:* ${p.description}\n` : '') +
      `📷 *Доп. фото:* ${p.extraPhotos?.length ?? 0}\n🆔 ID: \`${p.id}\``;
    await ctx.editMessageCaption(caption, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('✏️ Изменить карточку', `edit_product:${p.id}`),
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

  private settingsMainKeyboard() {
    return Markup.inlineKeyboard([
      [Markup.button.callback('📢 Публикация', 'stg:pub')],
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
      `👤 *Пол:* ${p.gender}\n📂 *Категория:* ${p.category}\n👔 *Тип:* ${p.type}\n` +
      `🌍 *Страна:* ${p.country}\n💰 *Цена:* ${p.price}\n` +
      `🧵 *Материалы:* ${p.materials.join(', ')}\n🎨 *Цвета:* ${p.colors.join(', ')}\n` +
      `📏 *Размеры:* ${p.sizes.join(', ')}\n` +
      (p.description ? `📝 *Описание:* ${p.description}\n` : '') +
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
