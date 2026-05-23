const fs = require('fs');
const path = require('path');
const { fetchJSON } = require('./utils.cjs');

function slugify(brand) {
  return brand.trim().toLowerCase().replace(/\s+/g, '-');
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

async function main({ baseUrl, apiBase, today, publicDir }) {
  const url = `${apiBase}/product-raw/brands`;
  console.log(`[brands] Запрашиваем бренды с ${url}...`);

  const brands = await fetchJSON(url);
  if (!Array.isArray(brands) || brands.length === 0)
    throw new Error('Сервер вернул пустой список брендов');

  console.log(`[brands] Получено: ${brands.length}`);

  const entries = brands
    .map((brand) =>
      `  <url>\n    <loc>${escapeXml(`${baseUrl}/brand/${slugify(brand)}`)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
  fs.writeFileSync(path.join(publicDir, 'sitemap-brands.xml'), xml, 'utf-8');
  console.log(`[brands] Готово — записано ${brands.length} брендов в sitemap-brands.xml`);
}

module.exports = main;
