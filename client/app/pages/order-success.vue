<template>
  <div class="success-page">
    <div class="success-page__inner">
      <div class="success-page__graphic">
        <div class="success-page__check">✓</div>
        <div class="success-page__lines"><span /><span /><span /></div>
      </div>

      <div class="success-page__body">
        <span class="success-page__label">Заказ оформлен</span>
        <h1 class="success-page__title">Спасибо!</h1>
        <p class="success-page__text">
          Ваш заказ принят.<br />
          Мы свяжемся с вами в ближайшее время.
        </p>
        <NuxtLink to="/" class="success-page__btn">
          <span class="success-page__btn-arrow">→</span>
          Продолжить покупки
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Cart is already cleared in cart.client.vue before navigation
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] });
</script>

<style lang="scss" scoped>
.success-page {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;

  &__inner {
    display: grid;
    grid-template-columns: 1fr 1fr;
    max-width: 860px;
    width: 100%;
    border: 1px solid $cream-3;
  }

  &__graphic {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 28px;
    background: $cream-2;
    border-right: 1px solid $cream-3;
    padding: 60px 40px;
  }

  &__check {
    font-size: 80px;
    line-height: 1;
    color: $navy;
    font-family: 'EB Garamond', serif;
  }

  &__lines {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 80px;

    span {
      display: block;
      height: 2px;
      background: $cream-3;

      &:nth-child(1) { width: 100%; }
      &:nth-child(2) { width: 66%; }
      &:nth-child(3) { width: 44%; }
    }
  }

  &__body {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 60px 52px;
  }

  &__label {
    display: block;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: $gold;
    margin-bottom: 12px;
  }

  &__title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 64px;
    letter-spacing: -1px;
    line-height: 0.9;
    color: $navy;
    margin-bottom: 20px;
  }

  &__text {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    line-height: 1.8;
    color: #888;
    margin-bottom: 40px;
    letter-spacing: 0.2px;
  }

  &__btn {
    display: inline-flex;
    align-items: center;
    gap: 14px;
    align-self: flex-start;
    background: $navy;
    color: $cream;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    padding: 14px 28px;
    text-decoration: none;
    border: 1.5px solid $navy;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: transparent;
      color: $navy;
    }

    &:hover &-arrow {
      transform: translateX(4px);
    }
  }

  &__btn-arrow {
    font-size: 14px;
    transition: transform 0.15s;
  }

  @media (max-width: 768px) {
    padding: 24px 16px;

    &__inner {
      grid-template-columns: 1fr;
    }

    &__graphic {
      border-right: none;
      border-bottom: 1px solid $cream-3;
      flex-direction: row;
      justify-content: flex-start;
      padding: 32px 28px;
      min-height: auto;
      gap: 20px;
    }

    &__check {
      font-size: 56px;
    }

    &__body {
      padding: 36px 28px;
    }

    &__title {
      font-size: 48px;
    }
  }
}
</style>
