<script setup lang="ts">
import Footer from '~/components/Footer.vue'
import Header from '~/components/Header/index.vue'

const route = useRoute()
const BASE = 'https://optom.store'

useHead({
  link: [
    {
      rel: 'canonical',
      href: computed(() => `${BASE}${route.path}`),
    },
  ],
  meta: [
    { name: 'robots', content: 'index, follow' },
  ],
})
</script>

<template>
  <div class="layout">
    <Header />
    <main class="layout__main">
      <slot />
    </main>
    <Footer />
  </div>
</template>

<style lang="scss" scoped>
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.layout__main {
  flex-grow: 1;
  width: 100%;
}
</style>