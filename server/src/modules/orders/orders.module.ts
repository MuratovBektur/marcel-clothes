import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegrafModule } from 'nestjs-telegraf';
import { Order } from '../../entities/order.entity';
import { BotAuthorizedUser } from '../../entities/bot-authorized-user.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderNotifyService } from './order-notify.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, BotAuthorizedUser]),
    TelegrafModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderNotifyService],
  exports: [OrdersService],
})
export class OrdersModule {}
