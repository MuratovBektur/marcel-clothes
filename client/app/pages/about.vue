<template>
  <div class="about">
    <!-- Hero -->
    <div class="about__hero">
      <div class="about__hero-inner">
        <div class="about__eyebrow">О бренде</div>
        <h1 class="about__title">Пятнадцать лет <em>мастерства</em></h1>
        <p class="about__lead">
          Marsel — казахстанский дом мужской одежды, основанный в 2010 году.
          Мы специализируемся на костюмах для деловых людей, которые ценят
          качество тканей и безупречный крой.
        </p>
      </div>
    </div>

    <!-- Stats -->
    <div class="about__stats-bar">
      <div class="about__stat">
        <div class="about__stat-num">15+</div>
        <div class="about__stat-label">Лет на рынке</div>
      </div>
      <div class="about__stats-sep"></div>
      <div class="about__stat">
        <div class="about__stat-num">4 000+</div>
        <div class="about__stat-label">Клиентов</div>
      </div>
      <div class="about__stats-sep"></div>
      <div class="about__stat">
        <div class="about__stat-num">70+</div>
        <div class="about__stat-label">Ручных операций</div>
      </div>
      <div class="about__stats-sep"></div>
      <div class="about__stat">
        <div class="about__stat-num">100%</div>
        <div class="about__stat-label">Премиальные ткани</div>
      </div>
    </div>

    <!-- Content grid -->
    <div class="about__content">
      <div class="about__cards">
        <div class="about__card">
          <div class="about__card-num">01</div>
          <div class="about__card-title">Премиальные ткани</div>
          <p class="about__card-text">
            Мы работаем только с проверенными поставщиками тканей высшего класса.
            Шерсть, кашемир, лён и шёлк — строгий отбор на каждом этапе.
          </p>
        </div>
        <div class="about__card">
          <div class="about__card-num">02</div>
          <div class="about__card-title">Ручной пошив</div>
          <p class="about__card-text">
            Каждый костюм проходит более 70 операций ручного пошива.
            Наши мастера — это люди с многолетним опытом.
          </p>
        </div>
        <div class="about__card">
          <div class="about__card-num">03</div>
          <div class="about__card-title">Индивидуальный крой</div>
          <p class="about__card-text">
            Снимаем более 20 мерок и учитываем особенности вашей фигуры
            для идеальной посадки каждого изделия.
          </p>
        </div>
        <div class="about__card">
          <div class="about__card-num">04</div>
          <div class="about__card-title">Гарантия качества</div>
          <p class="about__card-text">
            Бесплатная подгонка в течение 30 дней после получения заказа.
            Ваш костюм должен сидеть идеально.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: () => 'О нас — Marsel, казахстанский дом мужских костюмов',
  description: () =>
    'Marsel — казахстанский дом мужской одежды с 2010 года. Премиальные ткани, ручной пошив, индивидуальный крой.',
  ogTitle: () => 'О нас — Marsel',
  ogDescription: () =>
    'Marsel — казахстанский дом мужской одежды с 2010 года. Ручной пошив, индивидуальный крой.',
});
</script>

<style lang="scss" scoped>
// ── Hero ───────────────────────────────────────────────

.about__hero {
  background: $navy-3;
  padding: 100px 60px 80px;
}

.about__hero-inner {
  max-width: 800px;
  margin: 0 auto;
}

.about__eyebrow {
  font-family: 'Jost', sans-serif;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: $gold;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;

  &::before {
    content: '';
    display: block;
    width: 24px;
    height: 2px;
    background: $gold;
  }
}

.about__title {
  font-family: 'EB Garamond', serif;
  font-size: clamp(44px, 6vw, 72px);
  font-weight: 400;
  line-height: 1.05;
  color: $cream;
  margin-bottom: 28px;

  em {
    font-style: italic;
    color: $gold-2;
  }
}

.about__lead {
  font-family: 'Jost', sans-serif;
  font-size: 16px;
  line-height: 1.8;
  color: rgba($cream, 0.55);
  font-weight: 300;
  max-width: 600px;
}

// ── Stats bar ──────────────────────────────────────────

.about__stats-bar {
  background: $navy;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 60px;
  gap: 0;
  flex-wrap: wrap;
}

.about__stat {
  padding: 0 60px;
  text-align: center;
}

.about__stats-sep {
  width: 1px;
  height: 50px;
  background: rgba($cream, 0.1);
}

.about__stat-num {
  font-family: 'EB Garamond', serif;
  font-size: 44px;
  font-weight: 400;
  color: $gold-2;
  line-height: 1;
  margin-bottom: 6px;
}

.about__stat-label {
  font-family: 'Jost', sans-serif;
  font-size: 9px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: rgba($cream, 0.35);
  font-weight: 400;
}

// ── Content ────────────────────────────────────────────

.about__content {
  padding: 80px 60px;
  max-width: $container-max-width;
  margin: 0 auto;
}

.about__cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2px;
  background: $cream-3;
}

.about__card {
  background: $cream;
  padding: 48px 40px;
  transition: background 0.3s;

  &:hover {
    background: $cream-2;
  }
}

.about__card-num {
  font-family: 'EB Garamond', serif;
  font-size: 52px;
  font-weight: 400;
  color: $cream-3;
  line-height: 1;
  margin-bottom: 16px;
  transition: color 0.3s;

  .about__card:hover & {
    color: $gold;
  }
}

.about__card-title {
  font-family: 'EB Garamond', serif;
  font-size: 24px;
  font-weight: 500;
  color: $navy;
  margin-bottom: 12px;
}

.about__card-text {
  font-family: 'Jost', sans-serif;
  font-size: 13px;
  line-height: 1.8;
  color: $text-muted;
  font-weight: 300;
}

// ── Responsive ─────────────────────────────────────────

@media (max-width: 768px) {
  .about__hero { padding: 60px 20px 48px; }
  .about__stats-bar { padding: 32px 20px; gap: 16px; }
  .about__stat { padding: 0 24px; }
  .about__stat-num { font-size: 36px; }
  .about__content { padding: 48px 20px; }

  .about__cards {
    grid-template-columns: 1fr;
  }

  .about__card { padding: 32px 24px; }
}
</style>
