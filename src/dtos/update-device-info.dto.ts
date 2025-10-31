import { IsObject, IsOptional } from 'class-validator';

export class UpdateDeviceInfoDto {
  @IsObject()
  @IsOptional()
  info?: Record<string, any>;
}
