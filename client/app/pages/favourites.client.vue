<template>
  <div class="favs-page">
    <div class="favs-page__container">
    <!-- Лоадер -->
    <Transition name="loader-fade">
      <div v-if="!isFavsHydrated" class="favs-loader" aria-label="Загрузка">
        <span class="favs-loader__bar" />
        <span class="favs-loader__bar" />
        <span class="favs-loader__bar" />
      </div>
    </Transition>

    <!-- Контент -->
    <Transition name="content-fade">
      <div v-if="isFavsHydrated">
        <div class="favs-page__header">
          <div class="favs-page__header-left">
            <span class="favs-page__label">Коллекция</span>
            <h1 class="favs-page__title">Избранное</h1>
          </div>
          <div class="favs-page__header-right">
            <span class="favs-page__count-num">{{ favProducts.length }}</span>
            <span class="favs-page__count-label">моделей</span>
          </div>
        </div>

        <div class="favs-page__rule">
          <div
            class="favs-page__rule-fill"
            :style="{ width: favProducts.length ? '100%' : '0%' }"
          />
        </div>

        <template v-if="favProducts.length">
          <div class="favs-page__grid">
            <!-- Навигация теперь внутри ProductCard (useRouter) -->
            <!-- @open-product больше не нужен -->
            <ProductCard
              v-for="(p, idx) in favProducts"
              :key="p.id"
              :product="p"
              :index="idx"
            />
          </div>

          <div class="favs-page__footer">
            <NuxtLink to="/" class="favs-page__footer-link">← Весь каталог</NuxtLink>
            <span class="favs-page__footer-total"
              >{{ favProducts.length }} {{ pluralItems(favProducts.length) }}</span
            >
          </div>
        </template>

        <div v-else class="favs-page__empty">
          <div class="favs-page__empty-graphic">
            <span class="favs-page__empty-heart">♡</span>
            <div class="favs-page__empty-lines"><span /><span /><span /></div>
          </div>
          <div class="favs-page__empty-body">
            <p class="favs-page__empty-title">Список пуст</p>
            <p class="favs-page__empty-sub">
              Нажмите <span class="favs-page__empty-hint">♡</span> на карточке товара,<br />
              чтобы сохранить понравившуюся модель
            </p>
            <NuxtLink to="/" class="favs-page__empty-btn">
              <span class="favs-page__empty-btn-arrow">→</span>
              В каталог
            </NuxtLink>
          </div>
        </div>
      </div>
    </Transition>
    </div>

    <div class="toast" :class="{ 'toast--on': toastVisible }">{{ toastMsg }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import ProductCard from '../components/MainPage/ProductCard.vue';
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] });
import type { Product } from '~/composables/useProducts';

const { favsSet, toggle, isFavsHydrated } = useFavourites();

const favIds = computed(() => Array.from(favsSet.value));

const config = useRuntimeConfig();
const baseURL = import.meta.server ? config.apiInternal : config.public.apiBase;

const { data: response } = await useFetch<Product[]>('/api/products/list', {
  method: 'POST',
  baseURL,
  body: computed(() => ({ ids: favIds.value })),
  watch: [favIds],
});

const favProducts = computed(() => response.value ?? []);

function pluralItems(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'модель';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'модели';
  return 'моделей';
}

const cart = ref<any[]>([]);

function handleAddToCart({ product, size, error }: any) {
  if (error === 'no-size') {
    showToast('⚠ Выберите размер');
    return;
  }
  const key = `${product.id}_${size}`;
  const existing = cart.value.find((x) => x.key === key);
  existing ? existing.qty++ : cart.value.push({ ...product, size, key, qty: 1 });
  showToast('✓ Добавлено в корзину');
}

const toastMsg = ref('');
const toastVisible = ref(false);
let toastTimer: ReturnType<typeof setTimeout>;

function showToast(msg: string) {
  toastMsg.value = msg;
  toastVisible.value = true;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastVisible.value = false;
  }, 2200);
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

.favs-loader {
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
    background: #111;
    animation: loader-bounce 0.9s ease-in-out infinite;

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

@keyframes loader-bounce {
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

.favs-page {
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
    color: #111;
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
    color: #111;
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
    background: #e8e8e8;
    margin-bottom: 36px;
    overflow: hidden;
  }

  &__rule-fill {
    height: 100%;
    background: #111;
    transition: width 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2px;
    margin-bottom: 40px;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 20px;
    border-top: 1px solid #e0e0e0;
  }

  &__footer-link {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #888;
    text-decoration: none;
    transition: color 0.15s;
    &:hover {
      color: #111;
    }
  }

  &__footer-total {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #ccc;
  }

  &__empty {
    display: grid;
    grid-template-columns: 1fr 1fr;
    min-height: 480px;
    border: 1px solid #e8e8e8;
  }

  &__empty-graphic {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 24px;
    background: #f8f8f8;
    border-right: 1px solid #e8e8e8;
    padding: 60px;
  }

  &__empty-heart {
    font-size: 96px;
    line-height: 1;
    color: #ddd;
    display: block;
  }

  &__empty-lines {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 80px;

    span {
      display: block;
      height: 2px;
      background: #e0e0e0;
      &:nth-child(1) {
        width: 100%;
      }
      &:nth-child(2) {
        width: 66%;
      }
      &:nth-child(3) {
        width: 44%;
      }
    }
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
    color: #111;
    margin-bottom: 20px;
  }

  &__empty-sub {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    line-height: 1.8;
    color: #888;
    margin-bottom: 40px;
    letter-spacing: 0.3px;
  }

  &__empty-hint {
    display: inline-block;
    background: #111;
    color: #fff;
    width: 20px;
    height: 20px;
    line-height: 20px;
    text-align: center;
    font-size: 12px;
    vertical-align: middle;
  }

  &__empty-btn {
    display: inline-flex;
    align-items: center;
    gap: 14px;
    align-self: flex-start;
    background: #111;
    color: #fff;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    padding: 14px 28px;
    text-decoration: none;
    border: 1.5px solid #111;
    transition:
      background 0.15s,
      color 0.15s;

    &:hover {
      background: transparent;
      color: #111;
    }
    &:hover &-arrow {
      transform: translateX(4px);
    }
  }

  &__empty-btn-arrow {
    font-size: 14px;
    transition: transform 0.15s;
  }

  @media (max-width: 1100px) {
    &__container {
      padding-inline: 28px;
    }
    &__grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 900px) {
    &__empty {
      grid-template-columns: 1fr;
    }
    &__empty-graphic {
      border-right: none;
      border-bottom: 1px solid #e8e8e8;
      padding: 40px;
      flex-direction: row;
      justify-content: flex-start;
      min-height: auto;
    }
    &__empty-heart {
      font-size: 64px;
    }
  }

  @media (max-width: 768px) {
    &__container {
      padding-inline: 16px;
    }
    &__title {
      font-size: 48px;
    }
    &__count-num {
      font-size: 32px;
    }
    &__grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 480px) {
    &__grid {
      grid-template-columns: 1fr;
    }
    &__empty-body {
      padding: 32px 24px;
    }
  }
}

.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(72px);
  background: #111;
  color: #fff;
  padding: 11px 24px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  border-left: 4px solid #bbb;
  z-index: 999;
  pointer-events: none;
  transition: transform 0.26s ease;
  white-space: nowrap;

  &--on {
    transform: translateX(-50%) translateY(0);
  }
}
</style>
