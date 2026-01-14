import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { File as MulterFile } from 'multer';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { PasswordType } from 'src/types/password.type';
import { createPasswordHashed, validatePassword } from 'src/utils/password';
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

  async findCustomerByEmail(email: string): Promise<CustomerEntity> {
    const customer = await this.customerRepository.findOne({
      where: {
        email,
      },
    });
    if (!customer) {
      throw new NotFoundException(`Email: ${email} Not Found`);
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

  async updatePasswordCustomer(
    updatePassword: PasswordType,
    userId: number,
  ): Promise<CustomerEntity> {
    const customer = await this.findCustomerById(userId);

    if (!customer.password) {
      throw new BadRequestException('Customer has no password set');
    }

    if (!updatePassword.lastPassword) {
      throw new BadRequestException('Senha atual é obrigatória');
    }

    // Verifica se a senha antiga confere
    const isMatch = await validatePassword(
      updatePassword.lastPassword,
      customer.password,
    );
    if (!isMatch) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    // Gera hash da nova senha
    const passwordHashed = await createPasswordHashed(
      updatePassword.newPassword,
    );

    // Atualiza e salva
    const updatedCustomer = await this.customerRepository.save({
      ...customer,
      password: passwordHashed,
      temporaryPassword: false,
    });
    return updatedCustomer;
  }

  async getBirthdaysOfMonth(month?: number, year?: number) {
    const now = new Date();
    const currentMonth = month ?? now.getMonth() + 1;
    const currentYear = year ?? now.getFullYear();

    const today = new Date(currentYear, currentMonth - 1, now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const monthLabel = new Date(currentYear, currentMonth - 1)
      .toLocaleString('pt-BR', { month: 'long' })
      .toUpperCase();

    const customers = await this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.active = true')
      .andWhere('EXTRACT(MONTH FROM customer.birth_date) = :month', {
        month: currentMonth,
      })
      .select([
        'customer.id',
        'customer.name',
        'customer.birthDate',
        'customer.avatar',
      ])
      .getMany();

    const sameDay = (a: Date, b: Date) =>
      a.getDate() === b.getDate() && a.getMonth() === b.getMonth();

    const formatDate = (day: number) =>
      `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const todayList = [];
    const tomorrowList = [];
    const monthList = [];

    for (const customer of customers) {
      const birthDate = new Date(customer.birthDate);
      const birthdayThisYear = new Date(
        currentYear,
        currentMonth - 1,
        birthDate.getDate(),
      );

      // ⛔ Ignora aniversários que já passaram
      if (birthdayThisYear < today) continue;

      if (sameDay(birthdayThisYear, today)) {
        todayList.push({
          id: String(customer.id),
          name: customer.name,
          avatarUrl: customer.avatar,
          date: formatDate(birthDate.getDate()),
        });
        continue;
      }

      if (sameDay(birthdayThisYear, tomorrow)) {
        tomorrowList.push({
          id: String(customer.id),
          name: customer.name,
          avatarUrl: customer.avatar,
          date: formatDate(birthDate.getDate()),
        });
        continue;
      }

      monthList.push({
        id: String(customer.id),
        name: customer.name,
        day: birthDate.getDate(),
        date: formatDate(birthDate.getDate()),
      });
    }

    monthList.sort((a, b) => a.day - b.day);

    return {
      month: currentMonth,
      monthLabel,
      today: todayList,
      tomorrow: tomorrowList,
      monthBirthdays: monthList,
    };
  }
}
