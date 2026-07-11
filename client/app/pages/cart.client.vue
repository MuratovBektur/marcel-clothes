<template>
  <div class="cart-page">
    <div class="cart-page__container">
    <Transition name="loader-fade">
      <div v-if="!isCartHydrated" class="cart-loader" aria-label="Загрузка">
        <span class="cart-loader__bar" />
        <span class="cart-loader__bar" />
        <span class="cart-loader__bar" />
      </div>
    </Transition>

    <Transition name="content-fade">
      <div v-if="isCartHydrated">
        <div class="cart-page__header">
          <div class="cart-page__header-left">
            <span class="cart-page__label">Оформление</span>
            <h1 class="cart-page__title">Корзина</h1>
          </div>
          <div class="cart-page__header-right">
            <span class="cart-page__count-num">{{ cartItems.length }}</span>
            <span class="cart-page__count-label">{{ pluralModels(cartItems.length) }}</span>
          </div>
        </div>

        <div class="cart-page__rule">
          <div class="cart-page__rule-fill" :style="{ width: cartItems.length ? '100%' : '0%' }" />
        </div>

        <template v-if="cartItems.length">
          <div class="cart-page__body">
            <!-- Items list -->
            <div class="cart-page__items">
              <div
                v-for="item in cartItems"
                :key="`${item.productId}_${item.color}_${item.size}`"
                class="cart-item"
              >
                <NuxtLink :to="`/product/${item.productId}`" class="cart-item__photo-wrap">
                  <img :src="imgVariant(item.photo, 'thumb')" :alt="item.productType" class="cart-item__photo" />
                </NuxtLink>
                <div class="cart-item__info">
                  <NuxtLink :to="`/product/${item.productId}`" class="cart-item__name">
                    {{ item.productType }}
                  </NuxtLink>
                  <div class="cart-item__variants">
                    <span class="cart-item__variant-tag">{{ item.color }}</span>
                    <span class="cart-item__variant-tag">{{ item.size }}</span>
                  </div>
                  <div class="cart-item__price">{{ item.price }}</div>
                  <div class="cart-item__qty">
                    <button class="cart-item__qty-btn" @click="decrement(item.productId, item.color, item.size)" aria-label="Уменьшить">−</button>
                    <span class="cart-item__qty-val">{{ item.qty }}</span>
                    <button class="cart-item__qty-btn" @click="increment(item.productId, item.color, item.size)" aria-label="Увеличить">+</button>
                  </div>
                </div>
                <button class="cart-item__remove" @click="remove(item.productId, item.color, item.size)" aria-label="Удалить">
                  ✕
                </button>
              </div>

              <div class="cart-page__total">
                <span class="cart-page__total-label">Итого</span>
                <span class="cart-page__total-value">{{ totalLabel }}</span>
              </div>
            </div>

            <!-- Checkout form -->
            <form class="cart-form" @submit.prevent="submitOrder">
              <div class="cart-form__heading">Ваши данные</div>

              <div class="cart-form__field">
                <label class="cart-form__label" for="cart-name">Имя</label>
                <input
                  id="cart-name"
                  v-model="form.name"
                  class="cart-form__input"
                  :class="{ 'cart-form__input--error': errors.name }"
                  type="text"
                  placeholder="Введите имя"
                  autocomplete="name"
                />
                <span v-if="errors.name" class="cart-form__error">{{ errors.name }}</span>
              </div>

              <div class="cart-form__field">
                <label class="cart-form__label" for="cart-phone">Телефон</label>
                <input
                  id="cart-phone"
                  v-model="form.phone"
                  class="cart-form__input"
                  :class="{ 'cart-form__input--error': errors.phone }"
                  type="tel"
                  placeholder="+996 700 000 000"
                  autocomplete="tel"
                />
                <span v-if="errors.phone" class="cart-form__error">{{ errors.phone }}</span>
              </div>

              <button
                class="cart-form__submit"
                type="submit"
                :disabled="submitting"
              >
                <span v-if="submitting" class="cart-form__submit-spinner" />
                <span v-else>Оформить заказ →</span>
              </button>

              <p v-if="submitError" class="cart-form__submit-error">{{ submitError }}</p>
            </form>
          </div>
        </template>

        <div v-else class="cart-page__empty">
          <div class="cart-page__empty-graphic">
            <span class="cart-page__empty-icon">⊙</span>
          </div>
          <div class="cart-page__empty-body">
            <p class="cart-page__empty-title">Корзина пуста</p>
            <p class="cart-page__empty-sub">Добавьте товары из каталога</p>
            <NuxtLink to="/" class="cart-page__empty-btn">
              <span class="cart-page__empty-btn-arrow">→</span>
              В каталог
            </NuxtLink>
          </div>
        </div>
      </div>
    </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { imgVariant } from '~/libs/image-variants';
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] });

