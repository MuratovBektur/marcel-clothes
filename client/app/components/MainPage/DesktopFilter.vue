<template>
  <div class="filter-zone" ref="filterZoneRef">
    <div class="filter-zone__inner">

      <div class="filter-topbar" :class="{ 'panel-open': panelOpen }">

        <button v-for="btn in filterBtns" :key="btn.key" class="ftb-btn"
          :class="{ 'panel-open': activeBtn === btn.key, 'has-value': btn.hasValue }" @click.stop="toggleBtn(btn.key)">
          {{ btn.label }}
          <span v-if="btn.badgeCount" class="ftb-badge">{{ btn.badgeCount }}</span>
          <span class="ftb-arrow">▾</span>
        </button>

        <div class="ftb-spacer"></div>

        <div class="ftb-right">
          <div class="ftb-count">
            <strong>{{ pending ? '…' : meta.total }}</strong>&ensp;товаров
          </div>
          <div class="sort-wrap">
            <select class="sort-sel">
              <option>По умолчанию</option>
              <option>По цене ↑</option>
              <option>По цене ↓</option>
              <option>Новинки</option>
            </select>
            <span class="sort-arr">▾</span>
          </div>
          <div class="view-btns">
            <button class="view-btn view-btn--active">⊞</button>
            <button class="view-btn">☰</button>
          </div>
        </div>
      </div>

      <Transition name="panel-reveal">
        <div v-if="panelOpen" class="panel-wrap" @click.stop>

          <!-- Type -->
          <div v-if="activeBtn === 'type'" class="filter-panel">
            <div class="panel-section-head">
              Тип
              <button v-if="selectedType" class="panel-clear" @click="$emit('filter-type', '')">Сбросить</button>
            </div>
            <div class="panel-options">
              <button v-for="t in types" :key="t" class="panel-opt" :class="{ active: selectedType === t }"
                @click="$emit('filter-type', t)">{{ t }}</button>
            </div>
          </div>

          <!-- Price -->
          <div v-else-if="activeBtn === 'price'" class="filter-panel">
            <div class="panel-section-head">
              Цена
              <button v-if="selectedPriceMin != null || selectedPriceMax != null" class="panel-clear"
                @click="clearPrice">Сбросить</button>
            </div>
            <div class="panel-price" :class="{ 'panel-price--error': priceError }">
              <div class="price-field">
                <label class="price-label">От</label>
                <input v-model="localPriceMin" type="number" min="0" placeholder="0" class="price-input"
                  :class="{ 'price-input--error': priceError }" @change="applyPrice" />
              </div>
              <div class="price-sep">—</div>
              <div class="price-field">
                <label class="price-label">До</label>
                <input v-model="localPriceMax" type="number" min="0" placeholder="∞" class="price-input"
                  :class="{ 'price-input--error': priceError }" @change="applyPrice" />
              </div>
            </div>
            <div v-if="priceError" class="price-error">Верхняя цена не может быть ниже нижней</div>
            <div v-else class="price-note">Фильтрует по числовому значению цены</div>
          </div>

          <!-- Material -->
          <div v-else-if="activeBtn === 'material'" class="filter-panel">
            <div class="panel-section-head">
              Материал
              <button v-if="selectedMaterials.length" class="panel-clear"
                @click="$emit('filter-materials', [])">Сбросить</button>
            </div>
            <div class="panel-options">
              <button v-for="m in materials" :key="m" class="panel-opt"
                :class="{ active: selectedMaterials.includes(m) }"
                @click="toggleMulti(selectedMaterials, m, 'filter-materials')">{{ m }}</button>
            </div>
          </div>

          <!-- Color -->
          <div v-else-if="activeBtn === 'color'" class="filter-panel">
            <div class="panel-section-head">
              Цвет
              <button v-if="selectedColors.length" class="panel-clear"
                @click="$emit('filter-colors', [])">Сбросить</button>
            </div>
            <div class="panel-options">
              <button v-for="c in colors" :key="c" class="panel-opt" :class="{ active: selectedColors.includes(c) }"
                @click="toggleMulti(selectedColors, c, 'filter-colors')">{{ c }}</button>
            </div>
          </div>

          <!-- Size -->
          <div v-else-if="activeBtn === 'size'" class="filter-panel">
            <div class="panel-section-head">
              Размер
              <button v-if="selectedSizes.length" class="panel-clear"
                @click="$emit('filter-sizes', [])">Сбросить</button>
            </div>
            <div class="panel-options">
              <button v-for="s in sizes" :key="s" class="panel-opt" :class="{ active: selectedSizes.includes(s) }"
                @click="toggleMulti(selectedSizes, s, 'filter-sizes')">{{ s }}</button>
            </div>
          </div>

          <div class="panel-actions">
            <button class="btn-apply" @click="activeBtn = null">
              Показать {{ pending ? '…' : meta.total }} товаров
            </button>
            <button class="btn-reset" @click="$emit('filter-reset'); activeBtn = null">
              Сбросить всё
            </button>
          </div>

        </div>
      </Transition>

      <div v-if="hasActiveFilters" class="active-tags-bar">
        <span class="atb-label">Выбрано:</span>
        <button v-if="selectedType" class="atb-tag" @click="$emit('filter-type', '')">
          {{ selectedType }}&ensp;<span>✕</span>
        </button>
        <button v-if="selectedMaterials.length" class="atb-tag" @click="$emit('filter-materials', [])">
          Материал ({{ selectedMaterials.length }})&ensp;<span>✕</span>
        </button>
        <button v-if="selectedColors.length" class="atb-tag" @click="$emit('filter-colors', [])">
          Цвет ({{ selectedColors.length }})&ensp;<span>✕</span>
        </button>
        <button v-if="selectedSizes.length" class="atb-tag" @click="$emit('filter-sizes', [])">
          Размер ({{ selectedSizes.length }})&ensp;<span>✕</span>
        </button>
        <button v-if="selectedPriceMin != null || selectedPriceMax != null" class="atb-tag" @click="clearPrice">
          Цена: {{ selectedPriceMin ?? 0 }}–{{ selectedPriceMax ?? '∞' }}&ensp;<span>✕</span>
        </button>
        <button class="atb-reset" @click="$emit('filter-reset')">Сбросить всё</button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

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

