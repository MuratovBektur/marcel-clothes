import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageView } from '../../entities/page-view.entity';
import { ButtonClick, ButtonType } from '../../entities/button-click.entity';
import { TrackViewDto } from './dto/track-view.dto';
import { TrackButtonClickDto } from './dto/track-button-click.dto';

export type ButtonCounts = Record<ButtonType, number>;

@Injectable()
export class ViewsService {
  constructor(
    @InjectRepository(PageView)
    private readonly pageViewRepo: Repository<PageView>,
    @InjectRepository(ButtonClick)
    private readonly buttonClickRepo: Repository<ButtonClick>,
  ) {}

  async track(dto: TrackViewDto): Promise<void> {
    const productId = dto.productId ?? null;
    await this.pageViewRepo
      .createQueryBuilder()
      .insert()
      .into(PageView)
      .values({ visitorId: dto.visitorId, pageType: dto.pageType, productId })
      .orIgnore()
      .execute();
  }

  async getSiteCount(): Promise<number> {
    const result = await this.pageViewRepo
      .createQueryBuilder('pv')
      .select('COUNT(DISTINCT pv.visitor_id)', 'count')
      .where('pv.page_type = :type', { type: 'site' })
      .getRawOne<{ count: string }>();
    return parseInt(result?.count ?? '0', 10);
  }

  async getProductCount(productId: string): Promise<number> {
    const result = await this.pageViewRepo
      .createQueryBuilder('pv')
      .select('COUNT(DISTINCT pv.visitor_id)', 'count')
      .where('pv.page_type = :type AND pv.product_id = :productId', {
        type: 'product',
        productId,
      })
      .getRawOne<{ count: string }>();
    return parseInt(result?.count ?? '0', 10);
  }

  async trackButtonClick(dto: TrackButtonClickDto): Promise<void> {
    await this.buttonClickRepo
      .createQueryBuilder()
      .insert()
      .into(ButtonClick)
      .values({
        visitorId: dto.visitorId,
        productId: dto.productId,
        buttonType: dto.buttonType,
      })
      .orIgnore()
      .execute();
  }

  async getButtonCounts(productId: string): Promise<ButtonCounts> {
    const rows = await this.buttonClickRepo
      .createQueryBuilder('bc')
      .select('bc.button_type', 'buttonType')
      .addSelect('COUNT(*)', 'count')
      .where('bc.product_id = :productId', { productId })
      .groupBy('bc.button_type')
      .getRawMany<{ buttonType: ButtonType; count: string }>();

    const counts: ButtonCounts = {
      whatsapp: 0,
      telegram: 0,
      tgChannel: 0,
      tgGroup: 0,
      website: 0,
      favourite: 0,
    };

    for (const row of rows) {
      counts[row.buttonType] = parseInt(row.count, 10);
    }

    return counts;
  }
}
