<template>
  <div class="chat-widget">
    <Transition name="chat-panel-fade">
      <div v-if="isOpen" class="chat-panel">
        <div class="chat-panel__header">
          <div>
            <div class="chat-panel__title">Marsel</div>
            <div class="chat-panel__subtitle">Напишите нам — ответим в Telegram</div>
          </div>
          <button class="chat-panel__close" aria-label="Закрыть" @click="close">✕</button>
        </div>

        <!-- ── Форма обращения ─────────────────────────────────────── -->
        <form v-if="!threadId" class="chat-form" @submit.prevent="submitForm">
          <div class="chat-form__field">
            <label class="chat-form__label" for="chat-name">Имя</label>
            <input
              id="chat-name"
              v-model="form.name"
              class="chat-form__input"
              :class="{ 'chat-form__input--error': errors.name }"
              type="text"
              placeholder="Введите имя"
              autocomplete="name"
            />
            <span v-if="errors.name" class="chat-form__error">{{ errors.name }}</span>
          </div>

          <div class="chat-form__field">
            <label class="chat-form__label" for="chat-phone">Телефон</label>
            <input
              id="chat-phone"
              v-model="form.phone"
              class="chat-form__input"
              :class="{ 'chat-form__input--error': errors.phone }"
              type="tel"
              placeholder="+996 700 000 000"
              autocomplete="tel"
            />
            <span v-if="errors.phone" class="chat-form__error">{{ errors.phone }}</span>
          </div>

          <div class="chat-form__field">
            <label class="chat-form__label" for="chat-text">Сообщение</label>
            <textarea
              id="chat-text"
              v-model="form.text"
              class="chat-form__textarea"
              :class="{ 'chat-form__input--error': errors.text }"
              rows="3"
              placeholder="Чем можем помочь?"
            />
            <span v-if="errors.text" class="chat-form__error">{{ errors.text }}</span>
          </div>

          <button class="chat-form__submit" type="submit" :disabled="submitting">
            <span v-if="submitting" class="chat-form__spinner" />
            <span v-else>Отправить →</span>
          </button>

          <p v-if="submitError" class="chat-form__submit-error">{{ submitError }}</p>
        </form>

        <!-- ── Переписка ───────────────────────────────────────────── -->
        <template v-else>
          <div ref="messagesEl" class="chat-messages">
            <div
              v-for="m in messages"
              :key="m.id"
              :class="[
                m.sender === 'system' ? 'chat-system' : 'chat-bubble',
                m.sender === 'client' && 'chat-bubble--client',
                m.sender === 'admin' && 'chat-bubble--admin',
              ]"
            >
              {{ m.text }}
            </div>
          </div>

          <form class="chat-reply" @submit.prevent="submitReply">
            <input
              v-model="replyText"
              class="chat-reply__input"
              type="text"
              placeholder="Ваше сообщение..."
            />
            <button class="chat-reply__send" type="submit" :disabled="sending || !replyText.trim()">
              →
            </button>
          </form>
        </template>
      </div>
    </Transition>

    <button
      class="chat-widget__btn"
      :class="{ 'chat-widget__btn--open': isOpen }"
      aria-label="Открыть чат"
      @click="toggle"
    >
      <span v-if="hasUnread" class="chat-widget__badge" />
      <template v-if="!isOpen">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 4h16v12H8l-4 4V4z"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
        </svg>
        <span class="chat-widget__btn-label">Написать нам</span>
      </template>
      <span v-else class="chat-widget__btn-close">✕</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue';
import {
  useChat,
  readThreadIdFromStorage,
  clearThreadIdFromStorage,
  type ChatMessage,
} from '~/composables/useChat';

const { createThread, sendMessage, fetchMessages, closeThread } = useChat();

const isOpen = ref(false);
const threadId = ref<string | null>(null);
const messages = ref<ChatMessage[]>([]);
const messagesEl = ref<HTMLElement | null>(null);
const hasUnread = ref(false);

const form = reactive({ name: '', phone: '', text: '' });
const errors = reactive<{ name?: string; phone?: string; text?: string }>({});
const submitting = ref(false);
const submitError = ref('');

const replyText = ref('');
const sending = ref(false);

let pollTimer: ReturnType<typeof setInterval> | null = null;