type BtnKey = 'type' | 'price' | 'material' | 'color' | 'size';
const activeBtn = ref<BtnKey | null>(null);
const panelOpen = computed(() => activeBtn.value !== null);
const filterZoneRef = ref<HTMLElement | null>(null);

const { materials, colors, sizes, types } = useFilterOptions();

const localPriceMin = ref<string>(props.selectedPriceMin?.toString() ?? '');
const localPriceMax = ref<string>(props.selectedPriceMax?.toString() ?? '');

watch(() => props.selectedPriceMin, (v) => { localPriceMin.value = v?.toString() ?? ''; });
watch(() => props.selectedPriceMax, (v) => { localPriceMax.value = v?.toString() ?? ''; });

function toggleBtn(btn: BtnKey) {
  activeBtn.value = activeBtn.value === btn ? null : btn;
}

function onDocClick(e: MouseEvent) {
  if (filterZoneRef.value && !filterZoneRef.value.contains(e.target as Node)) {
    activeBtn.value = null;
  }
}

onMounted(() => document.addEventListener('click', onDocClick));
onUnmounted(() => document.removeEventListener('click', onDocClick));


const filterBtns = computed(() => [
  { key: 'type' as BtnKey, label: 'Тип', hasValue: !!props.selectedType, badgeCount: props.selectedType ? 1 : 0 },
  { key: 'price' as BtnKey, label: 'Цена', hasValue: props.selectedPriceMin != null || props.selectedPriceMax != null, badgeCount: (props.selectedPriceMin != null || props.selectedPriceMax != null) ? 1 : 0 },
  { key: 'material' as BtnKey, label: 'Материал', hasValue: props.selectedMaterials.length > 0, badgeCount: props.selectedMaterials.length },
  { key: 'color' as BtnKey, label: 'Цвет', hasValue: props.selectedColors.length > 0, badgeCount: props.selectedColors.length },
  { key: 'size' as BtnKey, label: 'Размер', hasValue: props.selectedSizes.length > 0, badgeCount: props.selectedSizes.length },
]);

