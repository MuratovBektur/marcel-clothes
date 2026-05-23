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
  CATEGORIES,
  COLORS,
  COUNTRIES,
  COUNTRY_OTHER_CB,
  GENDER_CATEGORIES,
  GENDER_TYPE_EXCLUSIONS,
  GENDERS,
  KIDS_GENDERS,
  MATERIALS,
  MAX_EXTRA_PHOTOS,
  OWN_PRODUCTION,
  POPULAR_BRANDS,
  SHOES_CATEGORY,
  SIZES,
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
const BRAND_CUSTOM_CB = 'brand_custom';
const MAT_CUSTOM_CB = 'mat_custom';
const COL_CUSTOM_CB = 'col_custom';
const SIZE_CUSTOM_CB = 'size_custom';

// ─── Reply keyboard labels ────────────────────────────────────────────────────
const BACK_TEXT = '◀️ Назад';
const DONE_TEXT = '✅ Готово';
const SKIP_TEXT = '⏭ Пропустить';

// ─── Cursor → шаг ─────────────────────────────────────────────────────────────
// 0  = Пол           (inline)
// 1  = Категория     (inline, фильтр по полу)
// 2  = Тип           (inline)
// 3  = Бренд         (inline + text через WizardStep(3))
// 4  = Страна        (inline + text через WizardStep(4))
// 5  = Цена          (text через WizardStep(5))
// 6  = Материалы     (inline, multi + text)
// 7  = Цвета         (inline, multi + text)
// 8  = Размеры       (inline, multi + text)
// 9  = Главное фото  (WizardStep(9))
// 10 = Описание      (WizardStep(10))
// 11 = Доп. фото     (WizardStep(11))

