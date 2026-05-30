import {
  Action,
  Ctx,
  SceneEnter,
  Wizard,
  WizardStep,
  Message,
} from 'nestjs-telegraf';
import { Injectable } from '@nestjs/common';
import { Markup } from 'telegraf';
import { ProductsService } from '../products/products.service';
import { FileStorageService } from './file-storage.service';
import {
  COLORS,
  MATERIALS,
  MAX_EXTRA_PHOTOS,
  SIZES,
  SUIT_TYPES,
  CLOTHING_WIZARD_ID,
  MAIN_KEYBOARD,
} from './constants';
import { ClothingSubmission } from './clothing-submission.interface';

// ─── Валидация цены: «число валюта», валюта — сом / рубль / доллар ────────────
const PRICE_RE = /^\d+(\.\d+)?\s+(сом|рубль|доллар)$/i;

// ─── Callback data ────────────────────────────────────────────────────────────
const BACK_CB = 'wiz_back';
const DONE_CB = 'wiz_done';
const CANCEL_CB = 'wiz_cancel';
const CANCEL_CONFIRM_CB = 'wiz_cancel_confirm';
const CANCEL_ABORT_CB = 'wiz_cancel_abort';
const MAT_CUSTOM_CB = 'mat_custom';
const COL_CUSTOM_CB = 'col_custom';
const SIZE_CUSTOM_CB = 'size_custom';

// ─── Reply keyboard labels ────────────────────────────────────────────────────
const BACK_TEXT = '◀️ Назад';
const DONE_TEXT = '✅ Готово';
const SKIP_TEXT = '⏭ Пропустить';
const CANCEL_TEXT = '❌ Отмена';

// ─── Cursor → шаг ─────────────────────────────────────────────────────────────
// 0  = Тип           (inline, callback type:0..4)
// 1  = Цена          (text через WizardStep(1))
// 2  = Материалы     (inline, multi + text)
// 3  = Цвета         (inline, multi + text)
// 4  = Размеры       (inline, multi + text)
// 5  = Главное фото  (WizardStep(5))
// 6  = Описание      (WizardStep(6))
// 7  = Доп. фото     (WizardStep(7))

// ─── State ────────────────────────────────────────────────────────────────────
interface WizardState {
  submission: Partial<ClothingSubmission>;
  waitingForCustom: 'material' | 'color' | 'size' | null;
  customStepMessageId: number | null;
  selectedMaterials: string[];
  selectedColors: string[];
  selectedSizes: string[];
  mainPhoto: string | null;
  extraPhotos: string[];
}

function getState(ctx: any): WizardState {
  if (!ctx.wizard.state.submission) {
    Object.assign(ctx.wizard.state, {
      submission: {},
      waitingForCustom: null,
      customStepMessageId: null,
      selectedMaterials: [],
      selectedColors: [],
      selectedSizes: [],
      mainPhoto: null,
      extraPhotos: [],
    } satisfies WizardState);
  }
  return ctx.wizard.state as WizardState;
}

@Injectable()
@Wizard(CLOTHING_WIZARD_ID)
export class ClothingWizard {
  constructor(
    private readonly productsService: ProductsService,
    private readonly fileStorage: FileStorageService,
  ) {}

  @SceneEnter()
  async onEnter(@Ctx() ctx: any) {
    if (ctx.scene?.session) {
      ctx.scene.session.cursor = 0;
      ctx.scene.session.state = {};
    }
    if (ctx.session?.__scenes) {
      ctx.session.__scenes.cursor = 0;
      ctx.session.__scenes.state = {};
    }
    await removeReplyKeyboard(ctx);
    const firstMsg = await sendSuitTypeKeyboard(ctx, undefined);
    ctx.session.__wizFirstMsgId = firstMsg.message_id;
  }

  // ═══ INLINE ACTIONS ══════════════════════════════════════════════════════════