const hasActiveFilters = computed(() =>
  !!(props.selectedType || props.selectedMaterials.length ||
    props.selectedColors.length || props.selectedSizes.length ||
    props.selectedPriceMin != null || props.selectedPriceMax != null),
);

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

.filter-zone {
  background: $cream;
  border-bottom: 1px solid $cream-3;

  @media (max-width: $bp) {
    display: none;
  }
}

.filter-zone__inner {
  max-width: $container-max-width;
  margin: 0 auto;
  padding: 0 60px;
}

.filter-topbar {
  display: flex;
  align-items: stretch;
  height: 52px;
  border-bottom: 1px solid transparent;
  transition: border-bottom-color 0.15s;

  &.panel-open {
    border-bottom-color: $cream-3;
  }
}

.ftb-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  font-family: 'Jost', sans-serif;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: $text-muted;
  background: transparent;
  border: none;
  border-right: 1px solid $cream-3;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  position: relative;
  transition: color 0.15s, background 0.15s;

  &:first-child {
    padding-left: 0;
  }

  &:hover {
    color: $navy;
    background: $cream-2;
  }

  &.has-value {
    color: $navy;
  }

  &.has-value .ftb-arrow {
    color: $gold;
  }

  &.panel-open {
    color: $navy;
    background: $cream;

    &::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 2px;
      background: $gold;
      z-index: 1;
    }

    .ftb-arrow {
      transform: rotate(180deg);
      color: $gold;
    }
  }
}

.ftb-arrow {
  font-size: 9px;
  color: $text-muted;
  transition: transform 0.2s, color 0.15s;
}

.ftb-badge {
  min-width: 16px;
  height: 16px;
  border-radius: 50%;
  background: $navy;
  color: $cream;
  font-size: 8px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
}

.ftb-spacer {
  flex: 1;
}

.ftb-right {
  display: flex;
  align-items: center;
  border-left: 1px solid $cream-3;
  flex-shrink: 0;
}

.ftb-count {
  padding: 0 20px;
  font-family: 'Jost', sans-serif;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: $text-muted;
  border-right: 1px solid $cream-3;
  white-space: nowrap;

  strong {
    font-family: 'EB Garamond', serif;
    font-size: 18px;
    letter-spacing: 0;
    color: $navy;
    font-weight: 500;
  }
}

.sort-wrap {
  position: relative;
  display: flex;
  align-items: center;
  border-right: 1px solid $cream-3;
}

.sort-sel {
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  border: none;
  padding: 0 28px 0 16px;
  font-family: 'Jost', sans-serif;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: $text-muted;
  cursor: pointer;
  outline: none;
  height: 52px;
  transition: color 0.15s;

  &:hover {
    color: $navy;
  }
}

.sort-arr {
  position: absolute;
  right: 10px;
  font-size: 8px;
  color: $text-muted;
  pointer-events: none;
}

.view-btns {
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 4px;
}

.view-btn {
  width: 28px;
  height: 28px;
  border: 1px solid $cream-3;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: $text-muted;
  transition: all 0.15s;

  &--active {
    background: $navy;
    color: $cream;
    border-color: $navy;
  }

  &:hover:not(.view-btn--active) {
    border-color: $navy;
    color: $navy;
  }
}

.panel-wrap {
  background: $cream;
  border-bottom: 1px solid $cream-3;
}

.filter-panel {
  padding: 24px 0 8px;
  border-top: 1px solid $cream-3;
}

.panel-section-head {
  font-family: 'Jost', sans-serif;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: $text-muted;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.panel-clear {
  font-family: 'Jost', sans-serif;
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: $gold;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  opacity: 0.85;
  transition: opacity 0.15s;

  &:hover {
    opacity: 1;
  }
}

.panel-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 220px;
  overflow-y: auto;
}

.panel-opt {
  padding: 8px 16px;
  font-family: 'Jost', sans-serif;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 1px;
  text-transform: uppercase;
  border: 1px solid $cream-3;
  background: $cream;
  color: $text-muted;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;

  &:hover {
    border-color: $navy;
    color: $navy;
    background: $cream-2;
  }

  &.active {
    background: $navy;
    border-color: $navy;
    color: $cream;
  }
}

