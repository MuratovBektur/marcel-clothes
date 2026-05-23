import { IsIn, IsString, IsUUID } from 'class-validator';
import { ButtonType } from '../../../entities/button-click.entity';

const BUTTON_TYPES: ButtonType[] = [
  'whatsapp',
  'telegram',
  'tgChannel',
  'tgGroup',
  'website',
  'favourite',
];

export class TrackButtonClickDto {
  @IsUUID()
  visitorId!: string;

  @IsString()
  productId!: string;

  @IsIn(BUTTON_TYPES)
  buttonType!: ButtonType;
}
