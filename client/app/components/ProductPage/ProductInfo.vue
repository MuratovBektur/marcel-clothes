<template>
  <div class="product-info">
    <!-- Breadcrumb meta -->
    <div class="product-info__meta">
      <span class="product-info__brand">{{ product.gender }} · {{ product.category }}</span>
    </div>

    <!-- Title -->
    <h1 class="product-info__name">{{ product.type }}</h1>

    <!-- Price -->
    <div class="product-info__price-block">
      <div class="product-info__price">{{ product.price }}</div>
    </div>

    <!-- Description -->
    <div v-if="product.description" class="product-info__desc">
      <p class="product-info__desc-line" style="white-space: pre-line">{{ product.description }}</p>
    </div>

    <!-- Specs -->
    <div class="product-info__specs">
      <div v-if="product.brand" class="product-info__spec">
        <span class="product-info__spec-label">Бренд</span>
        <span class="product-info__spec-value">{{ product.brand }}</span>
      </div>
      <div class="product-info__spec">
        <span class="product-info__spec-label">Материалы</span>
        <span class="product-info__spec-value">{{ product.materials.join(', ') }}</span>
      </div>
      <div class="product-info__spec">
        <span class="product-info__spec-label">Цвета</span>
        <div class="product-info__tags">
          <span v-for="c in product.colors" :key="c" class="product-info__tag">{{ c }}</span>
        </div>
      </div>
      <div class="product-info__spec">
        <span class="product-info__spec-label">Размеры</span>
        <div class="product-info__tags">
          <span v-for="s in product.sizes" :key="s" class="product-info__tag product-info__tag--size">{{ s }}</span>
        </div>
      </div>
    </div>

    <ClientOnly>
      <!-- Cart section -->
      <div class="product-info__cart-wrap">
        <div class="product-info__actions">
          <div v-if="cartItem" class="product-info__qty-solo">
            <button class="product-info__added-btn" @click="decrement(product.id)" aria-label="−">−</button>
            <span class="product-info__added-num">{{ cartItem.qty }}</span>
            <button class="product-info__added-btn" @click="increment(product.id)" aria-label="+">+</button>
          </div>
          <button v-else class="product-info__cart-btn" @click="addToCart">В корзину</button>
          <NuxtLink v-if="cartItem" to="/cart" class="product-info__cart-btn product-info__cart-btn--in">
            <span class="product-info__cart-arrow">→</span>
            Перейти в корзину
          </NuxtLink>
          <button
            class="product-info__cart-btn product-info__cart-btn--wish"
            :class="{ 'product-info__cart-btn--wish-active': isFav(product.id) }"
            @click="toggle(product.id)"
            :aria-label="isFav(product.id) ? 'Убрать из избранного' : 'В избранное'"
          >
            <span class="product-info__wish-icon">{{ isFav(product.id) ? '♥' : '♡' }}</span>
            {{ isFav(product.id) ? 'В избранном' : 'В избранное' }}
          </button>
        </div>
      </div>

      <!-- Social links -->
      <div class="product-info__socials">
        <a :href="instagramLink" target="_blank" rel="noopener" class="product-info__social-btn product-info__social-btn--instagram">Instagram</a>
        <a :href="whatsappLink"  target="_blank" rel="noopener" class="product-info__social-btn product-info__social-btn--whatsapp">WhatsApp</a>
        <a :href="telegramLink"  target="_blank" rel="noopener" class="product-info__social-btn product-info__social-btn--telegram">Telegram</a>
      </div>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import type { Product } from '~/composables/useProducts'
import { instagramLink, whatsappLink, telegramLink } from '~/constants/common'

const props = defineProps<{ product: Product }>()

const { add, increment, decrement, getProductItems } = useCart()
const cartItem = computed(() => getProductItems(props.product.id)[0] ?? null)

const { toggle, isFav } = useFavourites()

function addToCart() {
  add({
    productId:   props.product.id,
    productType: props.product.type,
    price:       props.product.price,
    photo:       props.product.photos[0] ?? '',
    color:       '',
    size:        '',
  })
}
</script>