  @Action(CANCEL_CB)
  async onCancel(@Ctx() ctx: any) {
    await ctx.answerCbQuery();
    if (ctx.wizard.cursor === 0) {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      await ctx.reply('Добавление товара отменено.', { reply_markup: MAIN_KEYBOARD });
      await ctx.scene.leave();
    } else {
      await sendCancelConfirmation(ctx);
    }
  }

  @Action(CANCEL_CONFIRM_CB)
  async onCancelConfirm(@Ctx() ctx: any) {
    await ctx.answerCbQuery('❌ Отменено');
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.reply('Добавление товара отменено.', { reply_markup: MAIN_KEYBOARD });
    await ctx.scene.leave();
  }

  @Action(CANCEL_ABORT_CB)
  async onCancelAbort(@Ctx() ctx: any) {
    await ctx.answerCbQuery('▶️ Продолжаем');
    await ctx.deleteMessage();
  }

  // cursor 0 — Тип костюма (callback_data = type:<index>)
  @Action(/^type:(\d+)$/)
  async onTypeSelect(@Ctx() ctx: any) {
    if (ctx.wizard.cursor !== 0) { await ctx.answerCbQuery(); return; }
    const idx = parseInt((ctx.callbackQuery.data as string).replace('type:', ''), 10);
    const type = SUIT_TYPES[idx];
    if (!type) { await ctx.answerCbQuery(); return; }
    const state = getState(ctx);
    state.submission.type = type;
    ctx.wizard.next();
    await ctx.answerCbQuery(`✅ ${type}`);
    await sendPricePrompt(ctx);
  }

  // cursor 2 — Материалы (toggle)
  @Action(/^mat:(.+)/)
  async onMaterialToggle(@Ctx() ctx: any) {
    if (ctx.wizard.cursor !== 2) { await ctx.answerCbQuery(); return; }
    const mat = (ctx.callbackQuery.data as string).replace('mat:', '');
    const state = getState(ctx);
    toggle(state.selectedMaterials, mat);
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(
      multiSelectMarkup(MATERIALS, state.selectedMaterials, 'mat', MAT_CUSTOM_CB).reply_markup,
    );
  }

  // cursor 3 — Цвета (toggle)
  @Action(/^col:(.+)/)
  async onColorToggle(@Ctx() ctx: any) {
    if (ctx.wizard.cursor !== 3) { await ctx.answerCbQuery(); return; }
    const col = (ctx.callbackQuery.data as string).replace('col:', '');
    const state = getState(ctx);
    toggle(state.selectedColors, col);
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(
      multiSelectMarkup(COLORS, state.selectedColors, 'col', COL_CUSTOM_CB).reply_markup,
    );
  }

  // cursor 4 — Размеры (toggle)
  @Action(/^size:(.+)/)
  async onSizeToggle(@Ctx() ctx: any) {
    if (ctx.wizard.cursor !== 4) { await ctx.answerCbQuery(); return; }
    const size = (ctx.callbackQuery.data as string).replace('size:', '');
    const state = getState(ctx);
    toggle(state.selectedSizes, size);
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(
      multiSelectMarkup(SIZES.default, state.selectedSizes, 'size', SIZE_CUSTOM_CB).reply_markup,
    );
  }

  // ─── "✅ Готово" для multi-select (cursor 2, 3, 4) ───────────────────────────
  @Action(DONE_CB)
  async onDone(@Ctx() ctx: any) {
    const cursor = ctx.wizard.cursor;
    const state = getState(ctx);

    if (cursor === 2) {
      if (!state.selectedMaterials.length) {
        await ctx.answerCbQuery('Выберите хотя бы один материал!', { show_alert: true });
        return;
      }
      state.submission.materials = [...state.selectedMaterials];
      ctx.wizard.next();
      await ctx.answerCbQuery();
      await sendColorsKeyboard(ctx, state.selectedColors);
    } else if (cursor === 3) {
      if (!state.selectedColors.length) {
        await ctx.answerCbQuery('Выберите хотя бы один цвет!', { show_alert: true });
        return;
      }
      state.submission.colors = [...state.selectedColors];
      ctx.wizard.next();
      await ctx.answerCbQuery();
      await sendSizesKeyboard(ctx, state.selectedSizes);
    } else if (cursor === 4) {
      if (!state.selectedSizes.length) {
        await ctx.answerCbQuery('Выберите хотя бы один размер!', { show_alert: true });
        return;
      }
      state.submission.sizes = [...state.selectedSizes];
      ctx.wizard.next();
      await ctx.answerCbQuery();
      await sendMainPhotoPrompt(ctx);
    } else {
      await ctx.answerCbQuery();
    }
  }

