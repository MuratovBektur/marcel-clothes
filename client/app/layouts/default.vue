<script setup lang="ts">
import Footer from '~/components/Footer.vue'
import Header from '~/components/Header/index.vue'
import ChatWidget from '~/components/ChatWidget.client.vue'

</script>

<template>
  <div class="layout">
    <Header />
    <main class="layout__main">
      <slot />
    </main>
    <Footer />
    <ChatWidget />
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