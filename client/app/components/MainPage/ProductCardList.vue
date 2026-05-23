<template>
  <div class="catalog">

    <!-- ── SECTION HEAD ── -->
    <div class="section-head">
      <div>
        <div class="section-eyebrow">Ассортимент</div>
        <h2 class="section-title">Наши <em>костюмы</em></h2>
      </div>
      <div class="catalog__filters">
        <button
          v-for="tab in FILTER_TABS"
          :key="tab.value"
          class="filter-tab"
          :class="{ active: selectedType === tab.value }"
          @click="$emit('filter-type', tab.value)"
        >{{ tab.label }}</button>
      </div>
    </div>

    <!-- ── FILTERS ── -->
    <DesktopFilter
      :selected-gender="selectedGender"
      :selected-category="selectedCategory"
      :selected-type="selectedType"
      :selected-brand="selectedBrand"
      :selected-country="selectedCountry"
      :selected-materials="selectedMaterials"
      :selected-colors="selectedColors"
      :selected-sizes="selectedSizes"
      :selected-price-min="selectedPriceMin"
      :selected-price-max="selectedPriceMax"
      :meta="meta"
      :pending="pending"
      @filter-gender="$emit('filter-gender', $event)"
      @filter-category="$emit('filter-category', $event)"
      @filter-type="$emit('filter-type', $event)"
      @filter-brand="$emit('filter-brand', $event)"
      @filter-country="$emit('filter-country', $event)"
      @filter-materials="$emit('filter-materials', $event)"
      @filter-colors="$emit('filter-colors', $event)"
      @filter-sizes="$emit('filter-sizes', $event)"
      @filter-price="$emit('filter-price', $event)"
      @filter-reset="$emit('filter-reset')"
    />

    <MobileFilter
      :selected-gender="selectedGender"
      :selected-category="selectedCategory"
      :selected-type="selectedType"
      :selected-brand="selectedBrand"
      :selected-country="selectedCountry"
      :selected-materials="selectedMaterials"
      :selected-colors="selectedColors"
      :selected-sizes="selectedSizes"
      :selected-price-min="selectedPriceMin"
      :selected-price-max="selectedPriceMax"
      :meta="meta"
      :pending="pending"
      @filter-gender="$emit('filter-gender', $event)"
      @filter-category="$emit('filter-category', $event)"
      @filter-type="$emit('filter-type', $event)"
      @filter-brand="$emit('filter-brand', $event)"
      @filter-country="$emit('filter-country', $event)"
      @filter-materials="$emit('filter-materials', $event)"
      @filter-colors="$emit('filter-colors', $event)"
      @filter-sizes="$emit('filter-sizes', $event)"
      @filter-price="$emit('filter-price', $event)"
      @filter-reset="$emit('filter-reset')"
    />

    <!-- ── PAGE LABEL ── -->
    <div class="section-label">
      <div class="section-label__line"></div>
      <div class="section-label__text">
        {{ pending ? 'Загрузка…' : `Страница ${meta.page} из ${meta.lastPage}` }}
      </div>
      <div class="section-label__line"></div>
    </div>

    <!-- ── GRID ── -->
    <div class="grid">
      <template v-if="pending">
        <div v-for="n in limit" :key="`sk-${n}`" class="grid__skeleton" />
      </template>

      <template v-else-if="products.length">
        <ProductCard
          v-for="item in products"
          :key="item.id"
          :product="item"
        />
      </template>

      <div v-else class="grid__empty">
        <strong class="grid__empty-dash">—</strong>
        <span class="grid__empty-text">Ничего не найдено</span>
      </div>
    </div>

    <!-- ── PAGINATION ── -->
    <div v-if="!pending && meta.lastPage > 1" class="pagination">
      <button
        class="page-btn page-btn--arrow"
        :disabled="meta.page <= 1"
        @click="$emit('change-page', meta.page - 1)"
        aria-label="Назад"
      >‹</button>

      <template v-for="p in pageRange" :key="p">
        <span v-if="p === '...'" class="page-gap">…</span>
        <button
          v-else
          class="page-btn"
          :class="{ 'page-btn--on': p === meta.page }"
          @click="$emit('change-page', p)"
        >{{ p }}</button>
      </template>

      <button
        class="page-btn page-btn--arrow"
        :disabled="meta.page >= meta.lastPage"
        @click="$emit('change-page', meta.page + 1)"
        aria-label="Вперёд"
      >›</button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ProductCard from './ProductCard.vue';
import DesktopFilter from './DesktopFilter.vue';
import MobileFilter from './MobileFilter.vue';
import type { Product } from '~/composables/useProducts';

const FILTER_TABS = [
  { label: 'Все',      value: '' },
  { label: 'Классика', value: 'Классика' },
  { label: 'Slim Fit', value: 'Slim Fit' },
  { label: 'Casual',   value: 'Casual' },
];