  // ─── "◀️ Назад" для inline-шагов (cursor 2, 3, 4) ────────────────────────────
  @Action(BACK_CB)
  async onBackInline(@Ctx() ctx: any) {
    const cursor = ctx.wizard.cursor;
    const inlineCursors = [2, 3, 4];
    if (!inlineCursors.includes(cursor)) { await ctx.answerCbQuery(); return; }
    ctx.wizard.cursor = cursor - 1;
    await ctx.answerCbQuery('◀️');
    await this.showStep(ctx, cursor - 1);
  }

  // ═══ WIZARD STEPS ════════════════════════════════════════════════════════════

  // Заглушка для inline-шага (0)
  @WizardStep(0) async onStep0() {}

  // Обработчики "Свой вариант" для multi-select
  @Action(MAT_CUSTOM_CB)
  async onMaterialCustom(@Ctx() ctx: any) {
    if (ctx.wizard.cursor !== 2) { await ctx.answerCbQuery(); return; }
    const state = getState(ctx);
    state.waitingForCustom = 'material';
    state.customStepMessageId = ctx.callbackQuery.message.message_id;
    await ctx.answerCbQuery();
    await ctx.reply('✏️ Введите свои варианты материалов через запятую:', {
      ...Markup.keyboard([[BACK_TEXT], [CANCEL_TEXT]]).resize(),
    });
  }

  @Action(COL_CUSTOM_CB)
  async onColorCustom(@Ctx() ctx: any) {
    if (ctx.wizard.cursor !== 3) { await ctx.answerCbQuery(); return; }
    const state = getState(ctx);
    state.waitingForCustom = 'color';
    state.customStepMessageId = ctx.callbackQuery.message.message_id;
    await ctx.answerCbQuery();
    await ctx.reply('✏️ Введите свои варианты цветов через запятую:', {
      ...Markup.keyboard([[BACK_TEXT], [CANCEL_TEXT]]).resize(),
    });
  }

  @Action(SIZE_CUSTOM_CB)
  async onSizeCustom(@Ctx() ctx: any) {
    if (ctx.wizard.cursor !== 4) { await ctx.answerCbQuery(); return; }
    const state = getState(ctx);
    state.waitingForCustom = 'size';
    state.customStepMessageId = ctx.callbackQuery.message.message_id;
    await ctx.answerCbQuery();
    await ctx.reply('✏️ Введите свои варианты размеров через запятую:', {
      ...Markup.keyboard([[BACK_TEXT], [CANCEL_TEXT]]).resize(),
    });
  }

  // Шаг 1: Ввод цены
  @WizardStep(1)
  async onPriceStep(@Ctx() ctx: any, @Message() msg: any) {
    const state = getState(ctx);

    if (msg?.text === CANCEL_TEXT) {
      await sendCancelConfirmation(ctx);
      return;
    }

    if (msg?.text === BACK_TEXT) {
      ctx.wizard.cursor = 0;
      await removeReplyKeyboard(ctx);
      await sendSuitTypeKeyboard(ctx, state.submission.type);
      return;
    }

    const text = (msg?.text as string)?.trim();
    if (!text || !PRICE_RE.test(text)) {
      await ctx.reply(
        `⚠️ Неверный формат. Введите цену и валюту через пробел:\n\n` +
          `_Примеры: 500 сом · 1200 рубль · 15 доллар_`,
        { parse_mode: 'Markdown' },
      );
      return;
    }

    state.submission.price = text;
    ctx.wizard.next();
    await removeReplyKeyboard(ctx);
    await sendMaterialsKeyboard(ctx, state.selectedMaterials);
  }

