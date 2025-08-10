import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { File as MulterFile } from 'multer';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { Repository } from 'typeorm';
import { CustomerEntity } from '../entities/customer.entity';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
    private cloudinary: CloudinaryService,
  ) {}

  async findCustomerByCpf(cpf: string): Promise<CustomerEntity> {
    const customer = await this.customerRepository.findOne({
      where: {
        cpf,
      },
    });
    if (!customer) {
      throw new NotFoundException(`Cpf: ${cpf} Not Found`);
    }
    return customer;
  }

  async findCustomerById(userId: number): Promise<CustomerEntity> {
    const customer = await this.customerRepository.findOne({
      where: {
        id: userId,
      },
    });
    if (!customer) {
      throw new NotFoundException(`CustomerId: ${userId} Not Found`);
    }
    return customer;
  }

  async uploadImageToCloudinary(file: MulterFile, userId: number) {
    const customer = await this.findCustomerById(userId);
    if (!customer) {
      throw new NotFoundException(
        'Somente usuários autenticados podem mudar o avatar',
      );
    }
    if (customer.cloudinaryId && customer.avatar) {
      await this.cloudinary.deleteImage(String(customer.cloudinaryId));
    }
    const result = await this.cloudinary.uploadImage(file);
    customer.avatar = result?.secure_url || customer.avatar;
    customer.cloudinaryId = result?.public_id || customer.cloudinaryId;
    return this.customerRepository.save({
      ...customer,
    });
  }
}
