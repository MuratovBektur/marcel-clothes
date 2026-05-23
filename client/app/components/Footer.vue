<template>
  <footer class="footer">
    <div class="footer__main">
      <!-- Brand -->
      <div class="footer__brand">
        <div class="footer__logo">Marsel<span>.</span></div>
        <div class="footer__logo-sub">Мужские костюмы · с 2010 года</div>
        <p class="footer__desc">
          Казахстанский дом мужских костюмов.
          Ручной пошив, безупречный крой с 2010 года.
        </p>
        <div class="footer__social">
          <a href="#" class="footer__social-btn" aria-label="Instagram">IG</a>
          <a href="#" class="footer__social-btn" aria-label="WhatsApp">WA</a>
          <a href="#" class="footer__social-btn" aria-label="Telegram">TG</a>
        </div>
      </div>

      <!-- Каталог -->
      <div class="footer__col">
        <div class="footer__col-title">Каталог</div>
        <ul class="footer__links">
          <li><RouterLink to="/" class="footer__link">Все костюмы</RouterLink></li>
          <li><RouterLink to="/" class="footer__link">Классика</RouterLink></li>
          <li><RouterLink to="/" class="footer__link">Slim Fit</RouterLink></li>
          <li><RouterLink to="/" class="footer__link">Летние</RouterLink></li>
          <li><RouterLink to="/" class="footer__link">Вечерние</RouterLink></li>
        </ul>
      </div>

      <!-- Компания -->
      <div class="footer__col">
        <div class="footer__col-title">Компания</div>
        <ul class="footer__links">
          <li><RouterLink to="/about" class="footer__link">О нас</RouterLink></li>
          <li><RouterLink to="/contacts" class="footer__link">Контакты</RouterLink></li>
          <li><a href="#" class="footer__link">Пошив на заказ</a></li>
          <li><a href="#" class="footer__link">Блог о стиле</a></li>
        </ul>
      </div>

      <!-- Помощь -->
      <div class="footer__col">
        <div class="footer__col-title">Помощь</div>
        <ul class="footer__links">
          <li><a href="#" class="footer__link">Таблица размеров</a></li>
          <li><a href="#" class="footer__link">Доставка и оплата</a></li>
          <li><a href="#" class="footer__link">Возврат и обмен</a></li>
          <li><a href="#" class="footer__link">Уход за костюмом</a></li>
        </ul>
      </div>
    </div>

    <div class="footer__bottom">
      <span class="footer__copy">© {{ year }} Marsel. Все права защищены.</span>
      <span class="footer__copy footer__copy--center">Алматы · +7 (727) 000-00-00 · marsel@example.com</span>
      <span class="footer__copy">
        <a href="#" class="footer__bottom-link">Конфиденциальность</a>
        &nbsp;·&nbsp;
        <a href="#" class="footer__bottom-link">Оферта</a>
      </span>
    </div>
  </footer>
</template>

<script setup>
const year = new Date().getFullYear();
</script>

<style lang="scss" scoped>
.footer {
  background: $navy-3;
  color: $cream;

  &__main {
    max-width: $container-max-width;
    margin: 0 auto;
    padding: 80px 60px 60px;
    display: grid;
    grid-template-columns: 1.8fr 1fr 1fr 1fr;
    gap: 60px;
  }

  // ── Brand ──────────────────────────────────────────

  &__logo {
    font-family: 'EB Garamond', serif;
    font-size: 38px;
    font-weight: 500;
    letter-spacing: 6px;
    text-transform: uppercase;
    color: $cream;
    line-height: 1;
    margin-bottom: 4px;

    span { color: $gold; }
  }

  &__logo-sub {
    font-family: 'Jost', sans-serif;
    font-size: 8px;
    letter-spacing: 3.5px;
    text-transform: uppercase;
    color: $gold;
    font-weight: 500;
    margin-bottom: 20px;
  }

  &__desc {
    font-family: 'Jost', sans-serif;
    font-size: 12px;
    line-height: 1.8;
    color: rgba($cream, 0.4);
    font-weight: 300;
    max-width: 280px;
    margin-bottom: 28px;
  }

  &__social {
    display: flex;
    gap: 10px;
  }

  &__social-btn {
    width: 38px;
    height: 38px;
    border: 1px solid rgba($cream, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Jost', sans-serif;
    font-size: 11px;
    font-weight: 600;
    color: rgba($cream, 0.4);
    text-decoration: none;
    letter-spacing: 0;
    transition: border-color 0.2s, color 0.2s;

    &:hover {
      border-color: $gold;
      color: $gold;
    }
  }

  // ── Columns ────────────────────────────────────────

  &__col-title {
    font-family: 'Jost', sans-serif;
    font-size: 9px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: $gold;
    font-weight: 600;
    margin-bottom: 24px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba($gold, 0.25);
  }

  &__links {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__link {
    font-family: 'Jost', sans-serif;
    font-size: 13px;
    font-weight: 300;
    color: rgba($cream, 0.5);
    text-decoration: none;
    transition: color 0.2s;

    &:hover {
      color: $cream;
    }
  }

  // ── Bottom ─────────────────────────────────────────

  &__bottom {
    max-width: $container-max-width;
    margin: 0 auto;
    padding: 24px 60px;
    border-top: 1px solid rgba($cream, 0.08);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }

  &__copy {
    font-family: 'Jost', sans-serif;
    font-size: 11px;
    letter-spacing: 0.5px;
    color: rgba($cream, 0.25);

    &--center {
      text-align: center;
    }
  }

  &__bottom-link {
    color: rgba($cream, 0.25);
    text-decoration: none;
    transition: color 0.2s;

    &:hover { color: $cream; }
  }

  // ── Responsive ─────────────────────────────────────

  @media (max-width: 1024px) {
    &__main {
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      padding: 60px 40px 40px;
    }

    &__brand {
      grid-column: 1 / -1;
    }

    &__desc { max-width: 100%; }
  }

  @media (max-width: 640px) {
    &__main {
      grid-template-columns: 1fr;
      padding: 40px 20px 32px;
      gap: 32px;
    }

    &__logo { font-size: 30px; letter-spacing: 4px; }

    &__bottom {
      flex-direction: column;
      gap: 8px;
      text-align: center;
      padding: 20px;
    }
  }
}
</style>