function scrollToBottom() {
  nextTick(() => {
    if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
  });
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(poll, isOpen.value ? 4000 : 20000);
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

async function poll() {
  if (!threadId.value) return;
  const last = messages.value[messages.value.length - 1];
  try {
    const fresh = await fetchMessages(threadId.value, last?.createdAt);
    const knownIds = new Set(messages.value.map((m) => m.id));
    const newOnes = fresh.filter((m) => !knownIds.has(m.id));
    if (newOnes.length) {
      messages.value = [...messages.value, ...newOnes];
      if (!isOpen.value && newOnes.some((m) => m.sender === 'admin')) hasUnread.value = true;
      if (isOpen.value) scrollToBottom();
    }
  } catch {
    // network hiccup — try again on next tick
  }
}

function toggle() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    hasUnread.value = false;
    startPolling();
    scrollToBottom();
  } else {
    startPolling();
  }
}

function close() {
  isOpen.value = false;
  startPolling();
}

function validate(): boolean {
  errors.name = undefined;
  errors.phone = undefined;
  errors.text = undefined;
  if (!form.name.trim()) errors.name = 'Введите имя';
  const phone = form.phone.replace(/\D/g, '');
  if (phone.length < 7) errors.phone = 'Введите корректный номер';
  if (!form.text.trim()) errors.text = 'Введите сообщение';
  return !errors.name && !errors.phone && !errors.text;
}

async function submitForm() {
  if (!validate()) return;
  submitting.value = true;
  submitError.value = '';
  try {
    const data = await createThread(form.name.trim(), form.phone.trim(), form.text.trim());
    threadId.value = data.threadId;
    messages.value = data.messages;
    scrollToBottom();
    startPolling();
  } catch {
    submitError.value = 'Не удалось отправить сообщение. Попробуйте ещё раз.';
  } finally {
    submitting.value = false;
  }
}

async function submitReply() {
  const text = replyText.value.trim();
  if (!text || !threadId.value) return;
  sending.value = true;
  try {
    const message = await sendMessage(threadId.value, text);
    messages.value = [...messages.value, message];
    replyText.value = '';
    scrollToBottom();
  } catch {
    // leave text in the input so the user can retry
  } finally {
    sending.value = false;
  }
}

function handleUnload() {
  if (threadId.value) {
    closeThread(threadId.value);
    clearThreadIdFromStorage();
  }
}

onMounted(async () => {
  const existing = readThreadIdFromStorage();
  if (existing) {
    threadId.value = existing;
    try {
      messages.value = await fetchMessages(existing);
    } catch {
      messages.value = [];
    }
  }
  startPolling();
  window.addEventListener('beforeunload', handleUnload);
  window.addEventListener('pagehide', handleUnload);
});

onUnmounted(() => {
  stopPolling();
  window.removeEventListener('beforeunload', handleUnload);
  window.removeEventListener('pagehide', handleUnload);
});
</script>

<style lang="scss" scoped>
.chat-widget {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1000;
}

.chat-widget__btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 84px;
  padding: 0 28px;
  border-radius: 14px;
  background: $gold;
  color: $navy;
  border: none;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  transition: transform 0.15s ease, background 0.15s ease;

  &:hover {
    transform: scale(1.03);
    background: $gold-2;
  }

  &--open {
    width: 84px;
    padding: 0;
  }
}

.chat-widget__btn-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
  white-space: nowrap;
}

.chat-widget__btn-close {
  font-size: 27px;
  line-height: 1;
}

.chat-widget__badge {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: $navy;
  border: 3px solid $cream;
}

.chat-panel-fade-enter-active,
.chat-panel-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.chat-panel-fade-enter-from,
.chat-panel-fade-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

.chat-panel {
  position: absolute;
  right: 0;
  bottom: 108px;
  width: 510px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  background: $cream;
  border: 1px solid $cream-3;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 24px 27px;
    border-bottom: 1px solid $cream-3;
    background: $navy;
    color: $cream;
  }

  &__title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 33px;
    letter-spacing: -0.5px;
  }

  &__subtitle {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 14px;
    letter-spacing: 1px;
    color: rgba(246, 241, 233, 0.65);
    margin-top: 6px;
  }

  &__close {
    background: none;
    border: none;
    color: $cream;
    font-size: 20px;
    cursor: pointer;
    padding: 3px 6px;
    line-height: 1;
    opacity: 0.8;

    &:hover { opacity: 1; }
  }

  @media (max-width: 600px) {
    width: calc(100vw - 32px);
  }
}

