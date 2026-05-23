const fs = require('fs');
const path = require('path');

const updateBrands = require('./update-brands-sitemap.cjs');
const updateProducts = require('./update-products-sitemap.cjs');

const baseUrl = process.env.BASE_URL || 'https://optom.store';

// ── Определяем папку public (dev vs production) ───────────────────────────────
const outputPublic = path.resolve(__dirname, '../.output/public');
const publicDir = fs.existsSync(outputPublic)
  ? outputPublic
  : path.resolve(__dirname, '../public');

// ── Общие переменные ──────────────────────────────────────────────────────────
const config = {
  baseUrl,
  apiBase: process.env.API_URL || `${baseUrl}/api`,
  today: new Date().toISOString().split('T')[0],
  publicDir,
};

// ── Обновление sitemap-индекса ────────────────────────────────────────────────
function updateIndex() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${config.baseUrl}/sitemap-main.xml</loc>
    <lastmod>${config.today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${config.baseUrl}/sitemap-brands.xml</loc>
    <lastmod>${config.today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${config.baseUrl}/sitemap-products.xml</loc>
    <lastmod>${config.today}</lastmod>
  </sitemap>
</sitemapindex>`;

  fs.writeFileSync(path.join(config.publicDir, 'sitemap.xml'), xml, 'utf-8');
  console.log('[index] sitemap.xml обновлён');
}

// ── Запуск ────────────────────────────────────────────────────────────────────
async function updateAllSitemaps() {
  console.log('=== Обновление всех sitemap ===');
  console.log(`baseUrl : ${config.baseUrl}`);
  console.log(`apiBase : ${config.apiBase}`);
  console.log(`today   : ${config.today}\n`);

  await updateBrands(config);
  console.log('');
  await updateProducts(config);
  console.log('');
  updateIndex();

  console.log('\n=== Готово ===');
}

module.exports = { updateAllSitemaps };

if (require.main === module) {
  updateAllSitemaps().catch((err) => {
    console.error('Ошибка:', err.message);
    process.exit(1);
  });
}
