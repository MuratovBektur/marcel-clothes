<template>
  <div class="filter-mobile">

    <div class="filter-bar">
      <div class="filter-bar__active">
        <template v-if="hasActiveFilters">
          <button v-if="selectedGender" class="active-pill" @click="$emit('filter-gender', '')">
            {{ selectedGender }}&ensp;<span class="active-pill__x">✕</span>
          </button>
          <button v-if="selectedCategory" class="active-pill" @click="$emit('filter-category', '')">
            {{ selectedCategory }}&ensp;<span class="active-pill__x">✕</span>
          </button>
          <button v-if="selectedType" class="active-pill" @click="$emit('filter-type', '')">
            {{ selectedType }}&ensp;<span class="active-pill__x">✕</span>
          </button>
          <button v-if="selectedBrand" class="active-pill" @click="$emit('filter-brand', '')">
            {{ selectedBrand }}&ensp;<span class="active-pill__x">✕</span>
          </button>
          <button v-if="selectedMaterials.length" class="active-pill" @click="$emit('filter-materials', [])">
            Материал ({{ selectedMaterials.length }})<span class="active-pill__x">✕</span>
          </button>
          <button v-if="selectedColors.length" class="active-pill" @click="$emit('filter-colors', [])">
            Цвет ({{ selectedColors.length }})<span class="active-pill__x">✕</span>
          </button>
          <button v-if="selectedSizes.length" class="active-pill" @click="$emit('filter-sizes', [])">
            Размер ({{ selectedSizes.length }})<span class="active-pill__x">✕</span>
          </button>
          <button v-if="selectedPriceMin != null || selectedPriceMax != null" class="active-pill" @click="clearPrice">
            Цена: {{ selectedPriceMin ?? 0 }}–{{ selectedPriceMax ?? '∞' }}<span class="active-pill__x">✕</span>
          </button>
        </template>
        <span v-else class="filter-bar__empty">Нет фильтров</span>
      </div>

      <button class="filter-trigger" @click="sheetOpen = true">
        <div class="filter-trigger__icon">
          <span></span><span></span><span></span>
        </div>
        <span class="filter-trigger__label">Фильтр</span>
        <span v-if="activeFilterCount > 0" class="filter-trigger__badge">{{ activeFilterCount }}</span>
      </button>
    </div>

    <Transition name="sheet-overlay-fade">
      <div v-if="sheetOpen" class="sheet-overlay" @click.self="sheetOpen = false">
        <Transition name="sheet-slide">
          <div v-if="sheetOpen" class="sheet">

            <div class="sheet__handle"><div></div></div>

            <div class="sheet__head">
              <div class="sheet__title">ФИЛЬТР</div>
              <button class="sheet__close" @click="sheetOpen = false">✕</button>
            </div>

            <!-- Пол -->
            <div class="sheet__section">
              <div class="sheet__section-label">Пол</div>
              <div class="sheet__chips">
                <button class="sheet__chip" :class="{ active: !selectedGender }" @click="$emit('filter-gender', '')">Все</button>
                <button class="sheet__chip" :class="{ active: selectedGender === 'Женский' }" @click="$emit('filter-gender', 'Женский')">Женщинам</button>
                <button class="sheet__chip" :class="{ active: selectedGender === 'Мужской' }" @click="$emit('filter-gender', 'Мужской')">Мужчинам</button>
                <button class="sheet__chip" :class="{ active: isKidsGender }" @click="$emit('filter-gender', 'Детский (унисекс)')">Детям</button>
                <button class="sheet__chip" :class="{ active: selectedGender === 'Унисекс' }" @click="$emit('filter-gender', 'Унисекс')">Унисекс</button>
              </div>
            </div>

            <!-- Категория -->
            <div class="sheet__section">
              <div class="sheet__section-label">Категория</div>
              <div class="sheet__catlist">
                <button
                  v-for="c in categoryList"
                  :key="c"
                  class="sheet__catitem"
                  :class="{ active: selectedCategory === c }"
                  @click="$emit('filter-category', c)"
                >{{ c }}</button>
              </div>
            </div>

            <!-- Тип -->
            <div v-if="selectedCategory && typeList.length" class="sheet__section">
              <div class="sheet__section-label">Тип</div>
              <div class="sheet__chips">
                <button
                  v-for="t in typeList"
                  :key="t"
                  class="sheet__chip"
                  :class="{ active: selectedType === t }"
                  @click="$emit('filter-type', t)"
                >{{ t }}</button>
              </div>
            </div>

            <!-- Бренд -->
            <div v-if="brands.length" class="sheet__section">
              <div class="sheet__section-label">
                Бренд
                <button v-if="selectedBrand" class="sheet__section-clear" @click="$emit('filter-brand', '')">Сбросить</button>
              </div>
              <div class="sheet__chips">
                <button class="sheet__chip" :class="{ active: !selectedBrand }" @click="$emit('filter-brand', '')">Все</button>
                <button
                  v-for="b in brands"
                  :key="b"
                  class="sheet__chip"
                  :class="{ active: selectedBrand === b }"
                  @click="$emit('filter-brand', b)"
                >{{ b }}</button>
              </div>
            </div>

            <!-- Цена -->
            <div class="sheet__section">
              <div class="sheet__section-label">Цена</div>
              <div class="sheet__price">
                <div class="sheet__price-field">
                  <label class="sheet__price-label">От</label>
                  <input
                    v-model="localPriceMin"
                    type="number"
                    min="0"
                    placeholder="0"
                    class="sheet__price-input"
                    :class="{ 'sheet__price-input--error': priceError }"
                    @change="applyPrice"
                  />
                </div>
                <div class="sheet__price-sep">—</div>
                <div class="sheet__price-field">
                  <label class="sheet__price-label">До</label>
                  <input
                    v-model="localPriceMax"
                    type="number"
                    min="0"
                    placeholder="∞"
                    class="sheet__price-input"
                    :class="{ 'sheet__price-input--error': priceError }"
                    @change="applyPrice"
                  />
                </div>
              </div>
              <div v-if="priceError" class="sheet__price-error">Верхняя цена не может быть ниже нижней</div>
            </div>

            <!-- Материал -->
            <div class="sheet__section">
              <div class="sheet__section-label">
                Материал
                <button v-if="selectedMaterials.length" class="sheet__section-clear" @click="$emit('filter-materials', [])">Сбросить</button>
              </div>
              <div class="sheet__chips">
                <button
                  v-for="m in materials"
                  :key="m"
                  class="sheet__chip"
                  :class="{ active: selectedMaterials.includes(m) }"
                  @click="toggleMulti(selectedMaterials, m, 'filter-materials')"
                >{{ m }}</button>
              </div>
            </div>

            <!-- Цвет -->
            <div class="sheet__section">
              <div class="sheet__section-label">
                Цвет
                <button v-if="selectedColors.length" class="sheet__section-clear" @click="$emit('filter-colors', [])">Сбросить</button>
              </div>
              <div class="sheet__chips">
                <button
                  v-for="c in colors"
                  :key="c"
                  class="sheet__chip"
                  :class="{ active: selectedColors.includes(c) }"
                  @click="toggleMulti(selectedColors, c, 'filter-colors')"
                >{{ c }}</button>
              </div>
            </div>

            <!-- Размер -->
            <div class="sheet__section">
              <div class="sheet__section-label">
                Размер
                <button v-if="selectedSizes.length" class="sheet__section-clear" @click="$emit('filter-sizes', [])">Сбросить</button>
              </div>
              <div class="sheet__chips">
                <button
                  v-for="s in sizes"
                  :key="s"
                  class="sheet__chip"
                  :class="{ active: selectedSizes.includes(s) }"
                  @click="toggleMulti(selectedSizes, s, 'filter-sizes')"
                >{{ s }}</button>
              </div>
            </div>

            <div class="sheet__actions">
              <button class="btn-apply" @click="sheetOpen = false">
                Показать {{ pending ? '…' : meta.total }}
              </button>
              <button class="btn-reset" @click="$emit('filter-reset')">Сбросить</button>
            </div>

          </div>
        </Transition>
      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { CATEGORIES } from '~/constants/catalog';

