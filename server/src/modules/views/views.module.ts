import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PageView } from '../../entities/page-view.entity';
import { ButtonClick } from '../../entities/button-click.entity';
import { ViewsController } from './views.controller';
import { ViewsService } from './views.service';

@Module({
  imports: [TypeOrmModule.forFeature([PageView, ButtonClick])],
  controllers: [ViewsController],
  providers: [ViewsService],
})
export class ViewsModule {}