// ── Форма ──────────────────────────────────────────────────

.chat-form {
  padding: 27px;
  display: flex;
  flex-direction: column;
  gap: 21px;

  &__field {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  &__label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 14px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #aaa;
  }

  &__input,
  &__textarea {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 18px;
    color: $navy;
    background: #fff;
    border: 1.5px solid $cream-3;
    padding: 15px 18px;
    outline: none;
    transition: border-color 0.15s;
    width: 100%;
    resize: vertical;

    &:focus { border-color: $navy; }
    &::placeholder { color: #bbb; }
  }

  &__input--error { border-color: #c0392b; }

  &__error {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 14px;
    color: #c0392b;
    letter-spacing: 1px;
  }

  &__submit {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 15px;
    background: $navy;
    color: $cream;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 20px 30px;
    border: 1.5px solid $navy;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;

    &:hover:not(:disabled) {
      background: transparent;
      color: $navy;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  &__spinner {
    display: block;
    width: 18px;
    height: 18px;
    border: 3px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: chat-spin 0.7s linear infinite;
  }

  &__submit-error {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 14px;
    color: #c0392b;
    letter-spacing: 1px;
    text-align: center;
  }
}

@keyframes chat-spin {
  to { transform: rotate(360deg); }
}

// ── Переписка ──────────────────────────────────────────────

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px 27px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  min-height: 330px;
}

.chat-system {
  align-self: center;
  max-width: 90%;
  padding: 9px 21px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 14px;
  letter-spacing: 0.5px;
  text-align: center;
  line-height: 1.5;
  color: #999;
  background: $cream-2;
  border-radius: 18px;
}

.chat-bubble {
  max-width: 80%;
  padding: 14px 20px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 18px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;

  &--client {
    align-self: flex-end;
    background: $navy;
    color: $cream;
  }

  &--admin {
    align-self: flex-start;
    background: $cream-2;
    color: $navy;
    border: 1px solid $cream-3;
  }
}

.chat-reply {
  display: flex;
  border-top: 1px solid $cream-3;

  &__input {
    flex: 1;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 18px;
    color: $navy;
    background: #fff;
    border: none;
    padding: 21px 24px;
    outline: none;

    &::placeholder { color: #bbb; }
  }

  &__send {
    width: 72px;
    background: $navy;
    color: $cream;
    border: none;
    font-size: 24px;
    cursor: pointer;
    transition: opacity 0.15s;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

// ── Узкие экраны (≤600px): блок и шрифты компактнее на ~25% ──
@media (max-width: 600px) {
  .chat-widget__btn {
    height: 63px;
    padding: 0 21px;
    gap: 9px;
    border-radius: 11px;

    &--open {
      width: 63px;
      padding: 0;
    }
  }

  .chat-widget__btn-label { font-size: 12px; }
  .chat-widget__btn-close { font-size: 20px; }

  .chat-widget__badge {
    top: 4px;
    right: 4px;
    width: 11px;
    height: 11px;
    border-width: 2px;
  }

  .chat-panel {
    bottom: 81px;

    &__header { padding: 18px 20px; }
    &__title { font-size: 25px; }
    &__subtitle { font-size: 11px; margin-top: 4px; }
    &__close { font-size: 15px; padding: 2px 4px; }
  }

  .chat-form {
    padding: 20px;
    gap: 16px;

    &__field { gap: 7px; }
    &__label { font-size: 11px; }
    &__input,
    &__textarea { font-size: 14px; padding: 11px 13px; }
    &__error { font-size: 11px; }
    &__submit { font-size: 11px; padding: 15px 22px; gap: 11px; }
    &__spinner { width: 14px; height: 14px; border-width: 2px; }
    &__submit-error { font-size: 11px; }
  }

  .chat-messages {
    padding: 18px 20px;
    gap: 11px;
    min-height: 250px;
  }

  .chat-system {
    font-size: 11px;
    padding: 7px 16px;
    border-radius: 14px;
  }

  .chat-bubble {
    font-size: 14px;
    padding: 10px 15px;
  }

  .chat-reply {
    &__input { font-size: 14px; padding: 16px 18px; }
    &__send { width: 54px; font-size: 18px; }
  }
}
</style>
