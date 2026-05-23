export interface ApiProduct {
  id: string;
  brand: string;
  message: string;
  media: string[];
  whatsapp: string | null;
  telegram: string | null;
  tgChannel: string | null;
  tgGroup: string | null;
  instagram: string | null;
  website: string | null;
  location: string;
  userType: number;
  msgPrice: number | null;
  passcode: string;
  telegramId: string | null;
}

// ── Нормализованный продукт (то, что ожидают компоненты) ─────────────────────

export interface Product extends ApiProduct {
  id: string;
  brand: string;
  name: string;
  price: number | null;
  old: number | null;
  badge: string | null;
  imgs: string[];
  img: string;
  desc: string;
  location: string;
  whatsapp: string | null;
  telegram: string | null;
  tgChannel: string | null;
}
