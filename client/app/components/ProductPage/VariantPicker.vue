<template>
  <div class="vp">
    <!-- Column headers -->
    <div class="vp__heads">
      <div class="vp__head">Цвет</div>
      <div class="vp__head">Размер</div>
      <div class="vp__head vp__head--center">Кол-во</div>
      <div class="vp__head" />
    </div>

    <!-- Rows -->
    <TransitionGroup name="vp-row" tag="div" class="vp__rows">
      <div
        v-for="row in rows"
        :key="row.id"
        class="vp__row"
      >
        <!-- Color select -->
        <select
          class="vp__sel"
          :class="{ 'vp__sel--filled': row.color }"
          :value="row.color"
          @change="onColorChange(row.id, ($event.target as HTMLSelectElement).value)"
        >
          <option value="" style="color:#bbb">— цвет —</option>
          <option
            v-for="c in availableColors(row.id, row.size)"
            :key="c"
            :value="c"
            style="color:#111;font-weight:700"
          >{{ c }}</option>
        </select>

        <!-- Size select -->
        <select
          class="vp__sel"
          :class="{ 'vp__sel--filled': row.size }"
          :value="row.size"
          @change="onSizeChange(row.id, ($event.target as HTMLSelectElement).value)"
        >
          <option value="" style="color:#bbb">— размер —</option>
          <option
            v-for="s in availableSizes(row.id, row.color)"
            :key="s"
            :value="s"
            style="color:#111;font-weight:700"
          >{{ s }}</option>
        </select>

        <!-- Qty -->
        <div class="vp__qty" :class="{ 'vp__qty--active': row.color && row.size }">
          <button
            class="vp__qty-btn"
            :disabled="!(row.color && row.size)"
            @click="changeQty(row.id, -1)"
          >−</button>
          <span class="vp__qty-val">{{ row.qty }}</span>
          <button
            class="vp__qty-btn"
            :disabled="!(row.color && row.size)"
            @click="changeQty(row.id, 1)"
          >+</button>
        </div>

        <!-- Remove -->
        <button
          class="vp__remove"
          :style="rows.length === 1 ? { visibility: 'hidden' } : {}"
          @click="removeRow(row.id)"
        >✕</button>
      </div>
    </TransitionGroup>

    <!-- Pending hint -->
    <Transition name="vp-hint">
      <div v-if="showHint" class="vp__hint">
        <div class="vp__hint-dots">
          <span /><span /><span />
        </div>
        <div class="vp__hint-text">следующий набор</div>
      </div>
    </Transition>

    <!-- Total -->
    <div v-if="totalQty > 0" class="vp__total">
      <span class="vp__total-label">Итого</span>
      <span class="vp__total-val">{{ totalQty }} шт.</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Row { id: number; color: string; size: string; qty: number }
interface Combo { color: string; size: string }
export interface VariantEntry { color: string; size: string; qty: number }

const props = defineProps<{
  colors: string[]
  sizes: string[]
  alreadyAdded?: Combo[]
}>()

const emit = defineEmits<{
  (e: 'update:variants', v: VariantEntry[]): void
}>()

let nextId = 0
const rows     = ref<Row[]>([])
const showHint = ref(false)
let pendingTimer: ReturnType<typeof setTimeout> | null = null

// ── Helpers ────────────────────────────────────────────────────────────────

function comboKey(color: string, size: string): string {
  return `${color}__${size}`
}

function takenByOthers(excludeId: number): Set<string> {
  const rowsList: Row[] = rows.value
  const cartList: Combo[] = props.alreadyAdded ?? []

  const fromRows = rowsList
    .filter((r: Row) => r.id !== excludeId && r.color && r.size)
    .map((r: Row) => comboKey(r.color, r.size))

  const fromCart = cartList
    .map((i: Combo) => comboKey(i.color, i.size))

  return new Set([...fromRows, ...fromCart])
}

function availableColors(rowId: number, selectedSize: string): string[] {
  const taken = takenByOthers(rowId)
  if (selectedSize) {
    return props.colors.filter((c: string) => !taken.has(comboKey(c, selectedSize)))
  }
  return props.colors.filter((c: string) =>
    props.sizes.some((s: string) => !taken.has(comboKey(c, s)))
  )
}

function availableSizes(rowId: number, selectedColor: string): string[] {
  const taken = takenByOthers(rowId)
  if (selectedColor) {
    return props.sizes.filter((s: string) => !taken.has(comboKey(selectedColor, s)))
  }
  return props.sizes.filter((s: string) =>
    props.colors.some((c: string) => !taken.has(comboKey(c, s)))
  )
}

function allCombosTaken(): boolean {
  const rowsList: Row[] = rows.value
  const cartList: Combo[] = props.alreadyAdded ?? []

  const fromRows = rowsList
    .filter((r: Row) => r.color && r.size)
    .map((r: Row) => comboKey(r.color, r.size))

  const fromCart = cartList
    .map((i: Combo) => comboKey(i.color, i.size))

  return new Set([...fromRows, ...fromCart]).size >= props.colors.length * props.sizes.length
}

const totalQty = computed<number>(() => {
  const list: Row[] = rows.value
  return list
    .filter((r: Row) => r.color && r.size)
    .reduce((sum: number, r: Row) => sum + r.qty, 0)
})

// ── Row operations ─────────────────────────────────────────────────────────

function addRow(): void {
  rows.value = [...rows.value, { id: nextId++, color: '', size: '', qty: 1 }]
}

function removeRow(id: number): void {
  rows.value = rows.value.filter((r: Row) => r.id !== id)
  if (rows.value.length === 0) addRow()
  emitVariants()
  maybeScheduleNextRow()
}