.panel-placeholder {
  font-family: 'Jost', sans-serif;
  font-size: 10px;
  color: $cream-3;
  letter-spacing: 1px;
  font-style: italic;
}

.panel-catlist {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0;
  max-height: 220px;
  overflow-y: auto;
}

.panel-catitem {
  display: flex;
  align-items: center;
  padding: 10px 8px;
  border-bottom: 1px solid $cream-3;
  font-family: 'Jost', sans-serif;
  font-size: 12px;
  font-weight: 400;
  color: $text-muted;
  background: transparent;
  border-top: none;
  border-left: none;
  border-right: none;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: color 0.15s, padding-left 0.15s;

  &:hover {
    color: $navy;
    padding-left: 14px;
  }

  &.active {
    color: $navy;
    font-weight: 500;
    padding-left: 14px;

    &::before {
      content: '›';
      color: $gold;
      margin-right: 6px;
      font-size: 14px;
    }
  }
}

.panel-price {
  display: flex;
  align-items: center;
  gap: 16px;
}

.price-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.price-label {
  font-family: 'Jost', sans-serif;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: $text-muted;
}

.price-input {
  width: 160px;
  padding: 9px 12px;
  font-family: 'Jost', sans-serif;
  font-size: 13px;
  color: $navy;
  border: 1px solid $cream-3;
  background: $cream;
  outline: none;
  transition: border-color 0.15s;

  &:focus {
    border-color: $navy;
  }

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
  }
}

.price-sep {
  font-family: 'Jost', sans-serif;
  font-size: 14px;
  color: $cream-3;
  margin-top: 20px;
}

.price-note {
  margin-top: 10px;
  font-family: 'Jost', sans-serif;
  font-size: 9px;
  color: $text-muted;
  letter-spacing: 1px;
  font-style: italic;
}

.price-error {
  margin-top: 10px;
  font-family: 'Jost', sans-serif;
  font-size: 9px;
  color: #c0392b;
  letter-spacing: 1px;
  font-weight: 600;
}

.price-input--error {
  border-color: #c0392b !important;
}

.panel-actions {
  padding: 16px 0 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-top: 1px solid $cream-3;
  margin-top: 16px;
}

.btn-apply {
  padding: 12px 32px;
  background: $navy;
  color: $cream;
  border: none;
  cursor: pointer;
  font-family: 'Jost', sans-serif;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 2px;
  text-transform: uppercase;
  transition: background 0.15s;

  &:hover {
    background: $navy-2;
  }
}

.btn-reset {
  padding: 12px 24px;
  background: transparent;
  color: $text-muted;
  border: 1px solid $cream-3;
  cursor: pointer;
  font-family: 'Jost', sans-serif;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 2px;
  text-transform: uppercase;
  transition: all 0.15s;

  &:hover {
    border-color: $navy;
    color: $navy;
  }
}

.active-tags-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0 10px;
  background: $cream-2;
  border-top: 1px solid $cream-3;
  flex-wrap: wrap;
  padding: 8px 60px 10px;
}

.atb-label {
  font-family: 'Jost', sans-serif;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: $text-muted;
  flex-shrink: 0;
}

.atb-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background: $navy;
  color: $cream;
  font-family: 'Jost', sans-serif;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 1px;
  text-transform: uppercase;
  border: none;
  cursor: pointer;
  transition: background 0.15s;

  span {
    opacity: 0.7;
  }

  &:hover {
    background: $gold;
    color: $navy-3;
  }
}

.atb-reset {
  margin-left: 4px;
  font-family: 'Jost', sans-serif;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: $gold;
  background: transparent;
  border: none;
  border-left: 1px solid $cream-3;
  cursor: pointer;
  padding: 5px 10px;
  transition: opacity 0.15s;

  &:hover {
    opacity: 0.7;
  }
}

.panel-reveal-enter-active,
.panel-reveal-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
  transform-origin: top center;
}

.panel-reveal-enter-from,
.panel-reveal-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
