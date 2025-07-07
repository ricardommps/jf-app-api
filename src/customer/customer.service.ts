import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomerEntity } from 'src/entities/customer.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
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
}