  // Шаг 2: Кастомный ввод материалов
  @WizardStep(2)
  async onStep2(@Ctx() ctx: any, @Message() msg: any) {
    const state = getState(ctx);
    if (!state.waitingForCustom) return;
    if (msg?.text === CANCEL_TEXT) {
      await sendCancelConfirmation(ctx);
      return;
    }
    if (msg?.text === BACK_TEXT) {
      state.waitingForCustom = null;
      state.customStepMessageId = null;
      await removeReplyKeyboard(ctx);
      await sendMaterialsKeyboard(ctx, state.selectedMaterials);
      return;
    }
    const customs = (msg?.text as string)?.split(',').map((s) => s.trim()).filter(Boolean);
    if (!customs?.length) { await ctx.reply('Введите хотя бы один вариант через запятую.'); return; }
    const added: string[] = [];
    for (const c of customs) {
      if (!state.selectedMaterials.includes(c)) { state.selectedMaterials.push(c); added.push(c); }
    }
    state.waitingForCustom = null;
    state.customStepMessageId = null;
    await removeReplyKeyboard(ctx);
    await ctx.reply(
      `✅ Добавлено: *${added.join(', ')}*\n\nВыберите ещё из списка выше или нажмите *Готово*`,
      { parse_mode: 'Markdown', ...Markup.inlineKeyboard([Markup.button.callback('✅ Готово', DONE_CB)]) },
    );
  }

  // Шаг 3: Кастомный ввод цветов
  @WizardStep(3)
  async onStep3(@Ctx() ctx: any, @Message() msg: any) {
    const state = getState(ctx);
    if (!state.waitingForCustom) return;
    if (msg?.text === CANCEL_TEXT) {
      await sendCancelConfirmation(ctx);
      return;
    }
    if (msg?.text === BACK_TEXT) {
      state.waitingForCustom = null;
      state.customStepMessageId = null;
      await removeReplyKeyboard(ctx);
      await sendColorsKeyboard(ctx, state.selectedColors);
      return;
    }
    const customs = (msg?.text as string)?.split(',').map((s) => s.trim()).filter(Boolean);
    if (!customs?.length) { await ctx.reply('Введите хотя бы один вариант через запятую.'); return; }
    const added: string[] = [];
    for (const c of customs) {
      if (!state.selectedColors.includes(c)) { state.selectedColors.push(c); added.push(c); }
    }
    state.waitingForCustom = null;
    state.customStepMessageId = null;
    await removeReplyKeyboard(ctx);
    await ctx.reply(
      `✅ Добавлено: *${added.join(', ')}*\n\nВыберите ещё из списка выше или нажмите *Готово*`,
      { parse_mode: 'Markdown', ...Markup.inlineKeyboard([Markup.button.callback('✅ Готово', DONE_CB)]) },
    );
  }

  // Шаг 4: Кастомный ввод размеров
  @WizardStep(4)
  async onStep4(@Ctx() ctx: any, @Message() msg: any) {
    const state = getState(ctx);
    if (!state.waitingForCustom) return;
    if (msg?.text === CANCEL_TEXT) {
      await sendCancelConfirmation(ctx);
      return;
    }
    if (msg?.text === BACK_TEXT) {
      state.waitingForCustom = null;
      state.customStepMessageId = null;
      await removeReplyKeyboard(ctx);
      await sendSizesKeyboard(ctx, state.selectedSizes);
      return;
    }
    const customs = (msg?.text as string)?.split(',').map((s) => s.trim()).filter(Boolean);
    if (!customs?.length) { await ctx.reply('Введите хотя бы один вариант через запятую.'); return; }
    const added: string[] = [];
    for (const c of customs) {
      if (!state.selectedSizes.includes(c)) { state.selectedSizes.push(c); added.push(c); }
    }
    state.waitingForCustom = null;
    state.customStepMessageId = null;
    await removeReplyKeyboard(ctx);
    await ctx.reply(
      `✅ Добавлено: *${added.join(', ')}*\n\nВыберите ещё из списка выше или нажмите *Готово*`,
      { parse_mode: 'Markdown', ...Markup.inlineKeyboard([Markup.button.callback('✅ Готово', DONE_CB)]) },
    );
  }

