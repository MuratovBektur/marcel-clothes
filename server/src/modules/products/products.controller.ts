import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get('filter-options')
  getFilterOptions() {
    return this.service.getFilterOptions();
  }

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('materials') materials?: string,
    @Query('colors') colors?: string,
    @Query('sizes') sizes?: string,
    @Query('priceMin') priceMin?: string,
    @Query('priceMax') priceMax?: string,
  ) {
    return this.service.findAll({
      page: Math.max(1, +page),
      limit: Math.min(100, Math.max(1, +limit)),
      type,
      search,
      materials: materials ? materials.split(',').filter(Boolean) : undefined,
      colors: colors ? colors.split(',').filter(Boolean) : undefined,
      sizes: sizes ? sizes.split(',').filter(Boolean) : undefined,
      priceMin: priceMin ? +priceMin : undefined,
      priceMax: priceMax ? +priceMax : undefined,
    });
  }

  @Post('list')
  findByIds(@Body('ids') ids: string[]) {
    return this.service.findByIds(ids ?? []);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const product = await this.service.findOne(id);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}
