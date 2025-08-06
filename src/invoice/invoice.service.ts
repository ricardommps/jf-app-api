import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InvoiceEntity } from 'src/entities/invoice.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(InvoiceEntity)
    private invoiceRepository: Repository<InvoiceEntity>,
  ) {}

  async checkOverdueInvoices(customerId: number) {
    const today = new Date();

    // Fetch all invoices for the customer
    const invoices = await this.invoiceRepository.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });

    // Filter overdue invoices (status !== 'paid' and dueDate < today)
    const overdueInvoices = invoices.filter(
      (invoice) => invoice.status !== 'paid' && invoice.dueDate < today,
    );

    if (overdueInvoices.length > 0) {
      // Update the status of overdue invoices to "overdue"
      await Promise.all(
        overdueInvoices.map(async (invoice) => {
          await this.invoiceRepository.update(invoice.id, {
            status: 'overdue',
          });
        }),
      );
    }

    // Fetch all invoices again to return the updated list
    const updatedInvoices = await this.invoiceRepository.find({
      where: { customerId },
    });

    return updatedInvoices;
  }

  async getInvoiceIdByCustomerId(
    invoiceId: number,
    customerId: number,
  ): Promise<InvoiceEntity> {
    const invoice = await this.invoiceRepository.findOne({
      where: {
        id: invoiceId,
        customerId: customerId,
      },
    });
    if (!invoice) {
      throw new UnauthorizedException('User ID is required');
    }
    return invoice;
  }

  async getMyInvoices(customerId: number): Promise<InvoiceEntity[]> {
    const invoices = await this.invoiceRepository.find({
      where: {
        customerId: customerId,
        status: In(['paid', 'pending', 'overdue']),
      },
      order: { createdAt: 'DESC' },
    });
    return invoices;
  }

  async getTotalPaidInvoices(customerId: number) {
    const invoices = await this.checkOverdueInvoices(customerId);

    const filterResult = invoices.filter(
      (item) => item.status === 'paid' || item.status === 'pending',
    );

    const totalOverdue = invoices.filter((item) => item.status === 'overdue');
    return {
      totalPaid: filterResult?.length || 0,
      totalOverdue: totalOverdue?.length || 0,
    };
  }
}
