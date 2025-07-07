import { Controller, Get, Param } from '@nestjs/common';
import { CustomerService } from './customer.service';

@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get(':cpf')
  async findCustomerByCpf(@Param('cpf') cpf: string) {
    return this.customerService.findCustomerByCpf(cpf);
  }
}
