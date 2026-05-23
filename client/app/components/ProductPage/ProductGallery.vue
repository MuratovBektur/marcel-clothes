<template>
  <div class="product-gallery">
    <div class="product-gallery__main-wrap">
      <video
        v-if="isVideo(images[activeIndex])"
        :key="'main-' + images[activeIndex]"
        :src="images[activeIndex]"
        autoplay
        muted
        loop
        playsinline
        class="product-gallery__main"
      ></video>

      <img v-else :src="images[activeIndex]" :alt="alt" class="product-gallery__main" />

      <div class="product-gallery__badges">
        <span v-if="badge === 'new'" class="product-gallery__badge product-gallery__badge--new"
          >New</span
        >
        <span v-if="badge === 'sale'" class="product-gallery__badge product-gallery__badge--sale"
          >Sale</span
        >
      </div>
    </div>

    <div v-if="images.length > 1" class="product-gallery__thumbs">
      <button
        v-for="(url, i) in images"
        :key="i"
        class="product-gallery__thumb-btn"
        :class="{ 'product-gallery__thumb-btn--on': activeIndex === i }"
        @click="activeIndex = i"
      >
        <video
          v-if="isVideo(url)"
          :src="url"
          muted
          playsinline
          class="product-gallery__thumb-img"
        ></video>

        <img v-else :src="url" :alt="`Фото ${i + 1}`" class="product-gallery__thumb-img" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  images: { type: Array, required: true },
  alt: { type: String, default: '' },
  badge: { type: String, default: null },
});

const activeIndex = ref(0);

// Функция определения видео
function isVideo(url) {
  if (!url) return false;
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
  return videoExtensions.some((ext) => url.toLowerCase().endsWith(ext));
}
</script>

<style lang="scss" scoped>
.product-gallery {
  display: flex;
  flex-direction: column;
  height: 100%;

  &__main-wrap {
    position: relative;
    aspect-ratio: 3 / 4;
    overflow: hidden;
    background: #f5f5f5;
    cursor: zoom-in;
    flex-shrink: 0;

    &:hover .product-gallery__main {
      transform: scale(1.04);
    }
  }

  &__main {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    object-position: top center;
    transition: transform 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  &__badges {
    position: absolute;
    top: 14px;
    left: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    z-index: 2;
  }

  &__badge {
    display: inline-block;
    padding: 3px 9px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;

    &--new {
      background: #111;
      color: #fff;
    }

    &--sale {
      background: #fff;
      color: #111;
      border: 1px solid #e0e0e0;
    }
  }

  &__thumbs {
    display: flex;
    flex-direction: row;
    gap: 3px;
    padding-top: 6px;
    overflow-x: auto;
    scrollbar-width: none;
    flex-shrink: 0;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  &__thumb-btn {
    aspect-ratio: 3 / 4;
    width: 64px;
    flex-shrink: 0;
    padding: 0;
    border: 2px solid transparent;
    background: #f5f5f5;
    cursor: pointer;
    overflow: hidden;
    transition: border-color 0.15s;

    &--on {
      border-color: #111;
    }

    &:not(&--on):hover {
      border-color: #ccc;
    }
  }

  &__thumb-img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    object-position: top center;
    filter: brightness(0.7);
    transition: filter 0.2s;

    .product-gallery__thumb-btn--on & {
      filter: brightness(1);
    }

    .product-gallery__thumb-btn:hover & {
      filter: brightness(0.9);
    }
  }
}
</style>
