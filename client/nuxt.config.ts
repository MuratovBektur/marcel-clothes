// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,700;1,400;1,500&family=Jost:wght@300;400;500;600&display=swap' },
      ],
      script: [
        {
          src: '/yandex.metrika.js',
        },
        {
          src: '/google.analytics.js',
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
      siteUrl: 'https://optom.store',
    },
  },
});
