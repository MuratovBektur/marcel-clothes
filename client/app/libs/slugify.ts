/** "ALISH BRAND KG" → "alish-brand-kg", "M-Sport" → "m-sport" */
export function slugify(brand: string | null | undefined): string {
  if (!brand) return '';
  return brand.trim().toLowerCase().replace(/\s+/g, '-');
}
