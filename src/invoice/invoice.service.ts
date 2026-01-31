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

  async getCustomersWithOverdueInvoices() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Busca todas as faturas atrasadas com informações do cliente
    const overdueInvoices = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.customer', 'customer')
      .where('invoice.status != :paidStatus', { paidStatus: 'paid' })
      .andWhere('invoice.dueDate < :today', { today })
      .andWhere('customer.active = :active', { active: true })
      .orderBy('invoice.dueDate', 'ASC')
      .getMany();

    // Agrupa por cliente e pega a fatura mais antiga de cada um
    const customersMap = new Map();

    overdueInvoices.forEach((invoice) => {
      if (invoice.customer && !customersMap.has(invoice.customerId)) {
        const daysOverdue = Math.floor(
          (today.getTime() - new Date(invoice.dueDate).getTime()) /
            (1000 * 60 * 60 * 24),
        );

        // Converte totalAmount de string "600,00" para número 600.00
        const totalAmount = invoice.totalAmount
          ? parseFloat(invoice.totalAmount.replace(',', '.'))
          : 0;

        customersMap.set(invoice.customerId, {
          customerId: invoice.customer.id,
          name: invoice.customer.name,
          avatar: invoice.customer.avatar || null,
          dueDate: invoice.dueDate,
          daysOverdue,
          invoiceId: invoice.id,
          totalAmount,
        });
      }
    });

    const customers = Array.from(customersMap.values());

    return {
      customers,
      totalCustomers: customers.length,
    };
  }
}