const props = withDefaults(defineProps<{
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
  meta: { total: number; page: number; lastPage: number; limit: number };
  pending?: boolean;
}>(), {
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
  pending: false,
});

const emit = defineEmits([
  'filter-gender', 'filter-category', 'filter-type', 'filter-brand', 'filter-reset',
  'filter-country', 'filter-materials', 'filter-colors', 'filter-sizes', 'filter-price',
]);

const sheetOpen = ref(false);
const localPriceMin = ref<string>(props.selectedPriceMin?.toString() ?? '');
const localPriceMax = ref<string>(props.selectedPriceMax?.toString() ?? '');

watch(sheetOpen, (val) => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = val ? 'hidden' : '';
  }
});
watch(() => props.selectedPriceMin, (v) => { localPriceMin.value = v?.toString() ?? ''; });
watch(() => props.selectedPriceMax, (v) => { localPriceMax.value = v?.toString() ?? ''; });

const { materials, colors, sizes, countries, brands } = useFilterOptions();

const categoryList = computed(() => Object.keys(CATEGORIES));
const typeList = computed(() => props.selectedCategory ? (CATEGORIES[props.selectedCategory] ?? []) : []);
const isKidsGender = computed(() =>
  ['Детский (унисекс)', 'Для мальчиков', 'Для девочек'].includes(props.selectedGender),
);