  // Шаг 5: Главное фото
  @WizardStep(5)
  async onMainPhotoStep(@Ctx() ctx: any, @Message() msg: any) {
    const state = getState(ctx);

    if (msg?.text === CANCEL_TEXT) {
      await sendCancelConfirmation(ctx);
      return;
    }

    if (msg?.text === BACK_TEXT) {
      state.mainPhoto = null;
      state.submission.photos = undefined;
      ctx.wizard.cursor = 4;
      await removeReplyKeyboard(ctx);
      await sendSizesKeyboard(ctx, state.selectedSizes);
      return;
    }

    if (msg?.text === DONE_TEXT) {
      if (!state.mainPhoto) { await ctx.reply('📸 Сначала отправьте главное фото.'); return; }
      state.submission.photos = [state.mainPhoto];
      ctx.wizard.next();
      await sendDescriptionPrompt(ctx);
      return;
    }

    const photo = msg?.photo;
    if (!photo) { await ctx.reply(`Пожалуйста, отправьте фото или нажмите "${DONE_TEXT}".`); return; }
    state.mainPhoto = photo[photo.length - 1].file_id as string;
    await ctx.reply(`✅ Главное фото добавлено. Нажмите *"${DONE_TEXT}"* для продолжения.`, { parse_mode: 'Markdown' });
  }

  // Шаг 6: Описание
  @WizardStep(6)
  async onDescriptionStep(@Ctx() ctx: any, @Message() msg: any) {
    const state = getState(ctx);

    if (msg?.text === CANCEL_TEXT) {
      await sendCancelConfirmation(ctx);
      return;
    }

    if (msg?.text === BACK_TEXT) {
      state.submission.description = undefined;
      ctx.wizard.cursor = 5;
      await removeReplyKeyboard(ctx);
      await sendMainPhotoPrompt(ctx);
      return;
    }

    if (msg?.text === SKIP_TEXT) {
      state.submission.description = undefined;
      ctx.wizard.next();
      await sendExtraPhotosPrompt(ctx);
      return;
    }

    const text = (msg?.text as string)?.trim();
    if (!text) { await ctx.reply(`Введите описание или нажмите "${SKIP_TEXT}".`); return; }
    state.submission.description = text;
    ctx.wizard.next();
    await removeReplyKeyboard(ctx);
    await sendExtraPhotosPrompt(ctx);
  }

  // Шаг 7: Дополнительные фото
  @WizardStep(7)
  async onExtraPhotosStep(@Ctx() ctx: any, @Message() msg: any) {
    const state = getState(ctx);

    if (msg?.text === CANCEL_TEXT) {
      await sendCancelConfirmation(ctx);
      return;
    }

    if (msg?.text === BACK_TEXT) {
      state.mainPhoto = null;
      state.submission.photos = undefined;
      ctx.wizard.cursor = 6;
      await removeReplyKeyboard(ctx);
      await sendDescriptionPrompt(ctx);
      return;
    }

    if (msg?.text === SKIP_TEXT || msg?.text === DONE_TEXT) {
      state.submission.extraPhotos = [...state.extraPhotos];
      await this.finish(ctx, state);
      return;
    }

    const photo = msg?.photo;
    if (!photo) { await ctx.reply(`Отправьте фото или нажмите "${SKIP_TEXT}".`); return; }
    if (state.extraPhotos.length >= MAX_EXTRA_PHOTOS) {
      await ctx.reply(`Максимум ${MAX_EXTRA_PHOTOS} фото. Нажмите "${DONE_TEXT}" для завершения.`);
      return;
    }
    state.extraPhotos.push(photo[photo.length - 1].file_id as string);
    await ctx.reply(`✅ Фото добавлено (${state.extraPhotos.length}/${MAX_EXTRA_PHOTOS}). Ещё или "${DONE_TEXT}".`);
  }

