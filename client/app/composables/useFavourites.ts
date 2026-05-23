const STORAGE_KEY = 'marcel-clothes_favourites';

// ── Валидация структуры ───────────────────────────────────────────────────────

function validateStoredData(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  const cleaned = raw.filter(
    (item): item is string => typeof item === 'string' && item.trim() !== '',
  );

  return [...new Set(cleaned)];
}

// ── Чтение из localStorage ────────────────────────────────────────────────────

export function readFavsFromStorage(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];

    const parsed: unknown = JSON.parse(raw);
    const validated = validateStoredData(parsed);

    const originalLength = Array.isArray(parsed) ? parsed.length : -1;
    if (validated.length !== originalLength) {
      writeFavsToStorage(validated);
    }

    return validated;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

// ── Запись в localStorage ─────────────────────────────────────────────────────

export function writeFavsToStorage(ids: string[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // QuotaExceededError — игнорируем, память работает
  }
}

// ── Composable ────────────────────────────────────────────────────────────────

export const useFavourites = () => {
  const favIds = useState<string[]>('favourites', () => []);

  // false → данные ещё не прочитаны из localStorage (SSR или до плагина)
  // true  → плагин favourites.client.ts отработал, можно рендерить
  const isFavsHydrated = useState<boolean>('favourites_hydrated', () => false);

  const favsSet = computed(() => new Set(favIds.value));

  function toggle(id: string): void {
    const next = new Set(favIds.value);
    next.has(id) ? next.delete(id) : next.add(id);
    favIds.value = [...next];
    writeFavsToStorage(favIds.value);
  }

  function isFav(id: string): boolean {
    return favsSet.value.has(id);
  }

  const count = computed(() => favIds.value.length);

  return { favIds, favsSet, toggle, isFav, count, isFavsHydrated };
};
