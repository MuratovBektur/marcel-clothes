import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ViewsService, ButtonCounts } from './views.service';
import { TrackViewDto } from './dto/track-view.dto';
import { TrackButtonClickDto } from './dto/track-button-click.dto';

@Controller('views')
export class ViewsController {
  constructor(private readonly viewsService: ViewsService) {}

  @Post()
  async track(@Body() dto: TrackViewDto): Promise<void> {
    await this.viewsService.track(dto);
  }

  @Get('site')
  async siteCount(): Promise<{ count: number }> {
    return { count: await this.viewsService.getSiteCount() };
  }

  @Get('product/:productId')
  async productCount(
    @Param('productId') productId: string,
  ): Promise<{ count: number }> {
    return { count: await this.viewsService.getProductCount(productId) };
  }

  @Post('button-click')
  async trackButtonClick(@Body() dto: TrackButtonClickDto): Promise<void> {
    await this.viewsService.trackButtonClick(dto);
  }

  @Get('product/:productId/buttons')
  async buttonCounts(
    @Param('productId') productId: string,
  ): Promise<ButtonCounts> {
    return this.viewsService.getButtonCounts(productId);
  }
}
