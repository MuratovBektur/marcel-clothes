const STORAGE_KEY = 'marcel-clothes_chat_thread';

export interface ChatMessage {
  id: string;
  threadId: string;
  sender: 'client' | 'admin' | 'system';
  text: string;
  createdAt: string;
}

export function readThreadIdFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeThreadIdToStorage(threadId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, threadId);
  } catch {}
}

export function clearThreadIdFromStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function useChat() {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase as string;

  async function createThread(name: string, phone: string, text: string) {
    const data = await $fetch<{ threadId: string; messages: ChatMessage[] }>(
      `${apiBase}/chat/threads`,
      { method: 'POST', body: { name, phone, text } },
    );
    writeThreadIdToStorage(data.threadId);
    return data;
  }

  async function sendMessage(threadId: string, text: string) {
    return $fetch<ChatMessage>(`${apiBase}/chat/threads/${threadId}/messages`, {
      method: 'POST',
      body: { text },
    });
  }

  async function fetchMessages(threadId: string, after?: string) {
    return $fetch<ChatMessage[]>(`${apiBase}/chat/threads/${threadId}/messages`, {
      method: 'GET',
      query: after ? { after } : undefined,
    });
  }

  /** Уведомляет сервер о завершении диалога при закрытии/перезагрузке вкладки. */
  function closeThread(threadId: string): void {
    const url = `${apiBase}/chat/threads/${threadId}/close`;
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(url);
    } else {
      fetch(url, { method: 'POST', keepalive: true }).catch(() => {});
    }
  }

  return { createThread, sendMessage, fetchMessages, closeThread };
}