// ─── State ────────────────────────────────────────────────────────────────────
interface WizardState {
  submission: Partial<ClothingSubmission>;
  waitingForCustomBrand: boolean;
  waitingForCustomCountry: boolean;
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
      waitingForCustomBrand: false,
      waitingForCustomCountry: false,
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
    const firstMsg = await sendGenderKeyboard(ctx, undefined);
    ctx.session.__wizFirstMsgId = firstMsg.message_id;
  }

  // ═══ INLINE ACTIONS ══════════════════════════════════════════════════════════

  @Action(CANCEL_CB)
  async onCancel(@Ctx() ctx: any) {
    await ctx.answerCbQuery('❌ Отменено');
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.reply('Добавление товара отменено.', { reply_markup: MAIN_KEYBOARD });
    await ctx.scene.leave();
  }

  // cursor 0 — Пол
  @Action(/^gender:(.+)/)
  async onGenderSelect(@Ctx() ctx: any) {
    if (ctx.wizard.cursor !== 0) { await ctx.answerCbQuery(); return; }
    const gender = (ctx.callbackQuery.data as string).replace('gender:', '');
    const state = getState(ctx);
    state.submission.gender = gender;
    state.submission.category = undefined;
    state.submission.type = undefined;
    ctx.wizard.next();
    await ctx.answerCbQuery(`✅ ${gender}`);
    await sendCategoryKeyboard(ctx, gender, state.submission.category);
  }

  // cursor 1 — Категория
  @Action(/^cat:(.+)/)
  async onCategorySelect(@Ctx() ctx: any) {
    if (ctx.wizard.cursor !== 1) { await ctx.answerCbQuery(); return; }
    const category = (ctx.callbackQuery.data as string).replace('cat:', '');
    const state = getState(ctx);
    state.submission.category = category;
    state.submission.type = undefined;
    ctx.wizard.next();
    await ctx.answerCbQuery(`✅ ${category}`);
    await sendTypeKeyboard(ctx, category, state.submission.type, state.submission.gender);
  }

  // cursor 2 — Тип
  @Action(/^type:(.+)/)
  async onTypeSelect(@Ctx() ctx: any) {
    if (ctx.wizard.cursor !== 2) { await ctx.answerCbQuery(); return; }
    const type = (ctx.callbackQuery.data as string).replace('type:', '');
    const state = getState(ctx);
    state.submission.type = type;
    ctx.wizard.next();
    await ctx.answerCbQuery(`✅ ${type}`);
    const customBrands = await this.productsService.getCustomBrands();
    await sendBrandKeyboard(ctx, customBrands, state.submission.brand);
  }

  // cursor 3 — Бренд: выбор из списка
  @Action(/^brand:(.+)/)
  async onBrandSelect(@Ctx() ctx: any) {
    if (ctx.wizard.cursor !== 3) { await ctx.answerCbQuery(); return; }
    const brand = (ctx.callbackQuery.data as string).replace('brand:', '');
    const state = getState(ctx);
    state.submission.brand = brand;
    state.waitingForCustomBrand = false;
    ctx.wizard.next();
    await ctx.answerCbQuery(`✅ ${brand}`);
    await sendCountryKeyboard(ctx, state.submission.country);
  }

  // cursor 3 — Бренд: "Свой вариант"
  @Action(BRAND_CUSTOM_CB)
  async onBrandCustom(@Ctx() ctx: any) {
    if (ctx.wizard.cursor !== 3) { await ctx.answerCbQuery(); return; }
    const state = getState(ctx);
    state.waitingForCustomBrand = true;
    await ctx.answerCbQuery();
    await ctx.reply('✏️ Введите название бренда:', {
      ...Markup.keyboard([[BACK_TEXT]]).resize(),
    });
  }

  // cursor 4 — Страна: выбор из списка
  @Action(/^country:(.+)/)
  async onCountrySelect(@Ctx() ctx: any) {
    if (ctx.wizard.cursor !== 4) { await ctx.answerCbQuery(); return; }
    const country = (ctx.callbackQuery.data as string).replace('country:', '');
    const state = getState(ctx);
    state.submission.country = country;
    state.waitingForCustomCountry = false;
    ctx.wizard.next();
    await ctx.answerCbQuery(`✅ ${country}`);
    await sendPricePrompt(ctx);
  }

  // cursor 4 — Страна: "Другое"
  @Action(COUNTRY_OTHER_CB)
  async onCountryOther(@Ctx() ctx: any) {
    if (ctx.wizard.cursor !== 4) { await ctx.answerCbQuery(); return; }
    const state = getState(ctx);
    state.waitingForCustomCountry = true;
    await ctx.answerCbQuery();
    await ctx.reply('✏️ Введите страну производства:', {
      ...Markup.keyboard([[BACK_TEXT]]).resize(),
    });
  }

  // cursor 6 — Материалы (toggle)
  @Action(/^mat:(.+)/)
  async onMaterialToggle(@Ctx() ctx: any) {
    if (ctx.wizard.cursor !== 6) { await ctx.answerCbQuery(); return; }
    const mat = (ctx.callbackQuery.data as string).replace('mat:', '');
    const state = getState(ctx);
    toggle(state.selectedMaterials, mat);
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(
      multiSelectMarkup(MATERIALS, state.selectedMaterials, 'mat', MAT_CUSTOM_CB).reply_markup,
    );
  }

  // cursor 7 — Цвета (toggle)
  @Action(/^col:(.+)/)
  async onColorToggle(@Ctx() ctx: any) {
    if (ctx.wizard.cursor !== 7) { await ctx.answerCbQuery(); return; }
    const col = (ctx.callbackQuery.data as string).replace('col:', '');
    const state = getState(ctx);
    toggle(state.selectedColors, col);
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(
      multiSelectMarkup(COLORS, state.selectedColors, 'col', COL_CUSTOM_CB).reply_markup,
    );
  }

  // cursor 8 — Размеры (toggle)
  @Action(/^size:(.+)/)
  async onSizeToggle(@Ctx() ctx: any) {
    if (ctx.wizard.cursor !== 8) { await ctx.answerCbQuery(); return; }
    const size = (ctx.callbackQuery.data as string).replace('size:', '');
    const state = getState(ctx);
    toggle(state.selectedSizes, size);
    await ctx.answerCbQuery();
    const sizeList = getSizeList(state.submission.category, state.submission.gender);
    await ctx.editMessageReplyMarkup(
      multiSelectMarkup(sizeList, state.selectedSizes, 'size', SIZE_CUSTOM_CB).reply_markup,
    );
  }

  // ─── "✅ Готово" для multi-select (cursor 6, 7, 8) ───────────────────────────
  @Action(DONE_CB)
  async onDone(@Ctx() ctx: any) {
    const cursor = ctx.wizard.cursor;
    const state = getState(ctx);

    if (cursor === 6) {
      if (!state.selectedMaterials.length) {
        await ctx.answerCbQuery('Выберите хотя бы один материал!', { show_alert: true });
        return;
      }
      state.submission.materials = [...state.selectedMaterials];
      ctx.wizard.next();
      await ctx.answerCbQuery();
      await sendColorsKeyboard(ctx, state.selectedColors);
    } else if (cursor === 7) {
      if (!state.selectedColors.length) {
        await ctx.answerCbQuery('Выберите хотя бы один цвет!', { show_alert: true });
        return;
      }
      state.submission.colors = [...state.selectedColors];
      ctx.wizard.next();
      await ctx.answerCbQuery();
      await sendSizesKeyboard(ctx, state);
    } else if (cursor === 8) {
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

  // ─── "◀️ Назад" для inline-шагов (cursor 1, 2, 3, 4, 6, 7, 8) ───────────────
  @Action(BACK_CB)
  async onBackInline(@Ctx() ctx: any) {
    const cursor = ctx.wizard.cursor;
    const inlineCursors = [1, 2, 3, 4, 6, 7, 8];
    if (!inlineCursors.includes(cursor)) { await ctx.answerCbQuery(); return; }
    ctx.wizard.cursor = cursor - 1;
    await ctx.answerCbQuery('◀️');
    await this.showStep(ctx, cursor - 1);
  }

  // ═══ WIZARD STEPS ════════════════════════════════════════════════════════════

  // Заглушки для inline-шагов (0–2)
  @WizardStep(0) async onStep0() {}
  @WizardStep(1) async onStep1() {}
  @WizardStep(2) async onStep2() {}

  // Обработчики "Свой вариант" для multi-select
  @Action(MAT_CUSTOM_CB)
  async onMaterialCustom(@Ctx() ctx: any) {
    if (ctx.wizard.cursor !== 6) { await ctx.answerCbQuery(); return; }
    const state = getState(ctx);
    state.waitingForCustom = 'material';
    state.customStepMessageId = ctx.callbackQuery.message.message_id;
    await ctx.answerCbQuery();
    await ctx.reply('✏️ Введите свои варианты материалов через запятую:', {
      ...Markup.keyboard([[BACK_TEXT]]).resize(),
    });
  }

  @Action(COL_CUSTOM_CB)
  async onColorCustom(@Ctx() ctx: any) {
    if (ctx.wizard.cursor !== 7) { await ctx.answerCbQuery(); return; }
    const state = getState(ctx);
    state.waitingForCustom = 'color';
    state.customStepMessageId = ctx.callbackQuery.message.message_id;
    await ctx.answerCbQuery();
    await ctx.reply('✏️ Введите свои варианты цветов через запятую:', {
      ...Markup.keyboard([[BACK_TEXT]]).resize(),
    });
  }

  @Action(SIZE_CUSTOM_CB)
  async onSizeCustom(@Ctx() ctx: any) {
    if (ctx.wizard.cursor !== 8) { await ctx.answerCbQuery(); return; }
    const state = getState(ctx);
    state.waitingForCustom = 'size';
    state.customStepMessageId = ctx.callbackQuery.message.message_id;
    await ctx.answerCbQuery();
    await ctx.reply('✏️ Введите свои варианты размеров через запятую:', {
      ...Markup.keyboard([[BACK_TEXT]]).resize(),
    });
  }

  // Шаг 3: Ввод бренда вручную (только когда waitingForCustomBrand = true)
  @WizardStep(3)
  async onBrandTextStep(@Ctx() ctx: any, @Message() msg: any) {
    const state = getState(ctx);

    if (msg?.text === BACK_TEXT) {
      state.waitingForCustomBrand = false;
      ctx.wizard.cursor = 2;
      await removeReplyKeyboard(ctx);
      await sendTypeKeyboard(
        ctx,
        state.submission.category!,
        state.submission.type,
        state.submission.gender,
      );
      return;
    }

    if (!state.waitingForCustomBrand) return;

    const brand = (msg?.text as string)?.trim();
    if (!brand) {
      await ctx.reply('Введите название бренда:');
      return;
    }

    state.submission.brand = brand;
    state.waitingForCustomBrand = false;
    ctx.wizard.next();
    await removeReplyKeyboard(ctx);
    await sendCountryKeyboard(ctx, state.submission.country);
  }

  // Шаг 4: Ввод страны вручную (только когда waitingForCustomCountry = true)
  @WizardStep(4)
  async onCountryTextStep(@Ctx() ctx: any, @Message() msg: any) {
    const state = getState(ctx);

    if (msg?.text === BACK_TEXT) {
      state.waitingForCustomCountry = false;
      ctx.wizard.cursor = 3;
      await removeReplyKeyboard(ctx);
      const customBrands = await this.productsService.getCustomBrands();
      await sendBrandKeyboard(ctx, customBrands, state.submission.brand);
      return;
    }

    if (!state.waitingForCustomCountry) return;

    const country = (msg?.text as string)?.trim();
    if (!country) {
      await ctx.reply('Введите название страны производства:');
      return;
    }

    state.submission.country = country;
    state.waitingForCustomCountry = false;
    ctx.wizard.next();
    await removeReplyKeyboard(ctx);
    await sendPricePrompt(ctx);
  }

  // Шаг 5: Ввод цены
  @WizardStep(5)
  async onPriceStep(@Ctx() ctx: any, @Message() msg: any) {
    const state = getState(ctx);

    if (msg?.text === BACK_TEXT) {
      ctx.wizard.cursor = 4;
      await removeReplyKeyboard(ctx);
      await sendCountryKeyboard(ctx, state.submission.country);
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

  // Шаг 6: Кастомный ввод материалов
  @WizardStep(6)
  async onStep6(@Ctx() ctx: any, @Message() msg: any) {
    const state = getState(ctx);
    if (!state.waitingForCustom) return;
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

  // Шаг 7: Кастомный ввод цветов
  @WizardStep(7)
  async onStep7(@Ctx() ctx: any, @Message() msg: any) {
    const state = getState(ctx);
    if (!state.waitingForCustom) return;
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

  // Шаг 8: Кастомный ввод размеров
  @WizardStep(8)
  async onStep8(@Ctx() ctx: any, @Message() msg: any) {
    const state = getState(ctx);
    if (!state.waitingForCustom) return;
    if (msg?.text === BACK_TEXT) {
      state.waitingForCustom = null;
      state.customStepMessageId = null;
      await removeReplyKeyboard(ctx);
      await sendSizesKeyboard(ctx, state);
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

  // Шаг 9: Главное фото
  @WizardStep(9)
  async onMainPhotoStep(@Ctx() ctx: any, @Message() msg: any) {
    const state = getState(ctx);

    if (msg?.text === BACK_TEXT) {
      state.mainPhoto = null;
      state.submission.photos = undefined;
      ctx.wizard.cursor = 8;
      await removeReplyKeyboard(ctx);
      await sendSizesKeyboard(ctx, state);
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

  // Шаг 10: Описание
  @WizardStep(10)
  async onDescriptionStep(@Ctx() ctx: any, @Message() msg: any) {
    const state = getState(ctx);

    if (msg?.text === BACK_TEXT) {
      state.submission.description = undefined;
      ctx.wizard.cursor = 9;
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

  // Шаг 11: Дополнительные фото
  @WizardStep(11)
  async onExtraPhotosStep(@Ctx() ctx: any, @Message() msg: any) {
    const state = getState(ctx);

    if (msg?.text === BACK_TEXT) {
      state.mainPhoto = null;
      state.submission.photos = undefined;
      ctx.wizard.cursor = 10;
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
      case 0: return sendGenderKeyboard(ctx, state.submission.gender);
      case 1: return sendCategoryKeyboard(ctx, state.submission.gender!, state.submission.category);
      case 2: return sendTypeKeyboard(ctx, state.submission.category!, state.submission.type, state.submission.gender);
      case 3: {
        const customBrands = await this.productsService.getCustomBrands();
        return sendBrandKeyboard(ctx, customBrands, state.submission.brand);
      }
      case 4: return sendCountryKeyboard(ctx, state.submission.country);
      case 5: return sendPricePrompt(ctx);
      case 6: return sendMaterialsKeyboard(ctx, state.selectedMaterials);
      case 7: return sendColorsKeyboard(ctx, state.selectedColors);
      case 8: return sendSizesKeyboard(ctx, state);
      case 10: return sendDescriptionPrompt(ctx);
    }
  }

  // ─── Итог ─────────────────────────────────────────────────────────────────────
  private async finish(ctx: any, state: WizardState) {
    const s = state.submission;

    if (!s.brand) {
      ctx.wizard.cursor = 3;
      const customBrands = await this.productsService.getCustomBrands();
      await ctx.reply('⚠️ Укажите бренд товара:');
      await sendBrandKeyboard(ctx, customBrands, undefined);
      return;
    }

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
      gender: s.gender!,
      category: s.category!,
      type: s.type!,
      brand: s.brand,
      country: s.country!,
      price: s.price!,
      materials: s.materials ?? [],
      colors: s.colors ?? [],
      sizes: s.sizes ?? [],
      description: s.description ?? null,
      photos: photoUrls,
      extraPhotos: extraPhotoUrls,
    });

    const caption =
      `✅ *Товар добавлен!*\n\n` +
      `👤 *Пол:* ${s.gender}\n` +
      `📂 *Категория:* ${s.category}\n` +
      `👔 *Тип:* ${s.type}\n` +
      (s.brand ? `🏷 *Бренд:* ${s.brand}\n` : '') +
      `🌍 *Страна:* ${s.country}\n` +
      `💰 *Цена:* ${s.price}\n` +
      `🧵 *Материалы:* ${s.materials?.join(', ')}\n` +
      `🎨 *Цвета:* ${s.colors?.join(', ')}\n` +
      `📏 *Размеры:* ${s.sizes?.join(', ')}\n` +
      (s.description ? `📝 *Описание:* ${s.description}\n` : '') +
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

function getSizeList(category?: string, gender?: string): string[] {
  if (category === SHOES_CATEGORY) return SIZES.shoes;
  if (gender && KIDS_GENDERS.includes(gender)) return SIZES.kids;
  return SIZES.default;
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
  return Markup.inlineKeyboard(rows);
}

// ─── Функции отображения каждого шага ─────────────────────────────────────────

async function sendGenderKeyboard(
  ctx: any,
  selected: string | undefined,
): Promise<{ message_id: number }> {
  const buttons = chunks(GENDERS, 2).map((row) =>
    row.map((g) =>
      Markup.button.callback(selected === g ? `✅ ${g}` : g, `gender:${g}`),
    ),
  );
  buttons.push([Markup.button.callback('❌ Отмена', CANCEL_CB)]);
  return (await ctx.reply('👤 *Шаг 1 из 12* — Выберите пол:', {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons),
  })) as { message_id: number };
}

async function sendCategoryKeyboard(ctx: any, gender: string, selected: string | undefined) {
  const allowed = GENDER_CATEGORIES[gender] ?? Object.keys(CATEGORIES);
  const buttons = chunks(allowed, 2).map((row) =>
    row.map((cat) =>
      Markup.button.callback(selected === cat ? `✅ ${cat}` : cat, `cat:${cat}`),
    ),
  );
  buttons.push([Markup.button.callback('◀️ Назад', BACK_CB)]);
  await ctx.reply('🗂 *Шаг 2 из 12* — Выберите категорию:', {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons),
  });
}

async function sendTypeKeyboard(
  ctx: any,
  category: string,
  selected: string | undefined,
  gender?: string,
) {
  const excluded = gender ? (GENDER_TYPE_EXCLUSIONS[gender]?.[category] ?? []) : [];
  const types = (CATEGORIES[category] ?? []).filter((t) => !excluded.includes(t));
  const buttons = chunks(types, 2).map((row) =>
    row.map((t) =>
      Markup.button.callback(selected === t ? `✅ ${t}` : t, `type:${t}`),
    ),
  );
  buttons.push([Markup.button.callback('◀️ Назад', BACK_CB)]);
  await ctx.reply(`👗 *Шаг 3 из 12* — Тип в категории "${category}":`, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons),
  });
}

async function sendBrandKeyboard(ctx: any, customBrands: string[], selected?: string) {
  // Пользовательские бренды (не из популярного списка) — первыми
  const userAdded = customBrands.filter((b) => !POPULAR_BRANDS.includes(b));
  const allBrands = [...userAdded, ...POPULAR_BRANDS];

  const buttons = chunks(allBrands, 2).map((row) =>
    row.map((b) =>
      Markup.button.callback(selected === b ? `✅ ${b}` : b, `brand:${b}`),
    ),
  );
  buttons.push([
    Markup.button.callback('◀️ Назад', BACK_CB),
    Markup.button.callback('✏️ Свой бренд', BRAND_CUSTOM_CB),
  ]);
  await ctx.reply('🏷 *Шаг 4 из 12* — Выберите бренд:', {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons),
  });
}

async function sendCountryKeyboard(ctx: any, selected: string | undefined) {
  const ownBtn = Markup.button.callback(
    selected === OWN_PRODUCTION ? `✅ 🏭 ${OWN_PRODUCTION}` : `🏭 ${OWN_PRODUCTION}`,
    `country:${OWN_PRODUCTION}`,
  );
  const countryButtons = chunks(COUNTRIES, 2).map((row) =>
    row.map((c) =>
      Markup.button.callback(selected === c ? `✅ ${c}` : c, `country:${c}`),
    ),
  );
  const bottomRow = [
    Markup.button.callback('◀️ Назад', BACK_CB),
    Markup.button.callback('✏️ Другое', COUNTRY_OTHER_CB),
  ];
  await ctx.reply('🌍 *Шаг 5 из 12* — Страна производства:', {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([[ownBtn], ...countryButtons, bottomRow]),
  });
}

async function sendPricePrompt(ctx: any) {
  await ctx.reply(
    '💰 *Шаг 6 из 12* — Введите цену и валюту через пробел:\n\n' +
      '_Примеры: 500 сом · 1200 рубль · 15 доллар_',
    { parse_mode: 'Markdown', ...Markup.keyboard([[BACK_TEXT]]).resize() },
  );
}

async function sendMaterialsKeyboard(ctx: any, selected: string[]) {
  await ctx.reply(
    '🧵 *Шаг 7 из 12* — Выберите материал(ы):\n_Можно выбрать несколько_',
    { parse_mode: 'Markdown', ...multiSelectMarkup(MATERIALS, selected, 'mat', MAT_CUSTOM_CB) },
  );
}

async function sendColorsKeyboard(ctx: any, selected: string[]) {
  await ctx.reply(
    '🎨 *Шаг 8 из 12* — Выберите цвет(а):\n_Можно выбрать несколько_',
    { parse_mode: 'Markdown', ...multiSelectMarkup(COLORS, selected, 'col', COL_CUSTOM_CB) },
  );
}

async function sendSizesKeyboard(ctx: any, state: WizardState) {
  const sizeList = getSizeList(state.submission.category, state.submission.gender);
  await ctx.reply(
    '📏 *Шаг 9 из 12* — Выберите размер(ы):\n_Можно выбрать несколько_',
    { parse_mode: 'Markdown', ...multiSelectMarkup(sizeList, state.selectedSizes, 'size', SIZE_CUSTOM_CB) },
  );
}

async function sendMainPhotoPrompt(ctx: any) {
  await ctx.reply(
    '📸 *Шаг 10 из 12* — Отправьте главное фото товара:\n_Одно фото_',
    { parse_mode: 'Markdown', ...Markup.keyboard([[BACK_TEXT, DONE_TEXT]]).resize() },
  );
}

async function sendDescriptionPrompt(ctx: any) {
  await ctx.reply('📝 *Шаг 11 из 12* — Описание товара:\n_Необязательно_', {
    parse_mode: 'Markdown',
    ...Markup.keyboard([[BACK_TEXT], [SKIP_TEXT]]).resize(),
  });
}

async function sendExtraPhotosPrompt(ctx: any) {
  await ctx.reply(
    `📷 *Шаг 12 из 12* — Дополнительные фото (до ${MAX_EXTRA_PHOTOS}):\n_Необязательно_`,
    { parse_mode: 'Markdown', ...Markup.keyboard([[BACK_TEXT], [SKIP_TEXT, DONE_TEXT]]).resize() },
  );
}

async function removeReplyKeyboard(ctx: any) {
  const msg: any = await ctx.reply('↩️', Markup.removeKeyboard());
  await ctx.deleteMessage(msg.message_id);
}
