import { BadRequestException, Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatNotifyService } from './chat-notify.service';
import { CreateThreadDto } from './dto/create-thread.dto';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatNotifyService: ChatNotifyService,
  ) {}

  @Post('threads')
  async createThread(@Body() dto: CreateThreadDto) {
    const { thread, messages } = await this.chatService.createThread(
      dto.name,
      dto.phone,
      dto.text,
    );
    await this.chatNotifyService.notifyNewThread(thread, dto.text).catch(() => {});
    return { threadId: thread.id, messages };
  }

  @Post('threads/:id/messages')
  async addMessage(@Param('id') id: string, @Body() dto: CreateMessageDto) {
    const thread = await this.chatService.findThread(id);
    if (thread.closedAt) throw new BadRequestException('Диалог завершён');
    if (!(await this.chatService.hasAdminReplied(id))) {
      throw new BadRequestException('Дождитесь ответа оператора');
    }
    const message = await this.chatService.addMessage(id, 'client', dto.text);
    await this.chatNotifyService.notifyNewMessage(thread, dto.text).catch(() => {});
    return message;
  }

  @Get('threads/:id/messages')
  async listMessages(@Param('id') id: string, @Query('after') after?: string) {
    await this.chatService.findThread(id);
    const afterDate = after ? new Date(after) : undefined;
    return this.chatService.listMessages(id, afterDate);
  }

  @Post('threads/:id/close')
  @HttpCode(204)
  async closeThread(@Param('id') id: string) {
    const thread = await this.chatService.findThread(id).catch(() => null);
    if (!thread || thread.closedAt) return;
    await this.chatService.closeThread(id);
    await this.chatNotifyService.notifyThreadClosed(thread).catch(() => {});
  }
}