<style lang="scss" scoped>
.product-info {
  padding: 44px 44px 60px;
  position: sticky;
  top: 64px;
  max-height: calc(100vh - 64px);
  overflow-y: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }

  &__meta { display: flex; align-items: center; margin-bottom: 12px; }

  &__brand {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px; letter-spacing: 3px; text-transform: uppercase;
    font-weight: 700; color: #888;
  }

  &__name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 48px; letter-spacing: -1px; line-height: 0.92;
    margin-bottom: 24px; color: #111;
  }

  &__price-block {
    padding-bottom: 24px; border-bottom: 1px solid #e0e0e0; margin-bottom: 28px;
  }

  &__price {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 44px; letter-spacing: -1px; line-height: 1; color: #111;
  }

  &__desc { margin-bottom: 28px; padding-bottom: 28px; border-bottom: 1px solid #e0e0e0; }

  &__desc-line {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; line-height: 1.85; color: #666; letter-spacing: 0.2px;
  }

  &__specs { display: flex; flex-direction: column; gap: 14px; margin-bottom: 28px; }

  &__spec { display: grid; grid-template-columns: 90px 1fr; gap: 12px; align-items: start; }

  &__spec-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px; letter-spacing: 2px; text-transform: uppercase;
    color: #aaa; padding-top: 3px;
  }

  &__spec-value { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #111; }

  &__tags { display: flex; flex-wrap: wrap; gap: 5px; }

  &__tag {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; padding: 3px 8px; border: 1px solid #e0e0e0; color: #888;
    &--size { border-color: #111; color: #111; font-weight: 600; }
  }

  // ── Cart wrap ──────────────────────────────────────────────

  &__cart-wrap { display: flex; flex-direction: column; gap: 16px; }

  // ── Added variants list ────────────────────────────────────

  &__added {
    display: flex;
    flex-direction: column;
    border-top: 2px solid #111;
    padding-bottom: 4px;
    position: relative;
  }

  &__added-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 0;
    border-bottom: 1px solid #f0f0f0;

    &:last-child { border-bottom: none; }
  }

  &__added-info {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__added-tag {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    color: #555;

    &--size { font-weight: 700; color: #111; }
  }

  &__added-sep {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    color: #ccc;
  }

  &__added-qty {
    display: flex;
    align-items: center;
    border: 1px solid #e0e0e0;
  }

  &__added-btn {
    background: none;
    border: none;
    width: 28px;
    height: 28px;
    font-size: 15px;
    font-weight: 300;
    color: #666;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background .12s, color .12s;
    line-height: 1;

    &:hover { background: #111; color: #fff; }
  }

  &__added-num {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    font-weight: 700;
    color: #111;
    min-width: 24px;
    text-align: center;
  }

  // ── Actions ────────────────────────────────────────────────

  &__actions { display: flex; flex-direction: column; gap: 8px; }

  &__qty-solo {
    display: flex;
    align-items: center;
    border: 1px solid #e0e0e0;
    align-self: flex-start;
  }

  &__cart-btn {
    display: inline-flex; align-items: center; gap: 12px; width: 100%;
    justify-content: center; background: #111; color: #fff;
    font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-weight: 700;
    letter-spacing: 3px; text-transform: uppercase; padding: 16px 20px;
    border: 1.5px solid #111; cursor: pointer; text-decoration: none;
    transition: background .15s, color .15s, border-color .15s;
    white-space: nowrap; max-height: 46px;

    &:hover:not(&--disabled) { background: transparent; color: #111; }

    &--disabled {
      background: #e8e8e8; border-color: #e8e8e8; color: #bbb; cursor: default;
    }

    &--more {
      background: transparent; border-color: #bbb; color: #888;
      &:hover { border-color: #111; color: #111; background: transparent; }
    }

    &--in {
      background: #111; color: #fff;
      &:hover { background: transparent; color: #111; }
    }

    &--wish {
      background: transparent; border-color: #bbb; color: #888;
      &:hover { border-color: #c41c1c; color: #c41c1c; background: #fce4e4; }
    }

    &--wish-active {
      background: #fce4e4; border-color: #c41c1c; color: #c41c1c;
      &:hover { background: transparent; border-color: #bbb; color: #888; }
    }
  }

  &__cart-arrow {
    font-size: 14px; transition: transform .15s;
    .product-info__cart-btn:hover & { transform: translateX(4px); }
  }

  &__wish-icon { font-size: 14px; }

  // ── Social links ───────────────────────────────────────────

  &__socials { display: flex; gap: 6px; margin-top: 4px; flex-wrap: wrap; }

  &__social-btn {
    flex: 1; text-align: center; padding: 10px 12px;
    font-family: 'IBM Plex Mono', monospace; font-size: 9px;
    letter-spacing: 2px; text-transform: uppercase; font-weight: 700;
    color: #fff; text-decoration: none; transition: opacity .15s; white-space: nowrap;
    &:hover { opacity: .85; }
    &--instagram { background: #c13584; }
    &--whatsapp  { background: #25d366; }
    &--telegram  { background: #2ca5e0; }
  }

  @media (max-width: 900px) {
    position: static; max-height: none; padding: 32px 20px 48px;
  }
  @media (max-width: 680px) {
    &__name  { font-size: 36px; }
    &__price { font-size: 36px; }
  }
}

.pi-variant-enter-active { transition: opacity .2s ease, transform .2s ease; }
.pi-variant-enter-from   { opacity: 0; transform: translateY(-4px); }
.pi-variant-leave-active { transition: opacity .15s ease; }
.pi-variant-leave-to     { opacity: 0; }
</style>
