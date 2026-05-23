(function () {
  const trackingId = 'G-P4NHFSL7PT';

  // Проверяем, не добавлен ли уже этот скрипт
  if (document.getElementById('google-tag-manager')) return;

  const script = document.createElement('script');
  script.id = 'google-tag-manager';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function () {
      dataLayer.push(arguments);
    };

  gtag('js', new Date());
  gtag('config', trackingId);
})();
