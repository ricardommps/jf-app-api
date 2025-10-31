import { IsNotEmpty, IsNumber, IsObject } from 'class-validator';

export class CreateDeviceInfoDto {
  @IsNumber()
  @IsNotEmpty()
  customerId: number;

  @IsObject()
  @IsNotEmpty()
  info: {
    brand: string;
    model: string;
    uniqueId: string;
    systemVersion: string;
  };
}
