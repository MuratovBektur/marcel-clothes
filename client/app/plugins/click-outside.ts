import type { ObjectDirective } from 'vue';

type ClickOutsideEl = HTMLElement & {
  _clickOutsideHandler?: (e: MouseEvent) => void;
};

const clickOutside: ObjectDirective<ClickOutsideEl> = {
  // SSR — ничего не делаем, атрибуты не нужны
  getSSRProps() {
    return {};
  },

  mounted(el, binding) {
    el._clickOutsideHandler = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) {
        binding.value(e);
      }
    };
    document.addEventListener('click', el._clickOutsideHandler);
  },

  unmounted(el) {
    if (el._clickOutsideHandler) {
      document.removeEventListener('click', el._clickOutsideHandler);
    }
  },
};

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('click-outside', clickOutside);
});
