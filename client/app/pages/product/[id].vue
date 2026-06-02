<template>
  <div>
    <div v-if="pending" class="product-loading">
      <span class="product-loading__bar" />
      <span class="product-loading__bar" />
      <span class="product-loading__bar" />
    </div>

    <div v-else-if="notFound" class="product-error">
      <span class="product-error__code">404</span>
      <p class="product-error__text">Товар не найден</p>
      <NuxtLink to="/" class="product-error__back">← В каталог</NuxtLink>
    </div>

    <template v-else-if="product">
      <div class="product-page">
        <div class="product-page__crumbs">
          <NuxtLink to="/" class="product-page__bc">Вся одежда</NuxtLink>
          <span class="product-page__bc-sep">/</span>
          <span class="product-page__bc product-page__bc--active">{{ product.type }}</span>
        </div>

        <div class="product-page__wrap">
          <div class="product-page__layout">
            <div class="product-page__gallery-col">
              <ProductGallery :images="allPhotos" :alt="product.type" />
            </div>
            <div class="product-page__info-col">
              <ProductInfo :product="product" />
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ProductGallery from '~/components/ProductPage/ProductGallery.vue';
import ProductInfo from '~/components/ProductPage/ProductInfo.vue';
import type { Product } from '~/composables/useProducts';

const route = useRoute();
const config = useRuntimeConfig();
const id = route.params.id as string;
const baseURL = import.meta.server ? config.apiInternal : config.public.apiBase;

const { data: product, pending } = useFetch<Product>(`/api/products/${id}`, {
  baseURL,
  key: `product-${id}`,
});

const allPhotos = computed(() => {
  if (!product.value) return [];
  return [...product.value.photos, ...(product.value.extraPhotos ?? [])];
});

const notFound = computed(() => !product.value && !pending.value);

useSeoMeta({
  title: computed(() => product.value
    ? `${product.value.type}${product.value.brand ? ' ' + product.value.brand : ''}`
    : 'Товар'),
  description: computed(() => {
    if (!product.value) return '';
    const parts = [product.value.type, product.value.gender, product.value.category, product.value.price].filter(Boolean);
    const base = `${parts.join(' · ')} — купить в Marsel, Дордой, Бишкек.`;
    return product.value.description
      ? `${product.value.description} ${base}`
      : base;
  }),
  ogTitle: computed(() => product.value
    ? `${product.value.type}${product.value.brand ? ' ' + product.value.brand : ''} — Marsel`
    : 'Marsel'),
  ogDescription: computed(() => {
    if (!product.value) return '';
    const parts = [product.value.type, product.value.gender, product.value.category, product.value.price].filter(Boolean);
    const base = `${parts.join(' · ')} — купить в Marsel, Дордой, Бишкек.`;
    return product.value.description
      ? `${product.value.description} ${base}`
      : base;
  }),
  ogImage: computed(() => product.value?.photos?.[0] ?? undefined),
});

</script>

<style lang="scss" scoped>
.product-loading {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 5px;
  min-height: calc(100vh - 64px);
  padding-bottom: 48vh;

  &__bar {
    display: block;
    width: 3px;
    background: #111;
    animation: bar-bounce 0.9s ease-in-out infinite;

    &:nth-child(1) {
      height: 20px;
      animation-delay: 0s;
    }
    &:nth-child(2) {
      height: 32px;
      animation-delay: 0.15s;
    }
    &:nth-child(3) {
      height: 20px;
      animation-delay: 0.3s;
    }
  }
}

@keyframes bar-bounce {
  0%,
  100% {
    transform: scaleY(0.5);
    opacity: 0.3;
  }
  50% {
    transform: scaleY(1);
    opacity: 1;
  }
}

.product-error {
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

  &__text {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #888;
  }

  &__back {
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

.product-page {
  &__crumbs {
    max-width: $container-max-width;
    margin: 0 auto;
    padding: 16px 48px;
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid #ebebeb;
  }

  &__bc {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    letter-spacing: 1px;
    color: #aaa;
    text-decoration: none;
    transition: color 0.15s;

    &:hover {
      color: #111;
    }

    &--active {
      color: #111;
      font-weight: 500;
      cursor: default;
      &:hover {
        color: #111;
      }
    }
  }

  &__bc-sep {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    color: #ddd;
  }

  &__wrap {
    max-width: $container-max-width;
    margin: 0 auto;
    padding: 0 48px;
    border-bottom: 1px solid #ebebeb;
  }

  &__layout {
    display: grid;
    grid-template-columns: 420px 1fr;
    gap: 0;
    align-items: start;
  }

  &__gallery-col {
    border-right: 1px solid #ebebeb;
    padding: 32px 40px 32px 0;
  }

  &__info-col {
    padding: 32px 0 32px 48px;
    position: sticky;
    top: 64px;
    max-height: calc(100vh - 64px);
    overflow-y: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
  }

  @media (max-width: 1100px) {
    &__wrap,
    &__crumbs {
      padding-inline: 28px;
    }
    &__layout {
      grid-template-columns: 360px 1fr;
    }
  }

  @media (max-width: 900px) {
    &__wrap {
      padding-inline: 0;
    }
    &__layout {
      grid-template-columns: minmax(0, 1fr);
    }
    &__gallery-col {
      border-right: none;
      border-bottom: 1px solid #ebebeb;
      padding: 24px 20px;
    }
    &__info-col {
      position: static;
      max-height: none;
      padding: 0 20px 32px;
    }
  }

  @media (max-width: 680px) {
    &__crumbs {
      padding-inline: 16px;
    }
  }
}
</style>
