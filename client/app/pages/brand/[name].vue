<template>
  <div class="brand-page">
    <!-- 404 — бренд не найден -->
    <div v-if="!pending && meta.total === 0" class="brand-404">
      <span class="brand-404__code">404</span>
      <p class="brand-404__title">Бренд не найден</p>
      <p class="brand-404__sub">
        «{{ brandName }}» не существует или был удалён
      </p>
      <NuxtLink to="/" class="brand-404__back">← В каталог</NuxtLink>
    </div>

    <template v-else>
      <div class="brand-page__header">
        <NuxtLink to="/" class="brand-page__back">← Все товары</NuxtLink>
        <h1 class="brand-page__title">{{ brandName }}</h1>
        <span class="brand-page__count">
          {{ pending ? '...' : `${meta.total} товаров` }}
        </span>
      </div>

      <!-- Грид -->
      <div class="brand-page__grid">
        <!-- Скелетон -->
        <template v-if="pending">
          <div v-for="n in 12" :key="`sk-${n}`" class="brand-page__skeleton" />
        </template>

        <!-- Карточки -->
        <template v-else>
          <ProductCard
            v-for="product in products"
            :key="product.id"
            :product="product"
          />
        </template>
      </div>
    </template>

    <!-- Пагинация -->
    <div v-if="!pending && meta.lastPage > 1" class="brand-page__pagination">
      <button
        class="brand-page__page-btn brand-page__page-btn--arrow"
        :disabled="meta.page <= 1"
        @click="setPage(meta.page - 1)"
        aria-label="Назад"
      >
        ‹
      </button>

      <template v-for="p in pageRange" :key="p">
        <span v-if="p === '...'" class="brand-page__page-gap">…</span>
        <button
          v-else
          class="brand-page__page-btn"
          :class="{ 'brand-page__page-btn--on': p === meta.page }"
          @click="setPage(Number(p))"
        >
          {{ p }}
        </button>
      </template>

      <button
        class="brand-page__page-btn brand-page__page-btn--arrow"
        :disabled="meta.page >= meta.lastPage"
        @click="setPage(meta.page + 1)"
        aria-label="Вперёд"
      >
        ›
      </button>
    </div>

    <div v-if="!pending && meta.lastPage > 1" class="brand-page__page-info">
      Страница {{ meta.page }} из {{ meta.lastPage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import type { Product } from '~/composables/useProducts';

const route = useRoute();
const config = useRuntimeConfig();
const baseURL = import.meta.server ? config.apiInternal : config.public.apiBase;

const brandName = computed(() =>
  String(route.params.name ?? '').replace(/-/g, ' '),
);

const page = ref(1);
const limit = 20;

const url = computed(() => {
  const p = new URLSearchParams({ page: String(page.value), limit: String(limit) });
  return `/api/products?${p}`;
});

const { data, pending } = useFetch<{ data: Product[]; meta: { total: number; page: number; lastPage: number; limit: number } }>(url, {
  baseURL,
  key: computed(() => `brand-${page.value}`),
  watch: [url],
});

const products = computed(() => data.value?.data ?? []);
const meta = computed(() => data.value?.meta ?? { total: 0, page: 1, lastPage: 1, limit });

useSeoMeta({
  title: computed(() => brandName.value ? `Бренд ${brandName.value}` : 'Каталог'),
  description: computed(() => `${brandName.value} — коллекция мужской одежды в Marsel. ${meta.value.total} товаров в наличии.`),
  ogTitle: computed(() => `${brandName.value} — Marsel`),
  ogDescription: computed(() => `${brandName.value} — коллекция мужской одежды в Marsel, Бишкек.`),
});

function setPage(n: number) {
  if (n < 1 || n > meta.value.lastPage) return;
  page.value = n;
  if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
}

const pageRange = computed(() => {
  const { page: p, lastPage } = meta.value;
  if (lastPage <= 7) return Array.from({ length: lastPage }, (_, i) => i + 1);
  const pages = new Set([1, lastPage]);
  for (let i = Math.max(2, p - 2); i <= Math.min(lastPage - 1, p + 2); i++) pages.add(i);
  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | string)[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i]!;
    const prev = sorted[i - 1];
    if (i > 0 && prev !== undefined && cur - prev > 1) result.push('...');
    result.push(cur);
  }
  return result;
});

</script>

<style lang="scss" scoped>
.brand-404 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: calc(100vh - 64px);
  text-align: center;

  &__code {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 120px;
    letter-spacing: -4px;
    color: #e0e0e0;
    line-height: 1;
  }

  &__title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 32px;
    letter-spacing: -0.5px;
    color: #111;
  }

  &__sub {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    letter-spacing: 1px;
    color: #aaa;
  }

  &__back {
    margin-top: 8px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #fff;
    background: #111;
    padding: 11px 24px;
    text-decoration: none;
    transition: background 0.15s;

    &:hover {
      background: #333;
    }
  }
}

.brand-page {
  padding: 40px 48px 72px;

  &__header {
    padding-bottom: 24px;
    border-bottom: 2px solid #111;
    margin-bottom: 28px;
  }

  &__back {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #888;
    text-decoration: none;
    display: inline-block;
    margin-bottom: 12px;
    transition: color 0.15s;

    &:hover {
      color: #111;
    }
  }

  &__title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 52px;
    letter-spacing: -1px;
    line-height: 1;
    text-transform: uppercase;
  }

  &__count {
    display: block;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    letter-spacing: 2px;
    color: #888;
    text-transform: uppercase;
    margin-top: 6px;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2px;
    min-height: 400px;
  }

  &__skeleton {
    aspect-ratio: 3 / 4;
    background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.4s infinite;
  }

  @keyframes skeleton-shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  &__empty {
    grid-column: 1 / -1;
    padding: 80px 0;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  &__empty-dash {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 64px;
    color: #e0e0e0;
  }

  &__empty-text {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    letter-spacing: 2px;
    color: #888;
    text-transform: uppercase;
  }

  &__back-btn {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #fff;
    background: #111;
    padding: 11px 24px;
    text-decoration: none;
    transition: background 0.15s;

    &:hover {
      background: #333;
    }
  }

  &__pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    margin-top: 48px;
    flex-wrap: wrap;
  }

  &__page-btn {
    min-width: 36px;
    height: 36px;
    padding: 0 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1px;
    border: 1.5px solid #e0e0e0;
    background: none;
    color: #888;
    cursor: pointer;
    transition: all 0.15s;

    &:hover:not(:disabled) {
      border-color: #111;
      color: #111;
    }

    &--on {
      background: #111;
      border-color: #111;
      color: #fff;
    }

    &--arrow {
      font-size: 18px;
      font-weight: 300;
    }

    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
  }

  &__page-gap {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    color: #ccc;
    padding: 0 4px;
    user-select: none;
  }

  &__page-info {
    text-align: center;
    margin-top: 12px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    color: #bbb;
    text-transform: uppercase;
  }

  @media (max-width: 1100px) {
    padding-inline: 28px;
    &__grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 768px) {
    padding-inline: 16px;
    &__title {
      font-size: 36px;
    }
    &__grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 480px) {
    &__grid {
      grid-template-columns: 1fr;
    }
  }
}
</style>
