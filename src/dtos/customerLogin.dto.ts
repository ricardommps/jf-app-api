import { CustomerEntity } from 'src/entities/customer.entity';

export class CustomerLoginDto {
  id: number;
  name: string;
  email: string;
  avatar: string;
  temporaryPassword: boolean;
  isYoungLife: boolean;
  phone: string;
  constructor(customerEntity: CustomerEntity) {
    this.id = customerEntity.id;
    this.name = customerEntity.name;
    this.email = customerEntity.email;
    this.temporaryPassword = customerEntity.temporaryPassword;
    this.isYoungLife = customerEntity.isYoungLife;
    this.phone = customerEntity.phone;
    this.avatar = customerEntity.avatar;
  }
}
