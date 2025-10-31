import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateDeviceInfoDto } from 'src/dtos/create-device-info.dto';
import { DeviceInfoEntity } from 'src/entities/device.entity';
import { Repository } from 'typeorm';

@Injectable()
export class DeviceInfoService {
  constructor(
    @InjectRepository(DeviceInfoEntity)
    private readonly deviceInfoRepo: Repository<DeviceInfoEntity>,
  ) {}

  async upsert(data: CreateDeviceInfoDto): Promise<DeviceInfoEntity> {
    const filtered = {
      brand: data.info.brand,
      model: data.info.model,
      uniqueId: data.info.uniqueId,
      systemVersion: data.info.systemVersion,
    };

    const existing = await this.deviceInfoRepo.findOne({
      where: { customerId: data.customerId },
    });

    if (existing) {
      existing.info = filtered;
      return this.deviceInfoRepo.save(existing);
    }

    const newInfo = this.deviceInfoRepo.create({
      customerId: data.customerId,
      info: filtered,
    });

    try {
      return await this.deviceInfoRepo.save(newInfo);
    } catch (error) {
      if (error.code === '23505') {
        // Código de erro para violação de unique constraint no Postgres
        throw new ConflictException(
          'Device info already exists for this customer',
        );
      }
      throw new InternalServerErrorException('Error saving device info');
    }
  }

  async findByCustomerId(customerId: number): Promise<DeviceInfoEntity | null> {
    const deviceInfo = await this.deviceInfoRepo.findOne({
      where: { customerId },
    });
    return deviceInfo;
  }
}
