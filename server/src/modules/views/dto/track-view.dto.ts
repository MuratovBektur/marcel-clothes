import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PageType } from '../../../entities/page-view.entity';

export class TrackViewDto {
  @IsUUID()
  visitorId!: string;

  @IsIn(['site', 'product'])
  pageType!: PageType;

  @IsOptional()
  @IsString()
  productId?: string;
}
