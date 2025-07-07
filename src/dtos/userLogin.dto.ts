import { UserEntity } from '../entities/user.entity';

export class UserLoginDto {
  id: number;
  name: string;
  email: string;
  temporaryPassword: boolean;
  constructor(userEntity: UserEntity) {
    this.id = userEntity.id;
    this.name = userEntity.name;
    this.email = userEntity.email;
    this.temporaryPassword = userEntity.temporaryPassword;
  }
}