const props = withDefaults(defineProps<{
  products: Product[];
  meta: { total: number; page: number; lastPage: number; limit: number };
  pending?: boolean;
  limit?: number;
  selectedGender?: string;
  selectedCategory?: string;
  selectedType?: string;
  selectedBrand?: string;
  selectedCountry?: string;
  selectedMaterials?: string[];
  selectedColors?: string[];
  selectedSizes?: string[];
  selectedPriceMin?: number | null;
  selectedPriceMax?: number | null;
}>(), {
  pending: false,
  limit: 20,
  selectedGender: '',
  selectedCategory: '',
  selectedType: '',
  selectedBrand: '',
  selectedCountry: '',
  selectedMaterials: () => [],
  selectedColors: () => [],
  selectedSizes: () => [],
  selectedPriceMin: null,
  selectedPriceMax: null,
});

defineEmits([
  'change-page',
  'filter-gender',
  'filter-category',
  'filter-type',
  'filter-brand',
  'filter-country',
  'filter-materials',
  'filter-colors',
  'filter-sizes',
  'filter-price',
  'filter-reset',
]);

const pageRange = computed(() => {
  const { page, lastPage } = props.meta;
  if (lastPage <= 7) return Array.from({ length: lastPage }, (_, i) => i + 1);
  const pages = new Set([1, lastPage]);
  for (let i = Math.max(2, page - 2); i <= Math.min(lastPage - 1, page + 2); i++) pages.add(i);
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
$bp: 1024px;

// ── Catalog wrapper ───────────────────────────────────────

.catalog {
  max-width: $container-max-width;
  margin: 0 auto;
  padding: 100px 60px 60px;
}

// ── Section head ──────────────────────────────────────────

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 48px;
  padding-bottom: 24px;
  border-bottom: 1px solid $cream-3;
}

.section-eyebrow {
  font-family: 'Jost', sans-serif;
  font-size: 10px;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: $gold;
  font-weight: 500;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 10px;

  &::before {
    content: '';
    display: block;
    width: 20px;
    height: 2px;
    background: $gold;
  }
}

.section-title {
  font-family: 'EB Garamond', serif;
  font-size: 44px;
  font-weight: 400;
  color: $navy;
  line-height: 1.1;

  em { font-style: italic; }
}

// ── Filter tabs ───────────────────────────────────────────

.catalog__filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-tab {
  padding: 10px 22px;
  font-family: 'Jost', sans-serif;
  font-size: 11px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  border: 1px solid $cream-3;
  color: $text-muted;
  background: none;
  cursor: pointer;
  transition: all 0.2s;

  &.active,
  &:hover {
    background: $navy;
    color: $cream;
    border-color: $navy;
  }
}

// ── Page label ────────────────────────────────────────────

.section-label {
  padding: 32px 0 24px;
  display: flex;
  align-items: center;
  gap: 20px;
}

.section-label__line {
  flex: 1;
  height: 1px;
  background: $cream-3;
}

.section-label__text {
  font-family: 'Jost', sans-serif;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: $text-muted;
  flex-shrink: 0;
}

// ── Grid ─────────────────────────────────────────────────

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
  padding-bottom: 60px;
  min-height: 400px;
}

.grid__skeleton {
  aspect-ratio: 3 / 4;
  background: linear-gradient(90deg, $cream-2 25%, $cream-3 50%, $cream-2 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border: 1px solid $cream-3;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.grid__empty {
  grid-column: 1 / -1;
  padding: 100px 0;
  text-align: center;
}

.grid__empty-dash {
  display: block;
  font-family: 'EB Garamond', serif;
  font-size: 80px;
  color: $cream-3;
  margin-bottom: 16px;
  font-style: italic;
}

.grid__empty-text {
  font-family: 'Jost', sans-serif;
  font-size: 11px;
  letter-spacing: 2px;
  color: $text-muted;
  text-transform: uppercase;
}

// ── Pagination ────────────────────────────────────────────

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 0 20px;
  border-top: 1px solid $cream-3;
  gap: 0;
}

.page-btn {
  min-width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Jost', sans-serif;
  font-size: 13px;
  font-weight: 400;
  background: $cream;
  border: 1px solid $cream-3;
  margin-left: -1px;
  color: $text-muted;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  z-index: 0;

  &:hover:not(:disabled) {
    color: $navy;
    border-color: $navy;
    z-index: 1;
  }

  &--on {
    background: $navy;
    border-color: $navy;
    color: $cream;
    z-index: 2;
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

.page-gap {
  font-family: 'Jost', sans-serif;
  font-size: 13px;
  color: $text-muted;
  border: 1px solid $cream-3;
  min-width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -1px;
  user-select: none;
}

// ── Responsive ────────────────────────────────────────────

@media (max-width: $bp) {
  .catalog {
    padding: 60px 20px 40px;
  }

  .section-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
  }

  .section-title { font-size: 32px; }

  .catalog__filters { flex-wrap: wrap; }

  .grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    padding-bottom: 32px;
  }

  .pagination { padding: 24px 0 16px; flex-wrap: wrap; gap: 4px; }
  .page-btn   { min-width: 38px; height: 38px; font-size: 12px; }
  .page-gap   { min-width: 38px; height: 38px; }
}

@media (max-width: 540px) {
  .grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
}

@media (max-width: 375px) {
  .section-title { font-size: 28px; }
  .grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .section-label { padding: 16px 0 12px; }
  .page-btn, .page-gap { min-width: 32px; height: 32px; font-size: 11px; }
  .pagination { padding: 16px 0; gap: 2px; }
}
</style>
