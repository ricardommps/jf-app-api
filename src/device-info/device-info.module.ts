import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceInfoEntity } from 'src/entities/device.entity';
import { DeviceInfoController } from './device-info.controller';
import { DeviceInfoService } from './device-info.service';

@Module({
  imports: [TypeOrmModule.forFeature([DeviceInfoEntity])],
  controllers: [DeviceInfoController],
  providers: [DeviceInfoService],
  exports: [DeviceInfoService],
})
export class DeviceInfoModule {}
