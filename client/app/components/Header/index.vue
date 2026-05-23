<template>
  <!-- Announcement bar -->
  <!-- <div class="announce">
    Бесплатная доставка по Казахстану при заказе от <span>50 000 ₸</span> · Новая коллекция 2026
  </div> -->

  <header class="header">
    <div class="header__inner">
      <!-- Logo -->
      <a class="header__logo" @click.prevent="navigateToHome">
        <div class="header__logo-name">Marsel</div>
        <div class="header__logo-sub">Мужские костюмы · с 2010</div>
      </a>

      <!-- Desktop nav -->
      <nav class="header__nav">
        <RouterLink to="/" class="header__nav-link">Костюмы</RouterLink>
        <RouterLink to="/about" class="header__nav-link">О нас</RouterLink>
        <RouterLink to="/contacts" class="header__nav-link">Контакты</RouterLink>
      </nav>

      <!-- Desktop search -->
      <div class="header__search-wrap header__search-wrap--desktop">
        <SearchBar />
      </div>

      <!-- Desktop: favourites -->
      <ClientOnly>
        <NuxtLink
          v-if="isFavsHydrated"
          to="/favourites"
          class="header__fav header__fav--desktop"
          :class="{ 'header__fav--has': favCount > 0 }"
        >
          <span class="header__fav-icon">{{ favCount > 0 ? '♥' : '♡' }}</span>
          <span class="header__fav-label">Избранное</span>
          <span v-if="favCount > 0" class="header__fav-badge">{{ favCount }}</span>
        </NuxtLink>
        <div v-else class="header__fav-placeholder" aria-hidden="true" />
      </ClientOnly>

      <!-- Mobile: icons + burger -->
      <div class="header__mobile-group">
        <ClientOnly>
          <Transition name="fav-fade">
            <NuxtLink
              v-if="isFavsHydrated"
              to="/favourites"
              class="header__mobile-fav"
              :class="{ 'header__mobile-fav--has': favCount > 0 }"
              aria-label="Избранное"
            >
              {{ favCount > 0 ? '♥' : '♡' }}
              <span v-if="favCount > 0" class="header__mobile-fav-badge">{{ favCount }}</span>
            </NuxtLink>
          </Transition>
        </ClientOnly>
        <button
          class="header__burger"
          :class="{ 'header__burger--open': menuOpen }"
          @click="menuOpen = !menuOpen"
          aria-label="Меню"
        >
          <span class="header__burger-line" />
          <span class="header__burger-line" />
          <span class="header__burger-line" />
        </button>
      </div>
    </div>

    <!-- Mobile search row -->
    <div class="header__search-row">
      <SearchBar />
    </div>

    <!-- Mobile drawer -->
    <Transition name="drawer">
      <div
        v-if="menuOpen"
        class="header__drawer"
        @click.self="menuOpen = false"
      >
        <div class="header__drawer-panel">
          <button
            class="header__drawer-close"
            @click="menuOpen = false"
            aria-label="Закрыть"
          >
            <span /><span />
          </button>

          <div class="header__drawer-logo">
            Marsel<span>.</span>
          </div>
          <div class="header__drawer-sub">Мужские костюмы · с 2010</div>

          <nav class="header__drawer-nav">
            <NuxtLink to="/" class="header__drawer-link" @click="menuOpen = false">Костюмы</NuxtLink>
            <NuxtLink to="/about" class="header__drawer-link" @click="menuOpen = false">О нас</NuxtLink>
            <NuxtLink to="/contacts" class="header__drawer-link" @click="menuOpen = false">Контакты</NuxtLink>
          </nav>

          <div class="header__drawer-contact">
            <div class="header__drawer-contact-label">Телефон</div>
            <a href="tel:+77270000000" class="header__drawer-contact-val">+7 (727) 000-00-00</a>
          </div>
        </div>
      </div>
    </Transition>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import SearchBar from './SearchBar.vue';

defineEmits(['navigate', 'open-cart']);

const menuOpen = ref(false);
const router = useRouter();

