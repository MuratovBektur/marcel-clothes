import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ViewsModule } from './modules/views/views.module';
import { TelegramBotModule } from './modules/telegram-bot/telegram-bot.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ChatModule } from './modules/chat/chat.module';

import getDBVariables from './libs/getDBVariables';
import { ScheduleModule } from '@nestjs/schedule/dist/schedule.module';
import { HttpModule } from '@nestjs/axios';

const isDev = (process.env.prod || process.env.production) !== 'true';

const { DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, DB_HOST } = getDBVariables();

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: DB_HOST,
      port: +DB_PORT,
      username: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      autoLoadEntities: true,
      entities: [__dirname + '/entities/*.entity{.ts,.js}'],
      synchronize: isDev,
    }),
    ScheduleModule.forRoot(),
    HttpModule,
    ViewsModule,
    TelegramBotModule,
    ProductsModule,
    OrdersModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