  // ─── Показать шаг по номеру (навигация Назад) ─────────────────────────────────
  private async showStep(ctx: any, step: number) {
    const state = getState(ctx);
    switch (step) {
      case 0: return sendSuitTypeKeyboard(ctx, state.submission.type);
      case 1: return sendPricePrompt(ctx);
      case 2: return sendMaterialsKeyboard(ctx, state.selectedMaterials);
      case 3: return sendColorsKeyboard(ctx, state.selectedColors);
      case 4: return sendSizesKeyboard(ctx, state.selectedSizes);
      case 6: return sendDescriptionPrompt(ctx);
    }
  }

  // ─── Итог ─────────────────────────────────────────────────────────────────────
  private async finish(ctx: any, state: WizardState) {
    const s = state.submission;

    const lastMsgId: number = ctx.message?.message_id ?? 0;
    const firstId = ctx.session.__wizFirstMsgId as number | undefined;
    if (firstId && lastMsgId) {
      const ids = Array.from({ length: lastMsgId - firstId + 2 }, (_, i) => firstId - 1 + i);
      const tryDel = async (id: number): Promise<void> => {
        try { await ctx.telegram.deleteMessage(ctx.chat.id, id); } catch { /* ignore */ }
      };
      await Promise.all(ids.map(tryDel));
    }

    const photoUrls = await this.fileStorage.saveMany(s.photos ?? []);
    const extraPhotoUrls = await this.fileStorage.saveMany(s.extraPhotos ?? []);

    const saved = await this.productsService.create({
      type: s.type!,
      price: s.price!,
      materials: s.materials ?? [],
      colors: s.colors ?? [],
      sizes: s.sizes ?? [],
      description: s.description ?? null,
      photos: photoUrls,
      extraPhotos: extraPhotoUrls,
    });

    const descPreview = s.description
      ? (s.description.length > 300 ? s.description.slice(0, 300) + '…' : s.description)
      : null;

    const caption =
      `✅ *Товар добавлен!*\n\n` +
      `👔 *Тип:* ${s.type}\n` +
      `💰 *Цена:* ${s.price}\n` +
      `🧵 *Материалы:* ${s.materials?.join(', ')}\n` +
      `🎨 *Цвета:* ${s.colors?.join(', ')}\n` +
      `📏 *Размеры:* ${s.sizes?.join(', ')}\n` +
      (descPreview ? `📝 *Описание:* ${descPreview}\n` : '') +
      `📷 *Доп. фото:* ${extraPhotoUrls.length}\n` +
      `🆔 ID: \`${saved.id}\``;

    await ctx.replyWithPhoto(s.photos![0], {
      caption,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✏️ Изменить карточку', callback_data: `edit_product:${saved.id}` },
            { text: '🗑 Удалить', callback_data: `del_ask_new:${saved.id}` },
          ],
          [{ text: '📢 Опубликовать', callback_data: `publish:${saved.id}` }],
        ],
      },
    });
    await ctx.reply('Выберите действие:', { reply_markup: MAIN_KEYBOARD });
    await ctx.scene.leave();
  }
}

// ═══ Утилиты ══════════════════════════════════════════════════════════════════

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
  const bottomRow = [
    Markup.button.callback('◀️ Назад', BACK_CB),
    ...(customCb ? [Markup.button.callback('✏️ Свой вариант', customCb)] : []),
    Markup.button.callback('✅ Готово', DONE_CB),
  ];
  rows.push(bottomRow);
  rows.push([Markup.button.callback('❌ Отмена', CANCEL_CB)]);
  return Markup.inlineKeyboard(rows);
}

