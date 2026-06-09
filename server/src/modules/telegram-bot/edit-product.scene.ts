import { Action, Ctx, On, Scene, SceneEnter } from 'nestjs-telegraf';
import { Injectable } from '@nestjs/common';
import { Markup } from 'telegraf';
import { ProductsService } from '../products/products.service';
import { FileStorageService } from './file-storage.service';
import { TgGroupService } from './messaging.service';
import { WaService } from './wa.service';
import {
  COLORS,
  EDIT_SCENE_ID,
  MAIN_KEYBOARD,
  MATERIALS,
  MAX_EXTRA_PHOTOS,
  SIZES,
  SUIT_TYPES,
} from './constants';

const PRICE_RE = /^\d+(\.\d+)?\s+(сом\p{L}*|рубл\p{L}*|доллар\p{L}*)$/iu;
const BACK_TEXT = '◀️ Назад';
const SKIP_TEXT = '⏭ Пропустить';
const DONE_TEXT = '✅ Готово';

const BACK_CB = 'ef_back';
const SAVE_CB = 'ef_save';
const E_MAT_CUSTOM_CB = 'ef_mat_custom';
const E_COL_CUSTOM_CB = 'ef_col_custom';
const E_SIZE_CUSTOM_CB = 'ef_size_custom';

interface EditState {
  productId: string;
  editingField: 'wholesalePrice' | 'retailPrice' | 'description' | 'additionalDescription' | 'photo' | 'extra_photos' | null;
  editingMulti: 'materials' | 'colors' | 'sizes' | null;
  selectedItems: string[];
  waitingForCustom: 'material' | 'color' | 'size' | null;
  editingType: boolean;
  newExtraPhotos: string[];
}

function getState(ctx: any): EditState {
  return ctx.scene.state as EditState;
}

