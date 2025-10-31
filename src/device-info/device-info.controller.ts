import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { CreateDeviceInfoDto } from 'src/dtos/create-device-info.dto';
import { DeviceInfoService } from './device-info.service';

@Controller('device-info')
export class DeviceInfoController {
  constructor(private readonly deviceInfoService: DeviceInfoService) {}

  @Get(':customerId')
  async findByCustomer(@Param('customerId', ParseIntPipe) customerId: number) {
    return this.deviceInfoService.findByCustomerId(customerId);
  }

  @Post()
  async upsert(@Body() dto: CreateDeviceInfoDto) {
    return this.deviceInfoService.upsert(dto);
  }
}

// import DeviceInfo from 'react-native-device-info';
// import api from './api';

// async function syncDeviceInfo(customerId) {
//   const info = {
//     brand: await DeviceInfo.getBrand(),
//     model: await DeviceInfo.getModel(),
//     uniqueId: await DeviceInfo.getUniqueId(),
//     systemVersion: await DeviceInfo.getSystemVersion(),
//   };

//   await api.post('/device-info', { customerId, info });
// }

// npx typeorm migration:generate -n AddUniqueConstraintToDeviceInfo
// E depois:

// bash
// Copiar código
// npx typeorm migration:run
