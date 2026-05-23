<template>
  <div>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- HERO                                            -->
    <!-- ═══════════════════════════════════════════════ -->
    <section class="hero">
      <div class="hero__left">
        <div>
          <div class="hero__badge">✦ Коллекция 2026</div>
          <h1 class="hero__title">
            Костюм как<br>
            <em>визитная</em><br>
            карточка
          </h1>
          <div class="hero__divider"></div>
          <p class="hero__desc">
            Каждый костюм Marsel проходит более 70 операций ручного пошива.
            Для тех, кто понимает — детали решают всё.
          </p>
          <div class="hero__actions">
            <a href="#catalog" class="btn-gold">
              Смотреть коллекцию
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path d="m5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
            <NuxtLink to="/contacts" class="btn-outline-cream">Пошив на заказ</NuxtLink>
          </div>
        </div>
        <div class="hero__trust">
          <div class="hero__trust-item">
            <div class="hero__trust-val">15+</div>
            <div class="hero__trust-label">Лет опыта</div>
          </div>
          <div class="hero__trust-item">
            <div class="hero__trust-val">4 000+</div>
            <div class="hero__trust-label">Клиентов</div>
          </div>
          <div class="hero__trust-item">
            <div class="hero__trust-val">100%</div>
            <div class="hero__trust-label">Качественные ткани</div>
          </div>
          <div class="hero__trust-item">
            <div class="hero__trust-val">70+</div>
            <div class="hero__trust-label">Ручных операций</div>
          </div>
        </div>
      </div>

      <div class="hero__right">
        <div class="hero__right-title">Популярные модели</div>
        <template v-if="pending">
          <div v-for="n in 5" :key="n" class="hero-product-mini hero-product-mini--skeleton" />
        </template>
        <template v-else>
          <div
            v-for="item in products.slice(0, 5)"
            :key="item.id"
            class="hero-product-mini"
            @click="openProduct(item.id)"
          >
            <div class="hero-product-mini__name">{{ item.type }}{{ item.brand ? ' · ' + item.brand : '' }}</div>
            <div class="hero-product-mini__sub">{{ item.gender }} · {{ item.category }}</div>
            <div class="hero-product-mini__price">{{ item.price }}</div>
          </div>
        </template>
        <div class="hero__right-cta">
          <a href="#catalog" class="btn-gold-outline">Весь каталог →</a>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- STRIP                                           -->
    <!-- ═══════════════════════════════════════════════ -->
    <div class="strip">
      <div class="strip__item">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
        Бесплатная доставка
      </div>
      <div class="strip__sep"></div>
      <div class="strip__item">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Премиальные ткани
      </div>
      <div class="strip__sep"></div>
      <div class="strip__item">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        Готово за 14 дней
      </div>
      <div class="strip__sep"></div>
      <div class="strip__item">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        Консультация бесплатно
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- CATALOG                                         -->
    <!-- ═══════════════════════════════════════════════ -->
    <div id="catalog" class="catalog-bg">
      <ProductCardList
        :products="products"
        :meta="meta"
        :pending="pending"
        :limit="20"
        :selected-gender="gender"
        :selected-category="category"
        :selected-type="type"
        :selected-brand="brand"
        :selected-country="country"
        :selected-materials="materials"
        :selected-colors="colors"
        :selected-sizes="sizes"
        :selected-price-min="priceMin"
        :selected-price-max="priceMax"
        @change-page="setPage"
        @filter-gender="onGender"
        @filter-category="onCategory"
        @filter-type="onType"
        @filter-brand="onBrand"
        @filter-country="onCountry"
        @filter-materials="onMaterials"
        @filter-colors="onColors"
        @filter-sizes="onSizes"
        @filter-price="onPrice"
        @filter-reset="onReset"
      />
    </div>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- NEWSLETTER                                      -->
    <!-- ═══════════════════════════════════════════════ -->
    <section class="newsletter">
      <h2 class="newsletter__title">Скидка 10% на <em>первый заказ</em></h2>
      <p class="newsletter__sub">Подпишитесь на новости и получите промокод на почту</p>
      <form class="newsletter__form" @submit.prevent>
        <input class="newsletter__input" type="email" placeholder="Введите ваш email" />
        <button class="newsletter__btn" type="submit">Получить скидку</button>
      </form>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ProductCardList from '~/components/MainPage/ProductCardList.vue';

const gender   = ref('');
const category = ref('');
const type     = ref('');
const brand    = ref('');
const country  = ref('');
const materials = ref<string[]>([]);
const colors    = ref<string[]>([]);
const sizes     = ref<string[]>([]);
const priceMin  = ref<number | null>(null);
const priceMax  = ref<number | null>(null);