const activeFilterCount = computed(() => {
  let n = 0;
  if (props.selectedGender) n++;
  if (props.selectedCategory) n++;
  if (props.selectedType) n++;
  if (props.selectedBrand) n++;
  if (props.selectedPriceMin != null || props.selectedPriceMax != null) n++;
  n += props.selectedMaterials.length;
  n += props.selectedColors.length;
  n += props.selectedSizes.length;
  return n;
});
const hasActiveFilters = computed(() => activeFilterCount.value > 0);

function toggleMulti(current: string[], value: string, eventName: string) {
  const next = current.includes(value)
    ? current.filter(v => v !== value)
    : [...current, value];
  emit(eventName as any, next);
}

const priceError = computed(() => {
  if (localPriceMin.value === '' || localPriceMax.value === '') return false;
  return Number(localPriceMax.value) < Number(localPriceMin.value);
});

function applyPrice() {
  if (priceError.value) return;
  emit('filter-price', {
    min: localPriceMin.value !== '' ? Number(localPriceMin.value) : null,
    max: localPriceMax.value !== '' ? Number(localPriceMax.value) : null,
  });
}

function clearPrice() {
  localPriceMin.value = '';
  localPriceMax.value = '';
  emit('filter-price', { min: null, max: null });
}
</script>

<style lang="scss" scoped>
$bp: 1200px;

.filter-mobile {
  display: none;

  @media (max-width: $bp) { display: block; }
}

.filter-bar {
  background: $white;
  border-bottom: 2px solid $black;
  display: flex; align-items: stretch;
  height: 48px;
}

.filter-bar__active {
  flex: 1;
  display: flex; align-items: center; gap: 6px;
  padding: 0 12px;
  overflow-x: auto; overflow-y: hidden;
  scrollbar-width: none; -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar { display: none; }
}

.active-pill {
  display: flex; align-items: center; gap: 4px;
  padding: 4px 10px;
  background: $black; color: $white;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
  white-space: nowrap; border: none; cursor: pointer; flex-shrink: 0;
  transition: background 0.12s;

  &:hover { background: $red; }
}

.active-pill__x { opacity: 0.7; margin-left: 2px; }

.filter-bar__empty {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px; letter-spacing: 1px; color: #888;
  white-space: nowrap; padding: 0 2px;
}

.filter-trigger {
  display: flex; align-items: center; gap: 8px;
  padding: 0 16px;
  background: $black; border: none; cursor: pointer; flex-shrink: 0;
  position: relative;
  transition: background 0.12s;

  &:hover { background: $red; }
}

.filter-trigger__icon {
  display: flex; flex-direction: column; gap: 3px;

  span {
    display: block; background: $white; height: 1.5px;
    &:nth-child(1) { width: 14px; }
    &:nth-child(2) { width: 10px; }
    &:nth-child(3) { width: 7px; }
  }
}

