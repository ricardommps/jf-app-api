import { Controller, Get, Query, UnauthorizedException } from '@nestjs/common';
import { InvoiceEntity } from 'src/entities/invoice.entity';
import { Roles } from '../decorators/roles.decorator';
import { UserId } from '../decorators/user-id.decorator';
import { UserType } from '../utils/user-type.enum';
import { InvoiceService } from './invoice.service';

@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Get()
  async getInvoiceCustomer(
    @UserId() userId: number,
    @Query('invoiceId') invoiceId: string,
  ): Promise<InvoiceEntity> {
    if (!userId) {
      throw new UnauthorizedException('User ID is required');
    }
    return this.invoiceService.getInvoiceIdByCustomerId(
      Number(invoiceId),
      userId,
    );
  }

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Get('myInvoices')
  async getMyInvoices(@UserId() userId: number): Promise<InvoiceEntity[]> {
    if (!userId) {
      throw new UnauthorizedException('User ID is required');
    }
    return this.invoiceService.getMyInvoices(userId);
  }

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Get('/total-paid')
  async getTotalPaidInvoices(@UserId() userId: number) {
    return this.invoiceService.getTotalPaidInvoices(userId);
  }

  @Roles(UserType.Admin, UserType.Root)
  @Get('/customers-overdue')
  async getCustomersWithOverdueInvoices() {
    return this.invoiceService.getCustomersWithOverdueInvoices();
  }
}
