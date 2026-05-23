const fs = require('fs');
const path = require('path');
const { fetchJSON } = require('./utils.cjs');

async function main({ baseUrl, apiBase, today, publicDir }) {
  const url = `${apiBase}/product-raw/ids`;
  console.log(`[products] Запрашиваем ID продуктов с ${url}...`);

  const ids = await fetchJSON(url);
  if (!Array.isArray(ids) || ids.length === 0)
    throw new Error('Сервер вернул пустой список продуктов');

  console.log(`[products] Получено: ${ids.length}`);

  const entries = ids
    .map((id) =>
      `  <url>\n    <loc>${baseUrl}/product/${id}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.5</priority>\n  </url>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
  fs.writeFileSync(path.join(publicDir, 'sitemap-products.xml'), xml, 'utf-8');
  console.log(`[products] Готово — записано ${ids.length} продуктов в sitemap-products.xml`);
}

module.exports = main;
