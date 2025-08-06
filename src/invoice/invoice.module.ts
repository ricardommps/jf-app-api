import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceEntity } from 'src/entities/invoice.entity';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';

@Module({
  imports: [TypeOrmModule.forFeature([InvoiceEntity])],
  controllers: [InvoiceController],
  providers: [InvoiceService],
})
export class InvoiceModule {}
