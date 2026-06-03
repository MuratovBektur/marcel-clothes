import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const API_BASE = process.env.API_BASE || 'http://server:5000'
const SITE_URL = 'https://marcel.kg'
const OUTPUT = join(__dirname, '../public/sitemap.xml')
const OUTPUT_BUILD = join(__dirname, '../.output/public/sitemap.xml')
const INTERVAL_MS = 60 * 60 * 1000
const RETRY_DELAY_MS = 15 * 1000
const MAX_RETRIES = 10

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function generate() {
  const products = []
  let page = 1
  let lastPage = 1

  do {
    const res = await fetch(`${API_BASE}/api/products?page=${page}&limit=100`)
    if (!res.ok) throw new Error(`API вернул ${res.status}`)
    const json = await res.json()
    products.push(...json.data)
    lastPage = json.meta.lastPage
    page++
  } while (page <= lastPage)

  const today = new Date().toISOString().split('T')[0]
  const brands = [...new Set(products.map((p) => p.brand).filter(Boolean))]

  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/about', priority: '0.7', changefreq: 'monthly' },
    { url: '/contacts', priority: '0.7', changefreq: 'monthly' },
  ]

  const entries = [
    ...staticPages.map(
      (p) => `  <url>
    <loc>${SITE_URL}${p.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
    ),
    ...brands.map(
      (brand) => `  <url>
    <loc>${SITE_URL}/brand/${encodeURIComponent(brand)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`,
    ),
    ...products.map((p) => {
      const lastmod = p.createdAt ? p.createdAt.split('T')[0] : today
      return `  <url>
    <loc>${SITE_URL}/product/${p.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`
    }),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`

  writeFileSync(OUTPUT, xml, 'utf-8')
  try { writeFileSync(OUTPUT_BUILD, xml, 'utf-8') } catch {}
  console.log(
    `[sitemap] ${new Date().toISOString()} — ${products.length} товаров, ${brands.length} брендов`,
  )
}

async function generateWithRetry() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await generate()
      return
    } catch (err) {
      console.error(`[sitemap] Попытка ${attempt}/${MAX_RETRIES} неудачна: ${err.message}`)
      if (attempt < MAX_RETRIES) {
        console.log(`[sitemap] Повтор через ${RETRY_DELAY_MS / 1000}с...`)
        await sleep(RETRY_DELAY_MS)
      }
    }
  }
  console.error('[sitemap] Все попытки исчерпаны, sitemap не создан')
}

const watch = process.argv.includes('--watch')

generateWithRetry()

if (watch) {
  setInterval(() => {
    generate().catch((err) => console.error('[sitemap] Ошибка:', err.message))
  }, INTERVAL_MS)
}
