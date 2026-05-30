import { Body, Controller, Post } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderNotifyService } from './order-notify.service';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly orderNotifyService: OrderNotifyService,
  ) {}

  @Post()
  async create(@Body() dto: CreateOrderDto) {
    const order = await this.ordersService.create(dto);
    await this.orderNotifyService.notifyNewOrder(order).catch(() => {});
    return order;
  }
}