const { cartItems, isCartHydrated, remove, increment, decrement, clear } = useCart();

const config = useRuntimeConfig();
const router = useRouter();

const form = ref({ name: '', phone: '' });
const errors = ref<{ name?: string; phone?: string }>({});
const submitting = ref(false);
const submitError = ref('');

const totalLabel = computed(() => {
  const prices = cartItems.value.map((i) => {
    const num = parseFloat(i.price.replace(/[^\d.]/g, ''));
    const currency = i.price.replace(/[\d.,\s]/g, '').trim();
    return { num: isNaN(num) ? 0 : num * i.qty, currency };
  });
  if (!prices.length) return '';
  const total = prices.reduce((s, p) => s + p.num, 0);
  const currency = prices[0]?.currency ?? '';
  return `${total.toLocaleString('ru-RU')} ${currency}`.trim();
});

function pluralModels(n: number): string {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'модель';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'модели';
  return 'моделей';
}

function validate(): boolean {
  errors.value = {};
  if (!form.value.name.trim()) errors.value.name = 'Введите имя';
  const phone = form.value.phone.replace(/\D/g, '');
  if (phone.length < 7) errors.value.phone = 'Введите корректный номер';
  return !errors.value.name && !errors.value.phone;
}

async function submitOrder() {
  if (!validate()) return;
  submitting.value = true;
  submitError.value = '';
  try {
    const baseURL = config.public.apiBase as string;
    await $fetch('/api/orders', {
      method: 'POST',
      baseURL,
      body: {
        customerName: form.value.name.trim(),
        customerPhone: form.value.phone.trim(),
        items: cartItems.value.map((i) => ({
          productId: i.productId,
          productType: i.productType,
          price: i.price,
          qty: i.qty,
          photo: i.photo,
        })),
        total: totalLabel.value,
      },
    });
    clear();
    router.push('/order-success');
  } catch {
    submitError.value = 'Не удалось отправить заказ. Попробуйте ещё раз.';
  } finally {
    submitting.value = false;
  }
}
</script>

<style lang="scss" scoped>
.loader-fade-leave-active {
  transition: opacity 0.2s ease;
}
.loader-fade-leave-to {
  opacity: 0;
}
.content-fade-enter-active {
  transition: opacity 0.25s ease 0.05s;
}
.content-fade-enter-from {
  opacity: 0;
}

.cart-loader {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: flex-end;
  gap: 5px;

  &__bar {
    display: block;
    width: 3px;
    background: $navy;
    animation: loader-bounce 0.9s ease-in-out infinite;

    &:nth-child(1) { height: 20px; animation-delay: 0s; }
    &:nth-child(2) { height: 32px; animation-delay: 0.15s; }
    &:nth-child(3) { height: 20px; animation-delay: 0.3s; }
  }
}

@keyframes loader-bounce {
  0%, 100% { transform: scaleY(0.5); opacity: 0.3; }
  50% { transform: scaleY(1); opacity: 1; }
}