const { query: search } = useSearch();

const { products, meta, pending, setPage, resetPage } = useProducts({
  gender, category, type, brand, search,
  country, materials, colors, sizes, priceMin, priceMax,
});

function openProduct(id: string) {
  window.open(`/product/${id}`, '_blank');
}

function onGender(v: string)   { gender.value = v; type.value = ''; resetPage(); }
function onCategory(v: string) { category.value = v; type.value = ''; resetPage(); }
function onType(v: string)     { type.value = v; resetPage(); }
function onBrand(v: string)    { brand.value = v; resetPage(); }
function onCountry(v: string)  { country.value = v; resetPage(); }
function onMaterials(v: string[]) { materials.value = v; resetPage(); }
function onColors(v: string[])    { colors.value = v; resetPage(); }
function onSizes(v: string[])     { sizes.value = v; resetPage(); }
function onPrice(v: { min: number | null; max: number | null }) {
  priceMin.value = v.min;
  priceMax.value = v.max;
  resetPage();
}
function onReset() {
  gender.value = ''; category.value = ''; type.value = ''; brand.value = '';
  country.value = ''; materials.value = []; colors.value = []; sizes.value = [];
  priceMin.value = null; priceMax.value = null;
  resetPage();
}

useSeoMeta({
  title: () => 'MARSEL — Мужские костюмы · Алматы',
  description: () =>
    'Казахстанский дом мужских костюмов Marsel. Премиальные ткани, ручной пошив, индивидуальный крой с 2010 года.',
  ogTitle: () => 'MARSEL — Мужские костюмы',
  ogDescription: () => 'Премиальные ткани, ручной пошив, индивидуальный крой с 2010 года.',
});
</script>

<style lang="scss" scoped>
$bp: 1024px;

// ═══════════════════════════════════════════════════════════
// HERO
// ═══════════════════════════════════════════════════════════

.hero {
  background: $navy-3;
  min-height: 90vh;
  display: grid;
  grid-template-columns: 1fr 420px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0; bottom: 0;
    left: 33%;
    width: 1px;
    background: rgba(255, 255, 255, 0.06);
    pointer-events: none;
  }
}

.hero__left {
  padding: 100px 80px 80px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
}

.hero__badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: $gold;
  color: $navy-3;
  font-family: 'Jost', sans-serif;
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 600;
  padding: 8px 20px;
  width: fit-content;
  margin-bottom: 40px;
}

.hero__title {
  font-family: 'EB Garamond', serif;
  font-size: clamp(52px, 6vw, 84px);
  font-weight: 400;
  line-height: 1.1;
  color: $cream;
  letter-spacing: 1px;

  em {
    font-style: italic;
    color: $gold-2;
  }
}

.hero__divider {
  width: 60px;
  height: 2px;
  background: $gold;
  margin: 36px 0;
}

.hero__desc {
  font-family: 'Jost', sans-serif;
  font-size: 15px;
  line-height: 1.8;
  color: rgba($cream, 0.55);
  max-width: 500px;
  font-weight: 300;
  margin-bottom: 48px;
}

