<template>
  <div ref="wrapperRef" class="search-wrapper">
    <div class="search-bar" :class="{ 'search-bar--focused': isFocused, 'search-bar--dark': dark }">

      <!-- Иконка поиска -->
      <span class="search-bar__icon" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
      </span>

      <input
        class="search-bar__input"
        type="text"
        :placeholder="placeholder"
        v-model="localInput"
        @focus="isFocused = true"
        @input="isFocused = true"
        @blur="handleBlur"
        @keydown.enter="submitSearch"
      />

      <button
        v-if="localInput"
        class="search-bar__clear"
        @mousedown.prevent="clearSearch"
        aria-label="Очистить"
      >
        ✕
      </button>
    </div>

    <Transition name="suggestions-fade">
      <div
        v-if="isFocused && localInput.trim() && visibleSuggestions.length"
        class="search-suggestions"
      >
        <button
          v-for="s in visibleSuggestions"
          :key="s"
          class="search-suggestions__tag"
          @mousedown.prevent="pickSuggestion(s)"
        >
          {{ s }}
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import debounce from 'debounce';
import { SEARCH_SUGGESTIONS } from '~/libs/search-suggestions';

defineProps({
  placeholder: { type: String, default: 'Поиск по каталогу…' },
  dark: { type: Boolean, default: false },
});

const { query } = useSearch();
const localInput = ref(query.value);
const debouncedInput = ref(query.value);
const isFocused = ref(false);
const wrapperRef = ref<HTMLElement | null>(null);

watch(query, (val) => {
  localInput.value = val;
  debouncedInput.value = val;
});

const updateDebounced = debounce((val: string) => {
  debouncedInput.value = val;
}, 300);

watch(localInput, updateDebounced);

const visibleSuggestions = computed(() => {
  const q = debouncedInput.value.trim().toLowerCase();
  return SEARCH_SUGGESTIONS.filter((s) => s.toLowerCase().includes(q));
});

function submitSearch() {
  const q = localInput.value.trim();
  query.value = q;
  isFocused.value = false;
}

function pickSuggestion(s: string) {
  localInput.value = s;
  query.value = s;
  isFocused.value = false;
}

function clearSearch() {
  localInput.value = '';
  query.value = '';
}

function handleBlur() {
  setTimeout(() => {
    isFocused.value = false;
  }, 150);
}

onMounted(() => document.addEventListener('click', onDocClick));
onUnmounted(() => document.removeEventListener('click', onDocClick));

function onDocClick(e: MouseEvent) {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target as Node)) {
    isFocused.value = false;
  }
}
</script>

<style lang="scss" scoped>
.search-wrapper {
  position: relative;
  width: 100%;
}

// ── Основной стиль ───────────────────────────────────

.search-bar {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 14px;
  border: 1.5px solid $cream-3;
  background: $cream;
  transition: border-color 0.2s;
  gap: 8px;

  &--focused {
    border-color: $navy;
  }
}

.search-bar__icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  color: $text-muted;
  transition: color 0.2s;

  .search-bar--focused & {
    color: $navy;
  }
}

.search-bar__input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  font-family: 'Jost', sans-serif;
  font-size: 13px;
  font-weight: 400;
  color: $text;
  background: transparent;

  &::placeholder {
    color: $text-muted;
  }
}

.search-bar__clear {
  color: $text-muted;
  font-size: 12px;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s;
  padding: 0;
  flex-shrink: 0;
  line-height: 1;

  &:hover {
    color: $navy;
  }
}

// ── Подсказки ─────────────────────────────────────────

.search-suggestions {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 12px 14px;
  background: $cream;
  border: 1.5px solid $navy;
  z-index: 1000;
  box-shadow: 0 4px 20px rgba($navy-3, 0.1);
}

.search-suggestions__tag {
  padding: 5px 12px;
  font-family: 'Jost', sans-serif;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: $text-muted;
  border: none;
  background: $cream-2;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;

  &:hover {
    background: $navy;
    color: $cream;
  }
}

.suggestions-fade-enter-active,
.suggestions-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.suggestions-fade-enter-from,
.suggestions-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