function navigateToHome() {
  menuOpen.value = false;
  router.push('/');
}

const { count: favCount, isFavsHydrated } = useFavourites();
</script>

<style lang="scss" scoped>
$bp: 1200px;

// ── Transitions ──────────────────────────────────────────

.fav-fade-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fav-fade-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.25s ease;
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
.drawer-enter-active .header__drawer-panel,
.drawer-leave-active .header__drawer-panel {
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}
.drawer-enter-from .header__drawer-panel {
  transform: translateX(100%);
}
.drawer-leave-to .header__drawer-panel {
  transform: translateX(100%);
}

// ── Announcement bar ────────────────────────────────────

.announce {
  background: $navy;
  color: rgba($cream, 0.8);
  text-align: center;
  padding: 10px 48px;
  font-size: 11px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  font-family: 'Jost', sans-serif;
  font-weight: 400;

  span {
    color: $gold-2;
    font-weight: 600;
  }

  @media (max-width: $bp) {
    padding: 8px 16px;
    font-size: 10px;
    letter-spacing: 1px;
  }
}

// ── Header ──────────────────────────────────────────────

.header {
  background: $cream;
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 2px solid $navy;
}

.header__inner {
  max-width: $container-max-width;
  margin: 0 auto;
  padding: 0 48px;
  height: 80px;
  display: flex;
  align-items: center;
  gap: 40px;
}

// ── Logo ────────────────────────────────────────────────

.header__logo {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  cursor: pointer;
  flex-shrink: 0;
  text-decoration: none;
  user-select: none;
}

.header__logo-name {
  font-family: 'EB Garamond', serif;
  font-size: 34px;
  font-weight: 500;
  letter-spacing: 6px;
  text-transform: uppercase;
  color: $navy;
  line-height: 1;
}

.header__logo-sub {
  font-family: 'Jost', sans-serif;
  font-size: 8.5px;
  letter-spacing: 3.5px;
  text-transform: uppercase;
  color: $gold;
  font-weight: 500;
  margin-top: 3px;
}

// ── Nav ─────────────────────────────────────────────────

.header__nav {
  display: flex;
  gap: 36px;
  flex-shrink: 0;
}

.header__nav-link {
  font-family: 'Jost', sans-serif;
  font-size: 12px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: $navy;
  font-weight: 400;
  text-decoration: none;
  position: relative;
  padding-bottom: 4px;
  transition: color 0.2s;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 0;
    height: 2px;
    background: $gold;
    transition: width 0.3s;
  }

  &:hover,
  &.router-link-active {
    color: $gold;
  }

  &:hover::after,
  &.router-link-active::after {
    width: 100%;
  }
}

// ── Search ──────────────────────────────────────────────

.header__search-wrap--desktop {
  flex: 1;
  min-width: 0;
}

// ── Favourites — desktop ────────────────────────────────

.header__fav--desktop {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 22px;
  background: $navy;
  color: $cream;
  font-family: 'Jost', sans-serif;
  font-size: 11px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  font-weight: 500;
  text-decoration: none;
  flex-shrink: 0;
  transition: background 0.2s;
  white-space: nowrap;

  &:hover {
    background: $navy-2;
  }

  &.header__fav--has .header__fav-icon {
    color: $gold-2;
  }
}

.header__fav-placeholder {
  width: 140px;
  height: 42px;
  flex-shrink: 0;
}

.header__fav-icon {
  font-size: 15px;
  line-height: 1;
}

.header__fav-badge {
  background: $gold;
  color: $navy-3;
  min-width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 9px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
}

// ── Mobile group ────────────────────────────────────────

.header__mobile-group {
  display: none;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.header__mobile-fav {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  font-size: 18px;
  color: $navy;
  text-decoration: none;
  border: 1px solid $cream-3;
  transition: color 0.15s, border-color 0.15s;

  &--has {
    color: $gold;
    border-color: $gold;
  }
}

.header__mobile-fav-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: $gold;
  color: $navy-3;
  min-width: 16px;
  height: 16px;
  border-radius: 50%;
  font-size: 8px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
  font-family: 'Jost', sans-serif;
}