.cart-page {
  min-height: calc(100vh - 64px);
  position: relative;

  &__container {
    max-width: $container-max-width;
    margin: 0 auto;
    padding: 0 48px 80px;
  }

  &__header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding-top: 48px;
    padding-bottom: 20px;
  }

  &__label {
    display: block;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: #aaa;
    margin-bottom: 8px;
  }

  &__title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 72px;
    letter-spacing: -2px;
    line-height: 0.9;
    color: $navy;
  }

  &__header-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    padding-bottom: 6px;
    gap: 2px;
  }

  &__count-num {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 48px;
    line-height: 1;
    color: $navy;
    letter-spacing: -1px;
  }

  &__count-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #aaa;
  }

  &__rule {
    height: 2px;
    background: $cream-3;
    margin-bottom: 36px;
    overflow: hidden;
  }

  &__rule-fill {
    height: 100%;
    background: $navy;
    transition: width 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  &__body {
    display: grid;
    grid-template-columns: 1fr 420px;
    gap: 48px;
    align-items: start;
  }

  &__items {
    display: flex;
    flex-direction: column;
    gap: 0;
    border: 1px solid $cream-3;
  }

  &__total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-top: 2px solid $navy;
    background: $cream-2;
  }

  &__total-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #888;
  }

  &__total-value {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 28px;
    letter-spacing: -0.5px;
    color: $navy;
  }

  &__empty {
    display: grid;
    grid-template-columns: 1fr 1fr;
    min-height: 400px;
    border: 1px solid $cream-3;
  }

  &__empty-graphic {
    display: flex;
    align-items: center;
    justify-content: center;
    background: $cream-2;
    border-right: 1px solid $cream-3;
  }

  &__empty-icon {
    font-size: 96px;
    color: $cream-3;
    line-height: 1;
  }

  &__empty-body {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 60px 52px;
  }

  &__empty-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 52px;
    letter-spacing: -1px;
    line-height: 1;
    color: $navy;
    margin-bottom: 16px;
  }

  &__empty-sub {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    line-height: 1.8;
    color: #888;
    margin-bottom: 40px;
  }

  &__empty-btn {
    display: inline-flex;
    align-items: center;
    gap: 14px;
    align-self: flex-start;
    background: $navy;
    color: $cream;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    padding: 14px 28px;
    text-decoration: none;
    border: 1.5px solid $navy;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: transparent;
      color: $navy;
    }
  }

  &__empty-btn-arrow {
    font-size: 14px;
  }

  @media (max-width: 1100px) {
    &__container { padding-inline: 28px; }
    &__body { grid-template-columns: 1fr; }
  }

  @media (max-width: 768px) {
    &__container { padding-inline: 16px; }
    &__title { font-size: 48px; }
    &__count-num { font-size: 32px; }
    &__empty { grid-template-columns: 1fr; }
    &__empty-graphic {
      border-right: none;
      border-bottom: 1px solid $cream-3;
      min-height: 120px;
    }
    &__empty-icon { font-size: 64px; }
    &__empty-body { padding: 32px 24px; }
  }
}

// ── Cart item ─────────────────────────────────────────────

.cart-item {
  display: grid;
  grid-template-columns: 96px 1fr auto;
  gap: 16px;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid $cream-3;

  &__photo-wrap {
    display: block;
    width: 96px;
    height: 120px;
    overflow: hidden;
    flex-shrink: 0;
  }

  &__photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__name {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    color: $navy;
    text-decoration: none;
    text-transform: uppercase;

    &:hover { color: $gold; }
  }

  &__variants {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  &__variant-tag {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #888;
    border: 1px solid #e0e0e0;
    padding: 2px 7px;
  }

  &__price {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 22px;
    letter-spacing: -0.5px;
    color: $navy;
  }

  &__qty {
    display: flex;
    align-items: center;
    border: 1px solid $cream-3;
    align-self: flex-start;
    margin-top: 4px;
  }

  &__qty-btn {
    background: none;
    border: none;
    width: 30px;
    height: 30px;
    font-size: 16px;
    font-weight: 300;
    color: $navy;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, color 0.15s;
    line-height: 1;

    &:hover {
      background: $navy;
      color: $cream;
    }
  }

  &__qty-val {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    font-weight: 700;
    color: $navy;
    min-width: 26px;
    text-align: center;
  }

  &__remove {
    background: none;
    border: none;
    font-size: 12px;
    color: #aaa;
    cursor: pointer;
    padding: 6px;
    line-height: 1;
    transition: color 0.15s;
    align-self: flex-start;

    &:hover { color: $navy; }
  }
}

// ── Checkout form ─────────────────────────────────────────

.cart-form {
  border: 1px solid $cream-3;
  padding: 36px;

  &__heading {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 32px;
    letter-spacing: -0.5px;
    color: $navy;
    margin-bottom: 28px;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 20px;
  }

  &__label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #aaa;
  }

  &__input {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: $navy;
    background: $cream;
    border: 1.5px solid $cream-3;
    padding: 12px 16px;
    outline: none;
    transition: border-color 0.15s;
    width: 100%;

    &:focus { border-color: $navy; }
    &--error { border-color: #c0392b; }

    &::placeholder { color: #bbb; }
  }

  &__error {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    color: #c0392b;
    letter-spacing: 1px;
  }

  &__submit {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    width: 100%;
    background: $navy;
    color: $cream;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    padding: 16px 28px;
    border: 1.5px solid $navy;
    cursor: pointer;
    margin-top: 8px;
    transition: background 0.15s, color 0.15s;

    &:hover:not(:disabled) {
      background: transparent;
      color: $navy;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  &__submit-spinner {
    display: block;
    width: 14px;
    height: 14px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  &__submit-error {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    color: #c0392b;
    letter-spacing: 1px;
    margin-top: 12px;
    text-align: center;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
