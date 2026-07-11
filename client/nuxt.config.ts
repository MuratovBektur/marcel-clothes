// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  app: {
    head: {
      titleTemplate: '%s — Marsel',
      htmlAttrs: { lang: 'ru' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'format-detection', content: 'telephone=no' },
        { property: 'og:site_name', content: 'Marsel' },
        { property: 'og:locale', content: 'ru_RU' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,700;1,400;1,500&family=Jost:wght@300;400;500;600&family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;700&display=swap',
          media: 'print',
          onload: "this.media='all'",
        },
      ],
      noscript: [
        {
          innerHTML:
            '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,700;1,400;1,500&family=Jost:wght@300;400;500;600&family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;700&display=swap">',
        },
      ],
    },
  },
  css: [
    // You can add other global CSS files here
    '~/assets/scss/main.scss',
  ],
  devServer: {
    host: '0.0.0.0',
    port: 3000,
  },
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "~/assets/scss/_variables.scss" as *;',
        },
      },
    },
    server: {
      allowedHosts: ['client'],
    },
  },
  alias: {
    '@components': './components',
  },
  devtools: { enabled: true },
  modules: ['@nuxt/image'],
  runtimeConfig: {
    // То, что доступно только на сервере (SSR)
    apiInternal: 'http://server:5000', // Имя сервиса бэкенда в docker-compose

    // То, что доступно и клиенту, и серверу
    public: {
      apiBase: '/api', // Для браузера запросы будут идти относительно домена
    },
  },
});