function chunks<T>(arr: T[], size: number): T[][] {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

function toggle(arr: string[], value: string) {
  const i = arr.indexOf(value);
  if (i === -1) arr.push(value);
  else arr.splice(i, 1);
}

function multiSelectMarkup(
  items: string[],
  selected: string[],
  prefix: string,
  customCb?: string,
) {
  const rows = chunks(items, 3).map((row) =>
    row.map((item) =>
      Markup.button.callback(
        selected.includes(item) ? `✅ ${item}` : item,
        `${prefix}:${item}`,
      ),
    ),
  );
  rows.push([
    Markup.button.callback('◀️ Назад', BACK_CB),
    ...(customCb ? [Markup.button.callback('✏️ Свой вариант', customCb)] : []),
    Markup.button.callback('💾 Сохранить', SAVE_CB),
  ]);
  return Markup.inlineKeyboard(rows);
}

async function removeReplyKeyboard(ctx: any) {
  const msg: any = await ctx.reply('↩️', Markup.removeKeyboard());
  await ctx.deleteMessage(msg.message_id);
}

@Injectable()
@Scene(EDIT_SCENE_ID)
export class EditProductScene {
  private readonly mediaGroupBuffers = new Map<
    string,
    { fileIds: string[]; timer: ReturnType<typeof setTimeout>; latestCtx: any }
  >();

  constructor(
    private readonly productsService: ProductsService,
    private readonly fileStorage: FileStorageService,
    private readonly tgGroupService: TgGroupService,
    private readonly waService: WaService,
  ) {}

  @SceneEnter()
  async onEnter(@Ctx() ctx: any) {
    const productId = ctx.session?.editProductId;
    if (!productId) {
      await ctx.reply('Ошибка: ID товара не передан.');
      await ctx.scene.leave();
      return;
    }

    const product = await this.productsService.findOne(productId);
    if (!product) {
      await ctx.reply('Товар не найден.');
      await ctx.scene.leave();
      return;
    }

    Object.assign(ctx.scene.state, {
      productId,
      editingField: null,
      editingMulti: null,
      selectedItems: [],
      waitingForCustom: null,
      editingType: false,
      newExtraPhotos: [],
    } satisfies EditState);

    await removeReplyKeyboard(ctx);
    await this.showEditMenu(ctx, product);
  }

  // ─── Меню редактирования ───────────────────────────────────────────────────────
  private async showEditMenu(ctx: any, product?: any) {
    const state = getState(ctx);
    state.editingField = null;
    state.editingMulti = null;
    state.selectedItems = [];
    state.waitingForCustom = null;
    state.editingType = false;
    state.newExtraPhotos = [];

    if (!product) {
      product = await this.productsService.findOne(state.productId);
    }

    const text =
      `✏️ *Редактирование товара*\n\n` +
      `👔 *Тип:* ${product.type}\n` +
      `💰 *Цена оптом:* ${product.wholesalePrice ?? '—'}\n` +
      `💵 *Цена в розницу:* ${product.retailPrice ?? '—'}\n` +
      `🧵 *Материалы:* ${product.materials.join(', ')}\n` +
      `🎨 *Цвета:* ${product.colors.join(', ')}\n` +
      `📏 *Размеры:* ${product.sizes.join(', ')}\n` +
      (product.description
        ? `📝 *Описание:* ${product.description}\n`
        : '📝 Описание: —\n') +
      (product.additionalDescription
        ? `📋 *Доп. описание:* ${product.additionalDescription}\n`
        : '📋 Доп. описание: —\n') +
      `📷 *Доп. фото:* ${product.extraPhotos?.length ?? 0} шт.\n` +
      `\n_Выберите поле для изменения:_`;

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('👔 Тип', 'ef:type')],
        [
          Markup.button.callback('💰 Цена оптом', 'ef:wholesalePrice'),
          Markup.button.callback('💵 Цена в розницу', 'ef:retailPrice'),
        ],
        [
          Markup.button.callback('🧵 Материалы', 'ef:materials'),
          Markup.button.callback('🎨 Цвета', 'ef:colors'),
        ],
        [
          Markup.button.callback('📏 Размеры', 'ef:sizes'),
          Markup.button.callback('📝 Описание', 'ef:description'),
        ],
        [Markup.button.callback('📋 Доп. описание', 'ef:additionalDescription')],
        [
          Markup.button.callback('📸 Главное фото', 'ef:photo'),
          Markup.button.callback('📷 Доп. фото', 'ef:extra_photos'),
        ],
        [Markup.button.callback('✅ Закрыть редактирование', 'ef:done')],
      ]),
    });
  }

  // ─── Закрыть редактирование ────────────────────────────────────────────────────
  @Action('ef:done')
  async onDone(@Ctx() ctx: any) {
    await ctx.answerCbQuery('✅');
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.reply('✅ Редактирование завершено.', { reply_markup: MAIN_KEYBOARD });

    const productId = ctx.session.editProductId as string | undefined;
    if (productId) {
      const product = await this.productsService.findOne(productId);
      const isPublished = product?.isPublished || product?.publishedWaPost;

      if (product?.publishedPost) {
        try {
          await this.tgGroupService.updateProductCard(ctx.telegram, product);
        } catch {
          await ctx.reply('⚠️ Не удалось обновить пост в Telegram группе.');
        }
      }

      if (product?.publishedWaPost) {
        try {
          const newWaPost = await this.waService.updateProductCard(
            ctx.from.id,
            product.publishedWaPost,
            product,
          );
          await this.productsService.update(productId, { publishedWaPost: newWaPost });
        } catch {
          await ctx.reply('⚠️ Не удалось обновить пост в WhatsApp группе.');
        }
      }

      if (product && !isPublished) {
        await ctx.reply('Товар ещё не опубликован:', {
          reply_markup: {
            inline_keyboard: [[
              { text: '📢 Опубликовать', callback_data: `publish:${productId}` },
            ]],
          },
        });
      }
    }

    await ctx.scene.leave();
  }

  // ─── Назад ─────────────────────────────────────────────────────────────────────
  @Action(BACK_CB)
  async onBack(@Ctx() ctx: any) {
    const state = getState(ctx);
    state.editingField = null;
    state.editingMulti = null;
    state.selectedItems = [];
    state.waitingForCustom = null;
    state.editingType = false;
    state.newExtraPhotos = [];
    await ctx.answerCbQuery('◀️');
    await this.showEditMenu(ctx);
  }

  // ═══ Тип костюма ══════════════════════════════════════════════════════════════

  @Action('ef:type')
  async onEditType(@Ctx() ctx: any) {
    const state = getState(ctx);
    state.editingType = true;
    await ctx.answerCbQuery();
    await this.sendSuitTypeKeyboard(ctx);
  }

  @Action(/^etype:(\d+)$/)
  async onTypeSelect(@Ctx() ctx: any) {
    const state = getState(ctx);
    if (!state.editingType) { await ctx.answerCbQuery(); return; }
    const idx = parseInt((ctx.callbackQuery.data as string).replace('etype:', ''), 10);
    const type = SUIT_TYPES[idx];
    if (!type) { await ctx.answerCbQuery(); return; }
    await this.productsService.update(state.productId, { type });
    state.editingType = false;
    await ctx.answerCbQuery('✅ Сохранено!');
    await ctx.reply('✅ Тип обновлён!');
    await this.showEditMenu(ctx);
  }

  // ═══ Цена ══════════════════════════════════════════════════════════════════════

  @Action('ef:wholesalePrice')
  async onEditWholesalePrice(@Ctx() ctx: any) {
    getState(ctx).editingField = 'wholesalePrice';
    await ctx.answerCbQuery();
    await ctx.reply(
      '💰 Введите новую цену оптом:\n\n_Примеры: 500 сом · 1200 рубль · 15 доллар_',
      {
        parse_mode: 'Markdown',
        ...Markup.keyboard([[BACK_TEXT]]).resize(),
      },
    );
  }

  @Action('ef:retailPrice')
  async onEditRetailPrice(@Ctx() ctx: any) {
    getState(ctx).editingField = 'retailPrice';
    await ctx.answerCbQuery();
    await ctx.reply(
      '💵 Введите новую цену в розницу:\n\n_Примеры: 500 сом · 1200 рубль · 15 доллар_',
      {
        parse_mode: 'Markdown',
        ...Markup.keyboard([[BACK_TEXT]]).resize(),
      },
    );
  }

  // ═══ Материалы ═════════════════════════════════════════════════════════════════

  @Action('ef:materials')
  async onEditMaterials(@Ctx() ctx: any) {
    const state = getState(ctx);
    state.editingMulti = 'materials';
    const product = await this.productsService.findOne(state.productId);
    state.selectedItems = [...(product?.materials ?? [])];
    await ctx.answerCbQuery();
    await ctx.reply('🧵 *Выберите материалы:*\n_Текущие отмечены ✅_', {
      parse_mode: 'Markdown',
      ...multiSelectMarkup(MATERIALS, state.selectedItems, 'emat', E_MAT_CUSTOM_CB),
    });
  }

  @Action(/^emat:(.+)/)
  async onMaterialToggle(@Ctx() ctx: any) {
    const state = getState(ctx);
    if (state.editingMulti !== 'materials') { await ctx.answerCbQuery(); return; }
    toggle(state.selectedItems, (ctx.callbackQuery.data as string).replace('emat:', ''));
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(
      multiSelectMarkup(MATERIALS, state.selectedItems, 'emat', E_MAT_CUSTOM_CB).reply_markup,
    );
  }

  @Action(E_MAT_CUSTOM_CB)
  async onMatCustom(@Ctx() ctx: any) {
    const state = getState(ctx);
    if (state.editingMulti !== 'materials') { await ctx.answerCbQuery(); return; }
    state.waitingForCustom = 'material';
    await ctx.answerCbQuery();
    await ctx.reply('✏️ Введите свои варианты материалов через запятую:', {
      ...Markup.keyboard([[BACK_TEXT]]).resize(),
    });
  }

  // ═══ Цвета ═════════════════════════════════════════════════════════════════════

  @Action('ef:colors')
  async onEditColors(@Ctx() ctx: any) {
    const state = getState(ctx);
    state.editingMulti = 'colors';
    const product = await this.productsService.findOne(state.productId);
    state.selectedItems = [...(product?.colors ?? [])];
    await ctx.answerCbQuery();
    await ctx.reply('🎨 *Выберите цвета:*\n_Текущие отмечены ✅_', {
      parse_mode: 'Markdown',
      ...multiSelectMarkup(COLORS, state.selectedItems, 'ecol', E_COL_CUSTOM_CB),
    });
  }

  @Action(/^ecol:(.+)/)
  async onColorToggle(@Ctx() ctx: any) {
    const state = getState(ctx);
    if (state.editingMulti !== 'colors') { await ctx.answerCbQuery(); return; }
    toggle(state.selectedItems, (ctx.callbackQuery.data as string).replace('ecol:', ''));
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(
      multiSelectMarkup(COLORS, state.selectedItems, 'ecol', E_COL_CUSTOM_CB).reply_markup,
    );
  }

  @Action(E_COL_CUSTOM_CB)
  async onColCustom(@Ctx() ctx: any) {
    const state = getState(ctx);
    if (state.editingMulti !== 'colors') { await ctx.answerCbQuery(); return; }
    state.waitingForCustom = 'color';
    await ctx.answerCbQuery();
    await ctx.reply('✏️ Введите свои варианты цветов через запятую:', {
      ...Markup.keyboard([[BACK_TEXT]]).resize(),
    });
  }

  // ═══ Размеры ═══════════════════════════════════════════════════════════════════

  @Action('ef:sizes')
  async onEditSizes(@Ctx() ctx: any) {
    const state = getState(ctx);
    state.editingMulti = 'sizes';
    const product = await this.productsService.findOne(state.productId);
    state.selectedItems = [...(product?.sizes ?? [])];
    await ctx.answerCbQuery();
    await ctx.reply('📏 *Выберите размеры:*\n_Текущие отмечены ✅_', {
      parse_mode: 'Markdown',
      ...multiSelectMarkup(SIZES.default, state.selectedItems, 'esize', E_SIZE_CUSTOM_CB),
    });
  }

  @Action(/^esize:(.+)/)
  async onSizeToggle(@Ctx() ctx: any) {
    const state = getState(ctx);
    if (state.editingMulti !== 'sizes') { await ctx.answerCbQuery(); return; }
    toggle(state.selectedItems, (ctx.callbackQuery.data as string).replace('esize:', ''));
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(
      multiSelectMarkup(SIZES.default, state.selectedItems, 'esize', E_SIZE_CUSTOM_CB).reply_markup,
    );
  }

  @Action(E_SIZE_CUSTOM_CB)
  async onSizeCustom(@Ctx() ctx: any) {
    const state = getState(ctx);
    if (state.editingMulti !== 'sizes') { await ctx.answerCbQuery(); return; }
    state.waitingForCustom = 'size';
    await ctx.answerCbQuery();
    await ctx.reply('✏️ Введите свои варианты размеров через запятую:', {
      ...Markup.keyboard([[BACK_TEXT]]).resize(),
    });
  }

  // ─── Сохранить multi-select ────────────────────────────────────────────────────
  @Action(SAVE_CB)
  async onSaveMulti(@Ctx() ctx: any) {
    const state = getState(ctx);
    if (!state.editingMulti) { await ctx.answerCbQuery(); return; }
    if (!state.selectedItems.length) {
      await ctx.answerCbQuery('Выберите хотя бы один вариант!', { show_alert: true });
      return;
    }
    const field = state.editingMulti;
    await this.productsService.update(state.productId, { [field]: state.selectedItems });
    const label = field === 'materials' ? 'Материалы' : field === 'colors' ? 'Цвета' : 'Размеры';
    await ctx.answerCbQuery('✅ Сохранено!');
    await ctx.reply(`✅ ${label} обновлены!`);
    await this.showEditMenu(ctx);
  }

  // ═══ Описание ══════════════════════════════════════════════════════════════════

  @Action('ef:description')
  async onEditDescription(@Ctx() ctx: any) {
    getState(ctx).editingField = 'description';
    await ctx.answerCbQuery();
    await ctx.reply(
      '📝 Введите новое описание или нажмите "Пропустить" для удаления:',
      { ...Markup.keyboard([[BACK_TEXT], [SKIP_TEXT]]).resize() },
    );
  }

  @Action('ef:additionalDescription')
  async onEditAdditionalDescription(@Ctx() ctx: any) {
    getState(ctx).editingField = 'additionalDescription';
    await ctx.answerCbQuery();
    await ctx.reply(
      '📋 Введите дополнительное описание или нажмите "Пропустить" для удаления:',
      { ...Markup.keyboard([[BACK_TEXT], [SKIP_TEXT]]).resize() },
    );
  }

  // ═══ Главное фото ══════════════════════════════════════════════════════════════

  @Action('ef:photo')
  async onEditPhoto(@Ctx() ctx: any) {
    getState(ctx).editingField = 'photo';
    await ctx.answerCbQuery();
    await ctx.reply('📸 Отправьте новое главное фото:', {
      ...Markup.keyboard([[BACK_TEXT]]).resize(),
    });
  }

  // ═══ Доп. фото ═════════════════════════════════════════════════════════════════

  @Action('ef:extra_photos')
  async onEditExtraPhotos(@Ctx() ctx: any) {
    const state = getState(ctx);
    const product = await this.productsService.findOne(state.productId);
    const count = product?.extraPhotos?.length ?? 0;
    await ctx.answerCbQuery();
    await ctx.reply(
      `📷 *Доп. фото* — сейчас: ${count} шт. (макс. ${MAX_EXTRA_PHOTOS})\n\nЧто сделать?`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('➕ Добавить фото', 'ef_extra_add')],
          [Markup.button.callback('🗑 Очистить все', 'ef_extra_clear')],
          [Markup.button.callback('◀️ Назад', BACK_CB)],
        ]),
      },
    );
  }

  @Action('ef_extra_add')
  async onExtraAdd(@Ctx() ctx: any) {
    const state = getState(ctx);
    state.editingField = 'extra_photos';
    state.newExtraPhotos = [];
    await ctx.answerCbQuery();
    await ctx.reply(
      `📷 Отправьте фото — по одному или сразу альбомом.\nНажмите *"${DONE_TEXT}"* когда закончите.`,
      {
        parse_mode: 'Markdown',
        ...Markup.keyboard([[BACK_TEXT, DONE_TEXT]]).resize(),
      },
    );
  }

  @Action('ef_extra_clear')
  async onExtraClear(@Ctx() ctx: any) {
    const state = getState(ctx);
    await this.productsService.update(state.productId, { extraPhotos: [] });
    await ctx.answerCbQuery('✅ Очищено!');
    await ctx.reply('✅ Все доп. фото удалены!');
    await this.showEditMenu(ctx);
  }

  // ═══ Обработка текста ══════════════════════════════════════════════════════════

  @On('text')
  async onText(@Ctx() ctx: any) {
    const state = getState(ctx);
    const text: string = ctx.message?.text?.trim() ?? '';

    if (text === BACK_TEXT) {
      state.editingField = null;
      state.waitingForCustom = null;
      state.editingType = false;
      state.newExtraPhotos = [];
      await removeReplyKeyboard(ctx);
      await this.showEditMenu(ctx);
      return;
    }

    // Доп. фото — завершение
    if (text === DONE_TEXT && state.editingField === 'extra_photos') {
      if (!state.newExtraPhotos.length) {
        await ctx.reply(`Сначала отправьте хотя бы одно фото или нажмите "${BACK_TEXT}".`);
        return;
      }
      const product = await this.productsService.findOne(state.productId);
      const combined = [...(product?.extraPhotos ?? []), ...state.newExtraPhotos];
      await this.productsService.update(state.productId, { extraPhotos: combined });
      state.editingField = null;
      state.newExtraPhotos = [];
      await removeReplyKeyboard(ctx);
      await ctx.reply(`✅ Доп. фото добавлены (всего: ${combined.length})!`);
      await this.showEditMenu(ctx);
      return;
    }

    // Пропустить описание
    if (text === SKIP_TEXT && state.editingField === 'description') {
      await this.productsService.update(state.productId, { description: null });
      state.editingField = null;
      await removeReplyKeyboard(ctx);
      await ctx.reply('✅ Описание удалено!');
      await this.showEditMenu(ctx);
      return;
    }

    // Пропустить доп. описание
    if (text === SKIP_TEXT && state.editingField === 'additionalDescription') {
      await this.productsService.update(state.productId, { additionalDescription: null });
      state.editingField = null;
      await removeReplyKeyboard(ctx);
      await ctx.reply('✅ Дополнительное описание удалено!');
      await this.showEditMenu(ctx);
      return;
    }

    // Свой вариант multi-select
    if (state.waitingForCustom) {
      const items = text.split(',').map((s) => s.trim()).filter(Boolean);
      if (!items.length) {
        await ctx.reply('Введите хотя бы один вариант через запятую.');
        return;
      }
      const added: string[] = [];
      for (const item of items) {
        if (!state.selectedItems.includes(item)) {
          state.selectedItems.push(item);
          added.push(item);
        }
      }
      state.waitingForCustom = null;
      await removeReplyKeyboard(ctx);
      const prefix = state.editingMulti === 'materials' ? 'emat' : state.editingMulti === 'colors' ? 'ecol' : 'esize';
      const customCb = state.editingMulti === 'materials' ? E_MAT_CUSTOM_CB : state.editingMulti === 'colors' ? E_COL_CUSTOM_CB : E_SIZE_CUSTOM_CB;
      const list = state.editingMulti === 'materials' ? MATERIALS : state.editingMulti === 'colors' ? COLORS : SIZES.default;
      await ctx.reply(
        `✅ Добавлено: *${added.join(', ')}*\n\nВыберите ещё из списка или нажмите *Сохранить*`,
        { parse_mode: 'Markdown', ...multiSelectMarkup(list, state.selectedItems, prefix, customCb) },
      );
      return;
    }

    // Цена оптом
    if (state.editingField === 'wholesalePrice') {
      if (!PRICE_RE.test(text)) {
        await ctx.reply(
          '⚠️ Неверный формат. Введите цену и валюту:\n\n_Примеры: 500 сом · 1200 рубль · 15 доллар_',
          { parse_mode: 'Markdown' },
        );
        return;
      }
      await this.productsService.update(state.productId, { wholesalePrice: text });
      state.editingField = null;
      await removeReplyKeyboard(ctx);
      await ctx.reply('✅ Цена оптом обновлена!');
      await this.showEditMenu(ctx);
      return;
    }

    // Цена в розницу
    if (state.editingField === 'retailPrice') {
      if (!PRICE_RE.test(text)) {
        await ctx.reply(
          '⚠️ Неверный формат. Введите цену и валюту:\n\n_Примеры: 500 сом · 1200 рубль · 15 доллар_',
          { parse_mode: 'Markdown' },
        );
        return;
      }
      await this.productsService.update(state.productId, { retailPrice: text });
      state.editingField = null;
      await removeReplyKeyboard(ctx);
      await ctx.reply('✅ Цена в розницу обновлена!');
      await this.showEditMenu(ctx);
      return;
    }

    // Описание
    if (state.editingField === 'description') {
      await this.productsService.update(state.productId, { description: text });
      state.editingField = null;
      await removeReplyKeyboard(ctx);
      await ctx.reply('✅ Описание обновлено!');
      await this.showEditMenu(ctx);
      return;
    }

    // Доп. описание
    if (state.editingField === 'additionalDescription') {
      await this.productsService.update(state.productId, { additionalDescription: text });
      state.editingField = null;
      await removeReplyKeyboard(ctx);
      await ctx.reply('✅ Дополнительное описание обновлено!');
      await this.showEditMenu(ctx);
      return;
    }
  }

  // ═══ Обработка фото ════════════════════════════════════════════════════════════

  @On('photo')
  async onPhoto(@Ctx() ctx: any) {
    const state = getState(ctx);
    const photo = ctx.message?.photo;
    if (!photo?.length) return;
    const fileId: string = photo[photo.length - 1].file_id;

    if (state.editingField === 'photo') {
      const photoUrl = await this.fileStorage.saveFromFileId(fileId);
      await this.productsService.update(state.productId, { photos: [photoUrl] });
      state.editingField = null;
      await removeReplyKeyboard(ctx);
      await ctx.reply('✅ Главное фото обновлено!');
      await this.showEditMenu(ctx);
      return;
    }

    if (state.editingField === 'extra_photos') {
      const mediaGroupId: string | undefined = ctx.message?.media_group_id;
      if (mediaGroupId) {
        const key = `${ctx.chat.id}_${mediaGroupId}`;
        const existing = this.mediaGroupBuffers.get(key);
        if (existing) {
          clearTimeout(existing.timer);
          existing.fileIds.push(fileId);
          existing.latestCtx = ctx;
          existing.timer = setTimeout(() => void this.flushExtraPhotosGroup(key), 800);
        } else {
          const timer = setTimeout(() => void this.flushExtraPhotosGroup(key), 800);
          this.mediaGroupBuffers.set(key, { fileIds: [fileId], timer, latestCtx: ctx });
        }
        return;
      }
      await this.appendExtraPhotos(ctx, state, [fileId]);
    }
  }

  private async flushExtraPhotosGroup(key: string) {
    const buf = this.mediaGroupBuffers.get(key);
    if (!buf) return;
    this.mediaGroupBuffers.delete(key);
    const ctx = buf.latestCtx;
    const state = getState(ctx);
    if (state.editingField !== 'extra_photos') return;
    await this.appendExtraPhotos(ctx, state, buf.fileIds);
  }

  private async appendExtraPhotos(ctx: any, state: EditState, fileIds: string[]) {
    const product = await this.productsService.findOne(state.productId);
    const alreadySaved = product?.extraPhotos?.length ?? 0;
    const remaining = MAX_EXTRA_PHOTOS - alreadySaved - state.newExtraPhotos.length;

    if (remaining <= 0) {
      await ctx.reply(`Максимум ${MAX_EXTRA_PHOTOS} доп. фото достигнут. Нажмите "${DONE_TEXT}" для сохранения.`);
      return;
    }

    const toAdd = fileIds.slice(0, remaining);
    const urls = await this.fileStorage.saveMany(toAdd);
    state.newExtraPhotos.push(...urls);

    const skipped = fileIds.length - toAdd.length;
    let msg = `✅ Добавлено ${toAdd.length} фото (новых в очереди: ${state.newExtraPhotos.length}).`;
    if (skipped > 0) msg += ` Пропущено ${skipped} — лимит ${MAX_EXTRA_PHOTOS} шт.`;
    msg += ` Ещё или "${DONE_TEXT}".`;
    await ctx.reply(msg);
  }

  // ═══ Вспомогательные клавиатуры ════════════════════════════════════════════════

  private async sendSuitTypeKeyboard(ctx: any) {
    const buttons = SUIT_TYPES.map((t, i) => [
      Markup.button.callback(t, `etype:${i}`),
    ]);
    buttons.push([Markup.button.callback('◀️ Назад', BACK_CB)]);
    await ctx.reply('👔 Выберите новый тип костюма:', {
      ...Markup.inlineKeyboard(buttons),
    });
  }
}
