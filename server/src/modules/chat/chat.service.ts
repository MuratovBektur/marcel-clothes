import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { ChatThread } from '../../entities/chat-thread.entity';
import { ChatMessage, ChatMessageSender } from '../../entities/chat-message.entity';
import { ChatTelegramRef } from '../../entities/chat-telegram-ref.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatThread)
    private readonly threadRepo: Repository<ChatThread>,
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    @InjectRepository(ChatTelegramRef)
    private readonly refRepo: Repository<ChatTelegramRef>,
  ) {}

  async createThread(name: string, phone: string, text: string): Promise<{ thread: ChatThread; messages: ChatMessage[] }> {
    const thread = await this.threadRepo.save(this.threadRepo.create({ name, phone }));
    const clientMessage = await this.addMessage(thread.id, 'client', text);
    const waitingMessage = await this.addMessage(
      thread.id,
      'system',
      'Сообщение получено. Ожидайте — оператор скоро подключится.',
    );
    return { thread, messages: [clientMessage, waitingMessage] };
  }

  async findThread(threadId: string): Promise<ChatThread> {
    const thread = await this.threadRepo.findOneBy({ id: threadId });
    if (!thread) throw new NotFoundException('Диалог не найден');
    return thread;
  }

  async addMessage(threadId: string, sender: ChatMessageSender, text: string): Promise<ChatMessage> {
    const message = await this.messageRepo.save(
      this.messageRepo.create({ threadId, sender, text }),
    );
    await this.threadRepo.update(threadId, { updatedAt: new Date() });
    return message;
  }

  async listMessages(threadId: string, after?: Date): Promise<ChatMessage[]> {
    return this.messageRepo.find({
      where: after ? { threadId, createdAt: MoreThan(after) } : { threadId },
      order: { createdAt: 'ASC' },
    });
  }

  async saveTelegramRef(threadId: string, telegramChatId: number, telegramMessageId: number): Promise<void> {
    await this.refRepo.save(this.refRepo.create({ threadId, telegramChatId, telegramMessageId }));
  }

  async findThreadIdByTelegramRef(telegramChatId: number, telegramMessageId: number): Promise<string | null> {
    const ref = await this.refRepo.findOneBy({ telegramChatId, telegramMessageId });
    return ref?.threadId ?? null;
  }

  async getTelegramRefs(threadId: string): Promise<ChatTelegramRef[]> {
    return this.refRepo.find({ where: { threadId } });
  }

  /** Атомарно закрепляет диалог за оператором. Возвращает false, если диалог уже занят кем-то другим. */
  async claimThread(threadId: string, telegramId: number): Promise<'claimed' | 'already-yours' | 'taken'> {
    const thread = await this.findThread(threadId);
    if (Number(thread.claimedBy) === telegramId) return 'already-yours';
    if (thread.claimedBy != null) return 'taken';

    const result = await this.threadRepo
      .createQueryBuilder()
      .update(ChatThread)
      .set({ claimedBy: telegramId })
      .where('id = :id', { id: threadId })
      .andWhere('"claimedBy" IS NULL')
      .execute();
    return (result.affected ?? 0) > 0 ? 'claimed' : 'taken';
  }

  async releaseThread(threadId: string): Promise<void> {
    await this.threadRepo.update(threadId, { claimedBy: null });
  }

  async closeThread(threadId: string): Promise<void> {
    await this.threadRepo.update(threadId, { closedAt: new Date(), claimedBy: null });
    await this.addMessage(threadId, 'system', 'Клиент завершил чат.');
  }

  /** true, если у оператора сейчас есть незакрытый диалог — другие рассылки ему лучше не слать. */
  async isHandlingChat(telegramId: number): Promise<boolean> {
    const count = await this.threadRepo.count({
      where: { claimedBy: telegramId, closedAt: IsNull() },
    });
    return count > 0;
  }

  /** true, если оператор уже хотя бы раз ответил клиенту в этом диалоге. */
  async hasAdminReplied(threadId: string): Promise<boolean> {
    const count = await this.messageRepo.count({ where: { threadId, sender: 'admin' } });
    return count > 0;
  }
}
