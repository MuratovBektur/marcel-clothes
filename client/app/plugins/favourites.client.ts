import { readFavsFromStorage } from '~/composables/useFavourites';

export default defineNuxtPlugin(() => {
  const favIds = useState<string[]>('favourites', () => []);
  const isFavsHydrated = useState<boolean>('favourites_hydrated', () => false);

  favIds.value = readFavsFromStorage();

  // Поднимаем флаг только после того как данные записаны —
  // Header и страница избранного ждут именно этого момента
  isFavsHydrated.value = true;
});
