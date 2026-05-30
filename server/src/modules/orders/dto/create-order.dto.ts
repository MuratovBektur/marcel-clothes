import { IsString, IsArray, ValidateNested, IsNumber, IsNotEmpty, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsString()
  @IsNotEmpty()
  productType!: string;

  @IsString()
  @IsNotEmpty()
  price!: string;

  @IsNumber()
  @Min(1)
  qty!: number;

  @IsString()
  photo!: string;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @IsString()
  @IsNotEmpty()
  customerPhone!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @IsString()
  @IsNotEmpty()
  total!: string;
}
