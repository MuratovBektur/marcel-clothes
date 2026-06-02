import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { session } from 'telegraf';
import { ClothingWizard } from './clothing.wizard';
import { EditProductScene } from './edit-product.scene';
import { TelegramBotUpdate } from './telegram-bot.update';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';
import { FileStorageService } from './file-storage.service';
import { AuthService } from './auth.service';
import { GroupService } from './group.service';
import { TgGroupService } from './messaging.service';
import { WaService } from './wa.service';
import { BotUserGroup } from '../../entities/bot-user-group.entity';
import { BotUserWaGroup } from '../../entities/bot-user-wa-group.entity';
import { BotAuthorizedUser } from '../../entities/bot-authorized-user.entity';
import { AllowedPhone } from '../../entities/allowed-phone.entity';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is not defined in environment variables');
}

@Module({
  imports: [
    TelegrafModule.forRoot({
      token: TELEGRAM_BOT_TOKEN,
      middlewares: [session()],
    }),
    TypeOrmModule.forFeature([BotUserGroup, BotUserWaGroup, BotAuthorizedUser, AllowedPhone]),
    ProductsModule,
    OrdersModule,
    HttpModule,
  ],
  providers: [
    TelegramBotUpdate,
    ClothingWizard,
    EditProductScene,
    FileStorageService,
    AuthService,
    GroupService,
    TgGroupService,
    WaService,
  ],
})
export class TelegramBotModule {}
