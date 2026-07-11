<template>
  <div class="product-card" @click="goToProduct">
    <div class="product-card__img">
      <img v-if="product.photos?.[0]" :src="imgVariant(product.photos[0], 'card')" :alt="product.type"
        :loading="index < 4 ? 'eager' : 'lazy'" class="product-card__photo" />
      <div v-else class="product-card__no-img">
        <svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24"
          opacity="0.12">
          <path
            d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z" />
        </svg>
      </div>

      <span v-if="product.isNew" class="product-card__badge product-card__badge--new">Новинка</span>

      <div class="product-card__actions">
        <button class="btn-add" @click.stop>Смотреть</button>
        <ClientOnly>
          <button class="btn-wish" :class="{ 'btn-wish--active': isFav(product.id) }" @click.stop="toggle(product.id)"
            :aria-label="isFav(product.id) ? 'Убрать из избранного' : 'В избранное'">{{ isFav(product.id) ? '♥' : '♡'
            }}</button>
        </ClientOnly>
      </div>
    </div>

    <div class="product-card__info">
      <div class="product-card__name">{{ product.type }}{{ product.brand ? ' · ' + product.brand : '' }}</div>
      <div class="product-card__sub">{{ product.gender?.join(', ') }} · {{ product.category }}</div>
      <div class="product-card__footer">
        <div class="product-card__price">{{ product.retailPrice }}</div>
        <div v-if="product.colors?.length" class="product-card__colors">
          <span v-for="c in product.colors.slice(0, 4)" :key="c" class="color-dot"
            :style="{ background: colorToHex(c) }" :title="c" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Product } from '~/composables/useProducts';
import { imgVariant } from '~/libs/image-variants';

const props = withDefaults(defineProps<{ product: Product; index?: number }>(), {
  index: 0,
});
const { toggle, isFav } = useFavourites();

function goToProduct() {
  window.open(`/product/${props.product.id}`, '_blank');
}

const COLOR_MAP: Record<string, string> = {
  'синий': '#1a2744',
  'тёмно-синий': '#0f1a30',
  'темно-синий': '#0f1a30',
  'navy': '#1a2744',
  'серый': '#6a6a6a',
  'светло-серый': '#aaaaaa',
  'чёрный': '#1a1a1a',
  'белый': '#f0ede8',
  'коричневый': '#7a5a3a',
  'бежевый': '#d4c89a',
  'зелёный': '#4a6a4a',
  'бордо': '#6a1a2a',
  'антрацит': '#3a3a3a',
  'тёмно-коричневый': '#3a2a1a',
  'темно-коричневый': '#3a2a1a',
  'хаки': '#6a6a4a',
  'красный': '#8a2020',
  'голубой': '#5a7aa0',
  'синий navy': '#1a2744',
};

function colorToHex(name: string): string {
  return COLOR_MAP[name.toLowerCase()] ?? '#c8c0b4';
}
</script>

<style lang="scss" scoped>
.product-card {
  background: $cream;
  border: 1px solid $cream-3;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.3s, transform 0.3s;

  &:hover {
    box-shadow: 0 12px 48px rgba($navy-3, 0.12);
    transform: translateY(-4px);
  }

  // ── Image ─────────────────────────────────────────────

  &__img {
    aspect-ratio: 3 / 4;
    position: relative;
    overflow: hidden;
    background: $cream-2;
  }

  &__photo {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
    transition: transform 0.4s ease;
  }

  &:hover &__photo {
    transform: scale(1.04);
  }

  &__no-img {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: $text-muted;
  }

  // ── Badge ─────────────────────────────────────────────

  &__badge {
    position: absolute;
    top: 16px;
    left: 16px;
    padding: 5px 12px;
    font-family: 'Jost', sans-serif;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    z-index: 2;

    &--new {
      background: $navy;
      color: $cream;
    }

    &--sale {
      background: $gold;
      color: $navy-3;
    }
  }

  // ── Hover actions ─────────────────────────────────────

  &__actions {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    transform: translateY(100%);
    transition: transform 0.3s;
    z-index: 2;
  }

  &:hover &__actions {
    transform: translateY(0);
  }

  // ── Info ──────────────────────────────────────────────

  &__info {
    padding: 20px 22px 22px;
    border-top: 1px solid $cream-3;
  }

  &__name {
    font-family: 'EB Garamond', serif;
    font-size: 22px;
    font-weight: 400;
    color: $navy;
    margin-bottom: 4px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.2;
    min-height: 2.4em;
  }

  &__sub {
    font-family: 'Jost', sans-serif;
    font-size: 10px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: $text-muted;
    margin-bottom: 14px;
  }

  &__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__price {
    font-family: 'EB Garamond', serif;
    font-size: 24px;
    font-weight: 500;
    color: $navy;
    line-height: 1;
  }

  &__colors {
    display: flex;
    gap: 6px;
  }
}

// ── Action buttons ────────────────────────────────────────

.btn-add {
  flex: 1;
  padding: 14px;
  background: $navy;
  color: $cream;
  font-family: 'Jost', sans-serif;
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: background 0.25s;

  &:hover {
    background: $navy-2;
  }
}

.btn-wish {
  width: 52px;
  background: $cream;
  color: $navy;
  font-size: 18px;
  border: none;
  border-left: 1px solid $cream-3;
  cursor: pointer;
  transition: background 0.25s, color 0.25s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover,
  &--active {
    background: #fce4e4;
    color: #c41c1c;
  }
}

// ── Color dots ────────────────────────────────────────────

.color-dot {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.3);
  }
}

// ── Responsive ────────────────────────────────────────────

@media (max-width: 768px) {
  .product-card {
    &__info {
      padding: 14px 16px 16px;
    }

    &__name {
      font-size: 18px;
    }

    &__price {
      font-size: 20px;
    }

    &__sub {
      font-size: 9px;
      margin-bottom: 10px;
    }
  }
}

@media (max-width: 480px) {
  .product-card {
    &__info {
      padding: 12px 14px 14px;
    }

    &__name {
      font-size: 17px;
    }
  }
}

@media (max-width: 375px) {
  .product-card {
    &__info {
      padding: 8px 10px 10px;
    }

    &__name {
      font-size: 15px;
    }

    &__price {
      font-size: 16px;
    }

    &__sub {
      font-size: 8px;
      margin-bottom: 6px;
      letter-spacing: 1px;
    }
  }

  .color-dot {
    width: 10px;
    height: 10px;
  }
}
</style>
