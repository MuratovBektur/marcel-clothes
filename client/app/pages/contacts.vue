<template>
  <div class="contacts">
    <!-- Hero -->
    <div class="contacts__hero">
      <div class="contacts__hero-inner">
        <div class="contacts__eyebrow">Свяжитесь с нами</div>
        <h1 class="contacts__title">Контакты</h1>
      </div>
    </div>

    <!-- Content -->
    <div class="contacts__body">
      <div class="contacts__grid">
        <!-- Info -->
        <div class="contacts__info">
          <div class="contacts__list">
            <div class="contacts__item">
              <div class="contacts__item-icon">
                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div>
                <div class="contacts__item-label">Адрес</div>
                <div class="contacts__item-val">
                  Кыргызстан, г. Бишкек<br>
                  Дордой / Форт Оберон / Европа 3 проход 383/384/ 526/527/528
                </div>
              </div>
            </div>

            <div class="contacts__item">
              <div class="contacts__item-icon">
                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 16z"/>
                </svg>
              </div>
              <div>
                <div class="contacts__item-label">Телефон</div>
                <a href="tel:+996707273367" class="contacts__item-val contacts__item-val--link">
                  +996 (707) 27-33-67
                </a>
              </div>
            </div>

            <div class="contacts__item">
              <div class="contacts__item-icon">
                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <div>
                <div class="contacts__item-label">Email</div>
                <a href="mailto:parhatgulamov@icloud.com" class="contacts__item-val contacts__item-val--link">
                  parhatgulamov@icloud.com
                </a>
              </div>
            </div>

            <div class="contacts__item">
              <div class="contacts__item-icon">
                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div>
                <div class="contacts__item-label">Режим работы</div>
                <div class="contacts__item-val">
                   07:00 — 15:00
                </div>
              </div>
            </div>
          </div>

          <div class="contacts__socials">
            <div class="contacts__socials-label">Мы в соцсетях</div>
            <div class="contacts__socials-row">
              <a :href="instagramLink" target="_blank" class="contacts__social-btn">Instagram</a>
              <a :href="whatsappLink" target="_blank" class="contacts__social-btn">WhatsApp</a>
              <a :href="telegramLink" target="_blank" class="contacts__social-btn">Telegram</a>
            </div>
          </div>
        </div>

        <!-- CTA card -->
        <div class="contacts__cta-card">
          <div class="contacts__cta-tag">Эксклюзивно</div>
          <h2 class="contacts__cta-title">
            Запись на<br><em>примерку</em>
          </h2>
          <p class="contacts__cta-desc">
            Оставьте имя и номер телефона — наш стилист свяжется с вами
            в течение одного рабочего дня для записи на консультацию.
          </p>
          <form class="contacts__form" @submit.prevent>
            <div class="contacts__form-field">
              <label class="contacts__form-label">Имя</label>
              <input
                class="contacts__form-input"
                type="text"
                placeholder="Ваше имя"
              />
            </div>
            <div class="contacts__form-field">
              <label class="contacts__form-label">Телефон</label>
              <input
                class="contacts__form-input"
                type="tel"
                placeholder="+7 (___) ___-__-__"
              />
            </div>
            <button type="submit" class="contacts__form-btn">
              Записаться на консультацию
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="m5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { instagramLink, whatsappLink, telegramLink } from '~/constants/common';

useSeoMeta({
  title: 'Контакты',
  description: 'Контакты Marsel. Мы находимся на Дордой, Бишкек — Форт Оберон / Европа 3, проход 383/384/526/527/528. Пошив на заказ, консультация бесплатно.',
  ogTitle: 'Контакты — Marsel',
  ogDescription: 'Дордой, Бишкек — Форт Оберон / Европа 3, проход 383/384/526/527/528. Пошив на заказ, консультация бесплатно.',
});


</script>

<style lang="scss" scoped>
// ── Hero ───────────────────────────────────────────────

.contacts__hero {
  background: $navy-3;
  padding: 80px 60px 60px;
}

.contacts__hero-inner {
  max-width: $container-max-width;
  margin: 0 auto;
}

