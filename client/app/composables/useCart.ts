const STORAGE_KEY = 'marcel-clothes_cart';

export interface CartItem {
  productId: string;
  productType: string;
  price: string;
  qty: number;
  photo: string;
  color: string;
  size: string;
}

function validateCartData(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is CartItem =>
      item &&
      typeof item.productId === 'string' &&
      typeof item.productType === 'string' &&
      typeof item.price === 'string' &&
      typeof item.qty === 'number' &&
      typeof item.photo === 'string' &&
      typeof item.color === 'string' &&
      typeof item.size === 'string',
  );
}

export function readCartFromStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return validateCartData(JSON.parse(raw));
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

export function writeCartToStorage(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export const useCart = () => {
  const cartItems = useState<CartItem[]>('cart', () => []);
  const isCartHydrated = useState<boolean>('cart_hydrated', () => false);

  function cartKey(productId: string, color: string, size: string) {
    return `${productId}__${color}__${size}`;
  }

  function add(item: Omit<CartItem, 'qty'>): void {
    const key = cartKey(item.productId, item.color, item.size);
    const existing = cartItems.value.find(
      (i) => cartKey(i.productId, i.color, i.size) === key,
    );
    if (existing) {
      existing.qty++;
    } else {
      cartItems.value = [...cartItems.value, { ...item, qty: 1 }];
    }
    writeCartToStorage(cartItems.value);
  }

  function remove(productId: string, color?: string, size?: string): void {
    if (color !== undefined && size !== undefined) {
      const key = cartKey(productId, color, size);
      cartItems.value = cartItems.value.filter(
        (i) => cartKey(i.productId, i.color, i.size) !== key,
      );
    } else {
      cartItems.value = cartItems.value.filter((i) => i.productId !== productId);
    }
    writeCartToStorage(cartItems.value);
  }

  function increment(productId: string, color?: string, size?: string): void {
    const item = color !== undefined && size !== undefined
      ? cartItems.value.find((i) => cartKey(i.productId, i.color, i.size) === cartKey(productId, color, size))
      : cartItems.value.find((i) => i.productId === productId);
    if (item) {
      item.qty++;
      cartItems.value = [...cartItems.value];
      writeCartToStorage(cartItems.value);
    }
  }

  function decrement(productId: string, color?: string, size?: string): void {
    const item = color !== undefined && size !== undefined
      ? cartItems.value.find((i) => cartKey(i.productId, i.color, i.size) === cartKey(productId, color, size))
      : cartItems.value.find((i) => i.productId === productId);
    if (!item) return;
    if (item.qty <= 1) {
      remove(item.productId, item.color, item.size);
    } else {
      item.qty--;
      cartItems.value = [...cartItems.value];
      writeCartToStorage(cartItems.value);
    }
  }

  function getQty(productId: string): number {
    return cartItems.value
      .filter((i) => i.productId === productId)
      .reduce((s, i) => s + i.qty, 0);
  }

  function isInCart(productId: string): boolean {
    return cartItems.value.some((i) => i.productId === productId);
  }

  function getProductItems(productId: string): CartItem[] {
    return cartItems.value.filter((i) => i.productId === productId);
  }

  function clear(): void {
    cartItems.value = [];
    writeCartToStorage([]);
  }

  const count = computed(() => cartItems.value.reduce((s, i) => s + i.qty, 0));

  return { cartItems, isCartHydrated, add, remove, increment, decrement, getQty, isInCart, getProductItems, clear, count };
};