.filter-trigger__label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
  color: $white; white-space: nowrap;
}

.filter-trigger__badge {
  position: absolute; top: 8px; right: 8px;
  width: 14px; height: 14px; border-radius: 50%;
  background: $red; color: $white;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 8px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}

.sheet-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  z-index: 300;
  display: flex; flex-direction: column; justify-content: flex-end;
}

.sheet {
  background: $white;
  padding-bottom: 24px;
  max-height: 90dvh;
  overflow-y: auto;
}

.sheet__handle {
  display: flex; justify-content: center;
  padding: 12px 0 0;

  div { width: 36px; height: 3px; background: #ddd; border-radius: 2px; }
}

.sheet__head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px 12px;
  border-bottom: 1px solid #eee;
}

.sheet__title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 28px; letter-spacing: 2px; color: $black;
}

.sheet__close {
  width: 32px; height: 32px;
  background: #f5f2ed; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; color: #888;
  transition: background 0.12s, color 0.12s;

  &:hover { background: $red; color: $white; }
}

.sheet__section {
  padding: 16px 20px 12px;
  border-bottom: 1px solid #f0f0f0;
}

.sheet__section-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #555;
  margin-bottom: 10px;
  display: flex; align-items: center; gap: 12px;
}

.sheet__section-clear {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
  color: $red; background: transparent; border: none;
  cursor: pointer; padding: 0; opacity: 0.9;
  &:hover { opacity: 1; }
}

.sheet__chips { display: flex; gap: 6px; flex-wrap: wrap; }

.sheet__chip {
  padding: 8px 16px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
  border: 1.5px solid #ccc; background: transparent; color: #444;
  cursor: pointer; transition: all 0.12s;

  &:hover { border-color: $black; color: $black; }
  &.active { background: $black; border-color: $black; color: $white; }
}

.sheet__catlist { display: flex; flex-direction: column; gap: 2px; }

.sheet__catitem {
  display: flex; align-items: center;
  padding: 11px 0;
  border-bottom: 1px solid #f0f0f0;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px; font-weight: 600; color: #444;
  background: transparent; border-top: none; border-left: none; border-right: none;
  cursor: pointer; text-align: left; width: 100%;
  transition: color 0.12s;

  &:last-child { border-bottom: none; }
  &:hover { color: $black; }

  &.active {
    color: $black; font-weight: 700;
    &::before { content: '▸'; color: $red; margin-right: 8px; }
  }
}

.sheet__price {
  display: flex; align-items: center; gap: 12px;
}

.sheet__price-field {
  display: flex; flex-direction: column; gap: 4px;
  flex: 1;
}

.sheet__price-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #666;
}

.sheet__price-input {
  width: 100%;
  padding: 10px 12px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px; color: $black;
  border: 1.5px solid #ddd; background: transparent;
  outline: none;
  transition: border-color 0.12s;

  &:focus { border-color: $black; }
  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button { -webkit-appearance: none; }
}

.sheet__price-sep {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 14px; color: #ccc;
  margin-top: 18px;
  flex-shrink: 0;
}

.sheet__price-error {
  margin-top: 8px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 7px; color: $red; letter-spacing: 1px; font-weight: 700;
}

.sheet__price-input--error {
  border-color: $red !important;
}

.sheet__actions {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 8px; padding: 16px 20px 0;
}

.btn-apply {
  padding: 14px;
  background: $red; color: $white; border: none;
  cursor: pointer;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
  transition: background 0.12s;

  &:hover { background: #b00510; }
}

.btn-reset {
  padding: 14px;
  background: transparent; color: #888;
  border: 1.5px solid #ddd;
  cursor: pointer;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
  transition: all 0.12s;

  &:hover { border-color: $black; color: $black; }
}

.sheet-overlay-fade-enter-active,
.sheet-overlay-fade-leave-active { transition: opacity 0.25s ease; }
.sheet-overlay-fade-enter-from,
.sheet-overlay-fade-leave-to { opacity: 0; }

.sheet-slide-enter-active,
.sheet-slide-leave-active {
  transition: transform 0.32s cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet-slide-enter-from,
.sheet-slide-leave-to { transform: translateY(100%); }
</style>