.hero__actions {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.hero__trust {
  display: flex;
  gap: 40px;
  padding-top: 48px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-wrap: wrap;
}

.hero__trust-item {
  display: flex;
  flex-direction: column;
}

.hero__trust-val {
  font-family: 'EB Garamond', serif;
  font-size: 32px;
  font-weight: 400;
  color: $gold-2;
  line-height: 1;
}

.hero__trust-label {
  font-family: 'Jost', sans-serif;
  font-size: 10px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: rgba($cream, 0.4);
  margin-top: 4px;
}

.hero__right {
  background: rgba(255, 255, 255, 0.03);
  border-left: 1px solid rgba(255, 255, 255, 0.06);
  padding: 60px 36px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hero__right-title {
  font-family: 'Jost', sans-serif;
  font-size: 9px;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: rgba($cream, 0.35);
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 20px;
}

.hero-product-mini {
  padding: 16px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: padding-left 0.2s;

  &:hover { padding-left: 8px; }

  &--skeleton {
    cursor: default;
    height: 68px;
    background: rgba(255, 255, 255, 0.03);
    animation: shimmer 1.4s infinite;
    background-size: 200% 100%;
    background-image: linear-gradient(90deg,
      rgba(255,255,255,0.03) 25%,
      rgba(255,255,255,0.06) 50%,
      rgba(255,255,255,0.03) 75%);
  }
}

.hero-product-mini__name {
  font-family: 'EB Garamond', serif;
  font-size: 17px;
  font-weight: 400;
  color: $cream;
  margin-bottom: 4px;
}

.hero-product-mini__sub {
  font-family: 'Jost', sans-serif;
  font-size: 9px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: rgba($cream, 0.35);
  margin-bottom: 8px;
}

.hero-product-mini__price {
  font-family: 'EB Garamond', serif;
  font-size: 18px;
  color: $gold-2;
}

.hero__right-cta {
  margin-top: auto;
  padding-top: 24px;
}

// ── Buttons ───────────────────────────────────────────────

.btn-gold {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: $gold;
  color: $navy-3;
  padding: 16px 36px;
  font-family: 'Jost', sans-serif;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.25s;

  &:hover { background: $gold-2; }

  &--inline { display: inline-flex; }
}

.btn-outline-cream {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  border: 1px solid rgba($cream, 0.3);
  color: $cream;
  padding: 15px 36px;
  font-family: 'Jost', sans-serif;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 400;
  text-decoration: none;
  transition: border-color 0.25s, color 0.25s;

  &:hover {
    border-color: $gold;
    color: $gold;
  }
}

.btn-gold-outline {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid $gold;
  color: $gold;
  padding: 14px;
  font-family: 'Jost', sans-serif;
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  width: 100%;
  text-decoration: none;
  transition: background 0.25s, color 0.25s;

  &:hover { background: $gold; color: $navy-3; }
}

// ═══════════════════════════════════════════════════════════
// STRIP
// ═══════════════════════════════════════════════════════════

.strip {
  background: $gold;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 18px 60px;
  flex-wrap: wrap;
  gap: 0;
}

.strip__item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Jost', sans-serif;
  font-size: 11px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  font-weight: 600;
  color: $navy-3;

  svg { opacity: 0.7; }
}

.strip__sep {
  width: 1px;
  height: 24px;
  background: rgba($navy, 0.2);
}

// ═══════════════════════════════════════════════════════════
// CATALOG WRAPPER
// ═══════════════════════════════════════════════════════════

.catalog-bg {
  background: $cream;
  padding-bottom: 60px;
}

// ═══════════════════════════════════════════════════════════
// NEWSLETTER
// ═══════════════════════════════════════════════════════════

.newsletter {
  background: $navy;
  padding: 80px 60px;
  text-align: center;
}

.newsletter__title {
  font-family: 'EB Garamond', serif;
  font-size: 48px;
  font-weight: 400;
  color: $cream;
  margin-bottom: 12px;

  em { font-style: italic; color: $gold-2; }
}

.newsletter__sub {
  font-family: 'Jost', sans-serif;
  font-size: 13px;
  color: rgba($cream, 0.5);
  margin-bottom: 36px;
  font-weight: 300;
}

.newsletter__form {
  display: flex;
  gap: 0;
  max-width: 500px;
  margin: 0 auto;
}

.newsletter__input {
  flex: 1;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba($cream, 0.2);
  border-right: none;
  color: $cream;
  font-family: 'Jost', sans-serif;
  font-size: 13px;
  outline: none;
  transition: border-color 0.25s;

  &:focus { border-color: $gold; }

  &::placeholder { color: rgba($cream, 0.3); }
}

.newsletter__btn {
  padding: 16px 32px;
  background: $gold;
  color: $navy-3;
  font-family: 'Jost', sans-serif;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 600;
  border: 1px solid $gold;
  border-left: none;
  cursor: pointer;
  transition: background 0.25s;

  &:hover { background: $gold-2; }
}

// ═══════════════════════════════════════════════════════════
// SHIMMER ANIMATION
// ═══════════════════════════════════════════════════════════

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

// ═══════════════════════════════════════════════════════════
// RESPONSIVE
// ═══════════════════════════════════════════════════════════

@media (max-width: $bp) {
  .hero {
    grid-template-columns: 1fr;
    min-height: unset;
  }

  .hero__left {
    padding: 60px 24px 48px;
  }

  .hero__right {
    display: none;
  }

  .hero__trust {
    gap: 24px;
    padding-top: 36px;
  }

  .strip {
    padding: 14px 20px;
    gap: 12px;
    flex-direction: column;
    align-items: flex-start;
  }

  .strip__sep { display: none; }

  .newsletter {
    padding: 60px 20px;
  }

  .newsletter__title { font-size: 36px; }

  .newsletter__form {
    flex-direction: column;
  }

  .newsletter__input {
    border-right: 1px solid rgba($cream, 0.2);
    border-bottom: none;
  }

  .newsletter__btn {
    border-left: 1px solid $gold;
  }
}

</style>
