import { UserEntity } from '../entities/user.entity';

export class LoginPayload {
  userId: number;
  typeUser: number;
  password: string;

  constructor(user: UserEntity) {
    this.userId = user.id;
    this.typeUser = user.typeUser;
    this.password = user.password;
  }
}
