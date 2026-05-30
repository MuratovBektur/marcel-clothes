import { readCartFromStorage } from '~/composables/useCart';

export default defineNuxtPlugin(() => {
  const cartItems = useState('cart', () => []);
  const isCartHydrated = useState<boolean>('cart_hydrated', () => false);

  cartItems.value = readCartFromStorage() as any;
  isCartHydrated.value = true;
});
