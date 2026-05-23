<template>
  <div class="product-page">
    <!-- Breadcrumbs -->
    <div class="product-page__crumbs">
      <NuxtLink to="/" class="product-page__bc">Вся одежда</NuxtLink>
      <span class="product-page__bc-sep">/</span>
      <NuxtLink
        :to="`/brand/${slugify(product.brand)}`"
        class="product-page__bc"
      >{{ product.brand }}</NuxtLink>
    </div>

    <!-- Main layout -->
    <div class="product-page__wrap">
      <div class="product-page__layout">
        <!-- Gallery column -->
        <div class="product-page__gallery-col">
          <ProductGallery :images="product.media" :alt="product.brand" />
        </div>

        <!-- Info column -->
        <div class="product-page__info-col">
          <ProductInfo
            :product="product"
            :is-fav="isFavProduct"
            :view-count="viewCount"
            @add-to-cart="$emit('add-to-cart', $event)"
            @toggle-fav="toggle"
          />
        </div>
      </div>
    </div>

    <!-- Related products -->
    <!-- <div class="product-page__related">
      <div class="product-page__related-header">
        <div class="product-page__related-title">Похожие модели</div>
        <NuxtLink to="/" class="product-page__related-all">Вся одежда →</NuxtLink>
      </div>
      <div class="product-page__related-grid">
        <ProductCard
          v-for="p in relatedProducts"
          :key="p.id"
          :product="p"
          :is-fav="favsSet.has(p.id)"
          @open-product="goToProduct"
          @toggle-fav="toggle"
          @add-to-cart="$emit('add-to-cart', $event)"
          @open-modal="() => {}"
        />
      </div>
    </div> -->
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ProductGallery from './ProductGallery.vue';
import ProductInfo from './ProductInfo.vue';
import { slugify } from '~/libs/slugify';
import type { ApiProduct } from '~/types/types';
// import ProductCard    from '../MainPage/ProductCard.vue'

const props = defineProps({
  product: { type: Object as () => ApiProduct, required: true },
  allSuits: { type: Array, required: true },
  viewCount: { type: Number as () => number | null, default: null },
});

defineEmits(['add-to-cart']);

const { favsSet, toggle } = useFavourites();

const isFavProduct = computed(() => favsSet.value.has(props.product.id));

// const relatedProducts = computed(() =>
//   props.allSuits.filter(s => s.id !== props.product.id).slice(0, 4)
// )

const router = useRouter();
function goToProduct(product: ApiProduct) {
  router.push(`/product/${product.id}`);
}
</script>

<style lang="scss" scoped>
.product-page {
  // ── Хлебные крошки ───────────────────────────────────

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

  // ── Wrapper — ограничивает ширину всей секции ─────────

  &__wrap {
    max-width: $container-max-width;
    margin: 0 auto;
    padding: 0 48px;
    border-bottom: 1px solid #ebebeb;
  }

  // ── Двухколоночный layout ─────────────────────────────
  // Галерея: фиксированная ширина → aspect-ratio 3:4 внутри
  // Инфо: остаток, но не меньше 320px

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
    // sticky — инфо остаётся в поле зрения при прокрутке галереи
    position: sticky;
    top: 64px;
    max-height: calc(100vh - 64px);
    overflow-y: auto;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  // ── Related ───────────────────────────────────────────

  &__related {
    max-width: $container-max-width;
    margin: 0 auto;
    padding: 52px 48px 72px;
  }

  &__related-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding-bottom: 20px;
    border-bottom: 2px solid #111;
    margin-bottom: 28px;
  }

  &__related-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 36px;
    letter-spacing: -0.5px;
  }

  &__related-all {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    color: #888;
    text-transform: uppercase;
    text-decoration: none;
    transition: color 0.15s;

    &:hover {
      color: #111;
    }
  }

  &__related-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2px;
  }

  // ── Responsive ────────────────────────────────────────

  @media (max-width: 1100px) {
    &__wrap {
      padding-inline: 28px;
    }

    &__crumbs {
      padding-inline: 28px;
    }

    &__related {
      padding-inline: 28px;
    }

    &__layout {
      grid-template-columns: 360px 1fr;
    }

    &__related-grid {
      grid-template-columns: repeat(3, 1fr);
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

    &__related-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 680px) {
    &__crumbs {
      padding-inline: 16px;
    }

    &__related {
      padding-inline: 16px;
    }
  }
}
</style>