function onColorChange(id: number, val: string): void {
  const r: Row | undefined = rows.value.find((r: Row) => r.id === id)
  if (!r) return
  r.color = val
  if (r.size && val && !availableSizes(id, val).includes(r.size)) r.size = ''
  rows.value = [...rows.value]
  emitVariants()
  maybeScheduleNextRow()
}

function onSizeChange(id: number, val: string): void {
  const r: Row | undefined = rows.value.find((r: Row) => r.id === id)
  if (!r) return
  r.size = val
  if (r.color && val && !availableColors(id, val).includes(r.color)) r.color = ''
  rows.value = [...rows.value]
  emitVariants()
  maybeScheduleNextRow()
}

function changeQty(id: number, d: number): void {
  const r: Row | undefined = rows.value.find((r: Row) => r.id === id)
  if (!r) return
  r.qty = Math.max(1, r.qty + d)
  rows.value = [...rows.value]
  emitVariants()
}

// ── Auto-next row ──────────────────────────────────────────────────────────

function maybeScheduleNextRow(): void {
  const last = rows.value[rows.value.length - 1]
  if (!last?.color || !last?.size) return
  if (allCombosTaken()) return

  if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null }

  showHint.value = true
  pendingTimer = setTimeout(() => {
    showHint.value = false
    addRow()
    pendingTimer = null
  }, 600)
}

// ── Emit ──────────────────────────────────────────────────────────────────

function emitVariants(): void {
  emit(
    'update:variants',
    rows.value
      .filter((r: Row) => r.color && r.size)
      .map((r: Row) => ({ color: r.color, size: r.size, qty: r.qty })),
  )
}

// ── Public reset ──────────────────────────────────────────────────────────

function reset(): void {
  if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null }
  showHint.value = false
  rows.value = []
  nextId = 0
  addRow()
  emit('update:variants', [])
}

defineExpose({ reset })

// ── Init ──────────────────────────────────────────────────────────────────
addRow()
</script>

<style lang="scss" scoped>
.vp {
  display: flex;
  flex-direction: column;

  // ── Headers ──────────────────────────────────────────────
  &__heads {
    display: grid;
    grid-template-columns: 1fr 1fr 84px 28px;
    gap: 8px;
    padding-bottom: 8px;
    border-bottom: 2px solid #111;
    margin-bottom: 0;
  }

  &__head {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    text-transform: uppercase;
    font-weight: 700;
    color: #111;

    &--center { text-align: center; }
  }

  // ── Rows ─────────────────────────────────────────────────
  &__rows {
    display: flex;
    flex-direction: column;
    position: relative;
  }

  &__row {
    display: grid;
    grid-template-columns: 1fr 1fr 84px 28px;
    gap: 8px;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid #f0f0f0;

    &:last-child { border-bottom: none; }
  }

  // ── Select ───────────────────────────────────────────────
  &__sel {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    font-weight: 700;
    color: #888;
    border: 1.5px solid #e0e0e0;
    background: #fff;
    padding: 8px 24px 8px 9px;
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23999'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 7px center;
    width: 100%;
    transition: border-color .15s;

    &:focus { outline: none; border-color: #111; }

    &--filled {
      border-color: #111;
      color: #111;
    }
  }

  // ── Qty ──────────────────────────────────────────────────
  &__qty {
    display: flex;
    align-items: center;
    border: 1.5px solid #e0e0e0;
    height: 36px;
    transition: border-color .15s;

    &--active { border-color: #111; }
  }

  &__qty-btn {
    width: 26px;
    height: 100%;
    background: none;
    border: none;
    font-size: 15px;
    font-weight: 300;
    color: #666;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background .12s, color .12s;
    line-height: 1;

    &:hover:not(:disabled) { background: #111; color: #fff; }
    &:disabled { opacity: .25; cursor: default; }
  }

  &__qty-val {
    flex: 1;
    text-align: center;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    font-weight: 700;
    color: #111;
  }

  // ── Remove ───────────────────────────────────────────────
  &__remove {
    background: none;
    border: none;
    color: #ccc;
    cursor: pointer;
    font-size: 12px;
    transition: color .12s;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 36px;
    width: 28px;

    &:hover { color: #111; }
  }

  // ── Pending hint ─────────────────────────────────────────
  &__hint {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 0;
    border-bottom: 1px solid #f0f0f0;
  }

  &__hint-dots {
    display: flex;
    gap: 4px;
    align-items: center;

    span {
      display: block;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #ccc;
      animation: vp-pulse 1.1s ease-in-out infinite;

      &:nth-child(2) { animation-delay: .18s; }
      &:nth-child(3) { animation-delay: .36s; }
    }
  }

  &__hint-text {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #bbb;
  }

  // ── Total ─────────────────────────────────────────────────
  &__total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0 4px;
    border-top: 1px solid #e8e8e8;
    margin-top: 4px;
  }

  &__total-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #aaa;
    font-weight: 700;
  }

  &__total-val {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 22px;
    color: #111;
    letter-spacing: -.5px;
  }
}

// ── Transitions ─────────────────────────────────────────────

.vp-row-enter-active { transition: opacity .22s ease, transform .22s ease; }
.vp-row-enter-from   { opacity: 0; transform: translateY(-5px); }
.vp-row-leave-active { transition: opacity .15s ease; position: absolute; width: 100%; }
.vp-row-leave-to     { opacity: 0; }

.vp-hint-enter-active,
.vp-hint-leave-active { transition: opacity .2s ease; }
.vp-hint-enter-from,
.vp-hint-leave-to     { opacity: 0; }

@keyframes vp-pulse {
  0%, 100% { opacity: .25; transform: scale(.7); }
  50%       { opacity: 1;   transform: scale(1);  }
}
</style>