.contacts__eyebrow {
  font-family: 'Jost', sans-serif;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: $gold;
  margin-bottom: 16px;
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

.contacts__title {
  font-family: 'EB Garamond', serif;
  font-size: clamp(48px, 6vw, 80px);
  font-weight: 400;
  color: $cream;
  line-height: 1;
}

// ── Body ───────────────────────────────────────────────

.contacts__body {
  max-width: $container-max-width;
  margin: 0 auto;
  padding: 80px 60px;
}

.contacts__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: start;
}

// ── Info ───────────────────────────────────────────────

.contacts__list {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-bottom: 48px;
}

.contacts__item {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding: 28px 0;
  border-bottom: 1px solid $cream-3;

  &:first-child { border-top: 1px solid $cream-3; }
}

.contacts__item-icon {
  width: 44px;
  height: 44px;
  background: $navy;
  color: $gold;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.contacts__item-label {
  font-family: 'Jost', sans-serif;
  font-size: 9px;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: $gold;
  font-weight: 500;
  margin-bottom: 6px;
}

.contacts__item-val {
  font-family: 'EB Garamond', serif;
  font-size: 20px;
  color: $navy;
  line-height: 1.4;
  font-weight: 400;
  text-decoration: none;

  &--link {
    transition: color 0.2s;

    &:hover { color: $gold; }
  }
}

.contacts__socials { margin-top: 4px; }

.contacts__socials-label {
  font-family: 'Jost', sans-serif;
  font-size: 9px;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: $text-muted;
  font-weight: 500;
  margin-bottom: 14px;
}

.contacts__socials-row {
  display: flex;
  gap: 8px;
}

.contacts__social-btn {
  padding: 10px 20px;
  border: 1px solid $cream-3;
  font-family: 'Jost', sans-serif;
  font-size: 11px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  font-weight: 500;
  color: $navy;
  text-decoration: none;
  transition: all 0.2s;

  &:hover {
    background: $navy;
    color: $cream;
    border-color: $navy;
  }
}

// ── CTA card ───────────────────────────────────────────

.contacts__cta-card {
  background: $navy-3;
  padding: 52px 48px;
  position: sticky;
  top: 160px;
}

.contacts__cta-tag {
  font-family: 'Jost', sans-serif;
  font-size: 9px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: $gold;
  font-weight: 500;
  margin-bottom: 16px;
}

.contacts__cta-title {
  font-family: 'EB Garamond', serif;
  font-size: 44px;
  font-weight: 400;
  color: $cream;
  line-height: 1.05;
  margin-bottom: 16px;

  em { font-style: italic; color: $gold-2; }
}

.contacts__cta-desc {
  font-family: 'Jost', sans-serif;
  font-size: 13px;
  line-height: 1.8;
  color: rgba($cream, 0.5);
  font-weight: 300;
  margin-bottom: 36px;
}

.contacts__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.contacts__form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.contacts__form-label {
  font-family: 'Jost', sans-serif;
  font-size: 9px;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: rgba($cream, 0.35);
  font-weight: 500;
}

.contacts__form-input {
  padding: 14px 16px;
  background: rgba($cream, 0.05);
  border: 1px solid rgba($cream, 0.15);
  color: $cream;
  font-family: 'Jost', sans-serif;
  font-size: 14px;
  font-weight: 300;
  outline: none;
  transition: border-color 0.2s;

  &:focus { border-color: $gold; }

  &::placeholder { color: rgba($cream, 0.25); }
}

.contacts__form-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  background: $gold;
  color: $navy-3;
  font-family: 'Jost', sans-serif;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 600;
  border: none;
  cursor: pointer;
  margin-top: 8px;
  transition: background 0.2s;

  &:hover { background: $gold-2; }
}

// ── Responsive ─────────────────────────────────────────

@media (max-width: 900px) {
  .contacts__hero { padding: 60px 20px 48px; }
  .contacts__body { padding: 48px 20px; }

  .contacts__grid {
    grid-template-columns: 1fr;
    gap: 40px;
  }

  .contacts__cta-card {
    position: static;
    padding: 36px 28px;
  }
}
</style>
