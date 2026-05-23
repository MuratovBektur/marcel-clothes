<template>
  <div class="error-page">
    <div class="error-page__inner">

      <h1 class="error-page__title">Такой страницы не существует</h1>
      <p class="error-page__sub">
        Возможно, ссылка устарела или была допущена ошибка в адресе
      </p>

      <NuxtLink to="/" class="error-page__btn">
        Перейти в каталог
      </NuxtLink>

    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ error: { statusCode: number; message: string } }>();

useSeoMeta({
  title: 'Страница не найдена',
});
</script>

<style lang="scss">
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body { background: #f7f7f5; }
</style>

<style lang="scss" scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f7f7f5;
  padding: 24px;

  &__inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    max-width: 420px;
  }

  &__title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(28px, 5vw, 48px);
    letter-spacing: 0.5px;
    color: #111;
    line-height: 1.1;
    margin-bottom: 16px;
  }

  &__sub {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.5px;
    color: #aaa;
    line-height: 1.8;
    margin-bottom: 40px;
  }

  &__btn {
    display: inline-block;
    padding: 14px 40px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    text-decoration: none;
    color: #fff;
    background: #111;
    border: 1.5px solid #111;
    transition: background 0.18s, color 0.18s;

    &:hover {
      background: transparent;
      color: #111;
    }
  }
}
</style>
