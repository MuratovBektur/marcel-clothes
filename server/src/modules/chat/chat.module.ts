import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegrafModule } from 'nestjs-telegraf';
import { ChatThread } from '../../entities/chat-thread.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { ChatTelegramRef } from '../../entities/chat-telegram-ref.entity';
import { BotAuthorizedUser } from '../../entities/bot-authorized-user.entity';
import { ChatService } from './chat.service';
import { ChatNotifyService } from './chat-notify.service';
import { ChatController } from './chat.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatThread, ChatMessage, ChatTelegramRef, BotAuthorizedUser]),
    TelegrafModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatNotifyService],
  exports: [ChatService, ChatNotifyService],
})
export class ChatModule {}
