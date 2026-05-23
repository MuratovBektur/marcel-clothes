<template>
  <div class="product-info">
    <!-- Breadcrumb meta -->
    <div class="product-info__meta">
      <span class="product-info__brand"
        >{{ product.gender }} · {{ product.category }}</span
      >
    </div>

    <!-- Title -->
    <h1 class="product-info__name">{{ product.type }}</h1>

    <!-- Price -->
    <div class="product-info__price-block">
      <div class="product-info__price">{{ product.price }}</div>
    </div>

    <!-- Description -->
    <div v-if="product.description" class="product-info__desc">
      <p class="product-info__desc-line" style="white-space: pre-line">
        {{ product.description }}
      </p>
    </div>

    <!-- Specs -->
    <div class="product-info__specs">
      <div v-if="product.brand" class="product-info__spec">
        <span class="product-info__spec-label">Бренд</span>
        <span class="product-info__spec-value">{{ product.brand }}</span>
      </div>

      <div class="product-info__spec">
        <span class="product-info__spec-label">Материалы</span>
        <span class="product-info__spec-value">{{
          product.materials.join(', ')
        }}</span>
      </div>

      <div class="product-info__spec">
        <span class="product-info__spec-label">Цвета</span>
        <div class="product-info__tags">
          <span
            v-for="c in product.colors"
            :key="c"
            class="product-info__tag"
            >{{ c }}</span
          >
        </div>
      </div>

      <div class="product-info__spec">
        <span class="product-info__spec-label">Размеры</span>
        <div class="product-info__tags">
          <span
            v-for="s in product.sizes"
            :key="s"
            class="product-info__tag product-info__tag--size"
            >{{ s }}</span
          >
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import type { Product } from '~/composables/useProducts';

defineProps<{ product: Product }>();
</script>

<style lang="scss" scoped>
.product-info {
  padding: 44px 44px 60px;
  position: sticky;
  top: 64px;
  max-height: calc(100vh - 64px);
  overflow-y: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  &__meta {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
  }

  &__brand {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    letter-spacing: 3px;
    text-transform: uppercase;
    font-weight: 700;
    color: #888;
  }

  &__name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 48px;
    letter-spacing: -1px;
    line-height: 0.92;
    margin-bottom: 24px;
    color: #111;
  }

  &__price-block {
    padding-bottom: 24px;
    border-bottom: 1px solid #e0e0e0;
    margin-bottom: 28px;
  }

  &__price {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 44px;
    letter-spacing: -1px;
    line-height: 1;
    color: #111;
  }

  &__desc {
    margin-bottom: 28px;
    padding-bottom: 28px;
    border-bottom: 1px solid #e0e0e0;
  }

  &__desc-line {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    line-height: 1.85;
    color: #666;
    letter-spacing: 0.2px;
  }

  &__specs {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  &__spec {
    display: grid;
    grid-template-columns: 90px 1fr;
    gap: 12px;
    align-items: start;
  }

  &__spec-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #aaa;
    padding-top: 3px;
  }

  &__spec-value {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: #111;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  &__tag {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    padding: 3px 8px;
    border: 1px solid #e0e0e0;
    color: #888;

    &--size {
      border-color: #111;
      color: #111;
      font-weight: 600;
    }
  }

  @media (max-width: 900px) {
    position: static;
    max-height: none;
    padding: 32px 20px 48px;
  }

  @media (max-width: 680px) {
    &__name {
      font-size: 36px;
    }
    &__price {
      font-size: 36px;
    }
  }
}
</style>
