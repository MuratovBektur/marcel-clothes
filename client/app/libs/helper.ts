import type { ApiProduct, Product } from '~/types/types';

/**
 * Первая значимая строка сообщения — название товара.
 * Убираем эмодзи и пустые строки.
 */
function parseName(message: string, brand: string): string {
  const EMOJI_RE = /[\u{1F300}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

  const lines = message
    .split('\n')
    .map((l) =>
      l
        .replace(EMOJI_RE, '')
        .replace(/[‼️✅🆔💵🔢🚶‍♂️📦🌎📍☎️📲🚛🚚🛒]/g, '')
        .trim(),
    )
    .filter(Boolean);

  return lines[0] || brand;
}

/**
 * Приводит элемент API к форме, которую ожидают компоненты.
 */
export function normalizeProduct(item: ApiProduct): Product {
  return {
    ...item,
    id: item.id,
    brand: item.brand,
    name: parseName(item.message, item.brand),
    // price: item.msgPrice ?? parsePrice(item.message),
    price: item.msgPrice,
    old: null,
    badge: null,
    imgs: item.media ?? [],
    img: item.media?.[0] ?? '',
    desc: item.message,
    location: item.location,
    whatsapp: item.whatsapp,
    telegram: item.telegram,
    tgChannel: item.tgChannel,
  };
}