// ── Burger ──────────────────────────────────────────────

.header__burger {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 38px;
  height: 38px;
  padding: 4px 6px;
  background: none;
  border: 1px solid $cream-3;
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 0.2s;

  &:hover {
    border-color: $navy;
  }
}

.header__burger-line {
  display: block;
  height: 2px;
  background: $navy;
  transform-origin: center;
  transition: transform 0.22s ease, opacity 0.22s ease;
}

.header__burger--open {
  border-color: $navy;

  .header__burger-line:nth-child(1) {
    transform: translateY(7px) rotate(45deg);
  }
  .header__burger-line:nth-child(2) {
    opacity: 0;
    transform: scaleX(0);
  }
  .header__burger-line:nth-child(3) {
    transform: translateY(-7px) rotate(-45deg);
  }
}

// ── Mobile search row ───────────────────────────────────

.header__search-row {
  padding: 0 16px 12px;
  display: none;
  background: $cream;
  border-top: 1px solid $cream-3;
}

// ── Drawer ──────────────────────────────────────────────

.header__drawer {
  position: fixed;
  inset: 0;
  background: rgba($navy-3, 0.5);
  z-index: 200;
  backdrop-filter: blur(2px);
}

.header__drawer-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(320px, 88vw);
  background: $cream;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  border-left: 2px solid $navy;
}

.header__drawer-close {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 36px;
  height: 36px;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  span {
    position: absolute;
    width: 20px;
    height: 2px;
    background: $navy;
    border-radius: 1px;

    &:first-child { transform: rotate(45deg); }
    &:last-child  { transform: rotate(-45deg); }
  }
}

.header__drawer-logo {
  padding: 32px 28px 4px;
  font-family: 'EB Garamond', serif;
  font-size: 32px;
  font-weight: 500;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: $navy;
  line-height: 1;

  span { color: $gold; }
}

.header__drawer-sub {
  padding: 0 28px 20px;
  font-family: 'Jost', sans-serif;
  font-size: 9px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: $gold;
  font-weight: 500;
  border-bottom: 1px solid $cream-3;
}

.header__drawer-nav {
  display: flex;
  flex-direction: column;
  padding: 8px 0;
  flex-grow: 1;
}

.header__drawer-link {
  padding: 16px 28px;
  font-family: 'Jost', sans-serif;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 400;
  color: $navy;
  text-decoration: none;
  border-bottom: 1px solid $cream-2;
  transition: color 0.15s, padding-left 0.15s;

  &:hover,
  &.router-link-active {
    color: $gold;
    padding-left: 36px;
  }
}

.header__drawer-contact {
  padding: 24px 28px;
  border-top: 1px solid $cream-3;
}

.header__drawer-contact-label {
  font-family: 'Jost', sans-serif;
  font-size: 9px;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: $gold;
  font-weight: 500;
  margin-bottom: 6px;
}

.header__drawer-contact-val {
  font-family: 'EB Garamond', serif;
  font-size: 20px;
  color: $navy;
  text-decoration: none;
  font-weight: 400;
  transition: color 0.2s;

  &:hover { color: $gold; }
}

// ── Responsive ──────────────────────────────────────────

@media (max-width: $bp) {
  .header__inner {
    height: 60px;
    padding: 0 16px;
    gap: 0;
  }

  .header__logo-name { font-size: 26px; letter-spacing: 4px; }
  .header__logo-sub  { font-size: 7.5px; letter-spacing: 2.5px; }

  .header__nav               { display: none; }
  .header__search-wrap--desktop { display: none; }
  .header__fav--desktop      { display: none; }
  .header__fav-placeholder   { display: none; }

  .header__mobile-group { display: flex; }

  .header__search-row { display: block; }
}

@media (max-width: 375px) {
  .header__inner { height: 52px; }
  .header__logo-name { font-size: 22px; letter-spacing: 3px; }
  .header__logo-sub  { display: none; }
}
</style>