// ─── Функции отображения каждого шага ─────────────────────────────────────────

async function sendSuitTypeKeyboard(
  ctx: any,
  selected: string | undefined,
): Promise<{ message_id: number }> {
  const buttons = SUIT_TYPES.map((t, i) => [
    Markup.button.callback(selected === t ? `✅ ${t}` : t, `type:${i}`),
  ]);
  buttons.push([Markup.button.callback('❌ Отмена', CANCEL_CB)]);
  return (await ctx.reply('👔 *Шаг 1 из 8* — Выберите тип костюма:', {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons),
  })) as { message_id: number };
}

async function sendPricePrompt(ctx: any) {
  await ctx.reply(
    '💰 *Шаг 2 из 8* — Введите цену и валюту через пробел:\n\n' +
      '_Примеры: 500 сом · 1200 рубль · 15 доллар_',
    { parse_mode: 'Markdown', ...Markup.keyboard([[BACK_TEXT], [CANCEL_TEXT]]).resize() },
  );
}

async function sendMaterialsKeyboard(ctx: any, selected: string[]) {
  await ctx.reply(
    '🧵 *Шаг 3 из 8* — Выберите материал(ы):\n_Можно выбрать несколько_',
    { parse_mode: 'Markdown', ...multiSelectMarkup(MATERIALS, selected, 'mat', MAT_CUSTOM_CB) },
  );
}

async function sendColorsKeyboard(ctx: any, selected: string[]) {
  await ctx.reply(
    '🎨 *Шаг 4 из 8* — Выберите цвет(а):\n_Можно выбрать несколько_',
    { parse_mode: 'Markdown', ...multiSelectMarkup(COLORS, selected, 'col', COL_CUSTOM_CB) },
  );
}

async function sendSizesKeyboard(ctx: any, selected: string[]) {
  await ctx.reply(
    '📏 *Шаг 5 из 8* — Выберите размер(ы):\n_Можно выбрать несколько_',
    { parse_mode: 'Markdown', ...multiSelectMarkup(SIZES.default, selected, 'size', SIZE_CUSTOM_CB) },
  );
}

async function sendMainPhotoPrompt(ctx: any) {
  await ctx.reply(
    '📸 *Шаг 6 из 8* — Отправьте главное фото товара:\n_Одно фото_',
    { parse_mode: 'Markdown', ...Markup.keyboard([[BACK_TEXT, DONE_TEXT], [CANCEL_TEXT]]).resize() },
  );
}

async function sendDescriptionPrompt(ctx: any) {
  await ctx.reply('📝 *Шаг 7 из 8* — Описание товара:\n_Необязательно_', {
    parse_mode: 'Markdown',
    ...Markup.keyboard([[BACK_TEXT], [SKIP_TEXT], [CANCEL_TEXT]]).resize(),
  });
}

async function sendExtraPhotosPrompt(ctx: any) {
  await ctx.reply(
    `📷 *Шаг 8 из 8* — Дополнительные фото (до ${MAX_EXTRA_PHOTOS}):\n_Необязательно_`,
    { parse_mode: 'Markdown', ...Markup.keyboard([[BACK_TEXT], [SKIP_TEXT, DONE_TEXT], [CANCEL_TEXT]]).resize() },
  );
}

async function sendCancelConfirmation(ctx: any) {
  await ctx.reply(
    '⚠️ *Вы уверены, что хотите отменить?*\n\nВсе введённые данные будут потеряны.',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Да, отменить', CANCEL_CONFIRM_CB),
          Markup.button.callback('🔙 Нет, продолжить', CANCEL_ABORT_CB),
        ],
      ]),
    },
  );
}

async function removeReplyKeyboard(ctx: any) {
  const msg: any = await ctx.reply('↩️', Markup.removeKeyboard());
  await ctx.deleteMessage(msg.message_id);
}
