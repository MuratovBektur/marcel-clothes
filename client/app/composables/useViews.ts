const VISITOR_KEY = 'marcel-clothes_visitor_id';

export type ButtonType =
  | 'whatsapp'
  | 'telegram'
  | 'tgChannel'
  | 'tgGroup'
  | 'website'
  | 'favourite';

export type ButtonCounts = Record<ButtonType, number>;

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function getVisitorId(): string {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = generateUUID();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

export function useViews() {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase as string;

  async function trackSite() {
    if (import.meta.server) return;
    const visitorId = getVisitorId();
    await $fetch(`${apiBase}/views`, {
      method: 'POST',
      body: { visitorId, pageType: 'site' },
    }).catch(() => {});
  }

  async function trackProduct(productId: string) {
    if (import.meta.server) return;
    const visitorId = getVisitorId();
    await $fetch(`${apiBase}/views`, {
      method: 'POST',
      body: { visitorId, pageType: 'product', productId },
    }).catch(() => {});
  }

  async function trackButtonClick(productId: string, buttonType: ButtonType) {
    if (import.meta.server) return;
    const visitorId = getVisitorId();
    await $fetch(`${apiBase}/views/button-click`, {
      method: 'POST',
      body: { visitorId, productId, buttonType },
    }).catch(() => {});
  }

  async function getSiteCount(): Promise<number> {
    const data = await $fetch<{ count: number }>(`${apiBase}/views/site`).catch(
      () => ({ count: 0 }),
    );
    return data.count;
  }

  async function getProductCount(productId: string): Promise<number> {
    const data = await $fetch<{ count: number }>(
      `${apiBase}/views/product/${productId}`,
    ).catch(() => ({ count: 0 }));
    return data.count;
  }

  async function getButtonCounts(productId: string): Promise<ButtonCounts> {
    const data = await $fetch<ButtonCounts>(
      `${apiBase}/views/product/${productId}/buttons`,
    ).catch(
      () =>
        ({
          whatsapp: 0,
          telegram: 0,
          tgChannel: 0,
          tgGroup: 0,
          website: 0,
          favourite: 0,
        }) as ButtonCounts,
    );
    return data;
  }

  return {
    trackSite,
    trackProduct,
    trackButtonClick,
    getSiteCount,
    getProductCount,
    getButtonCounts,
  };
}
