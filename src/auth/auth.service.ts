import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CustomerService } from '../customer/customer.service';
import { CustomerLoginDto } from '../dtos/customerLogin.dto';
import { LoginDto } from '../dtos/login.dto';
import { LoginPayload } from '../dtos/loginPayload.dto';
import { ResponseLoginDto } from '../dtos/responseLogin.dto';
import { UserLoginDto } from '../dtos/userLogin.dto';
import { UserEntity } from '../entities/user.entity';
import { UserService } from '../user/user.service';
import { validatePassword } from '../utils/password';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly customerService: CustomerService,
  ) {}

  // async login(loginDto: LoginDto) {
  //   const user = await this.userService.findByEmail(loginDto.cpf);

  //   if (user.password !== loginDto.password) {
  //     throw new UnauthorizedException('Invalid credentials');
  //   }

  //   return {
  //     accessToken: this.jwtService.sign({ ...new LoginPayload(user) }),
  //     user: user,
  //   };
  // }

  async login(loginDto: LoginDto) {
    const user: UserEntity | undefined = await this.userService
      .findByEmail(loginDto.email)
      .catch(() => undefined);
    const isMatch = await validatePassword(
      loginDto.password,
      user?.password || '',
    );
    if (!user || !isMatch) {
      throw new NotFoundException('Email ou senha inválidos');
    }
    return {
      accessToken: this.jwtService.sign({ ...new LoginPayload(user) }),
      user: new UserLoginDto(user),
    };
  }

  async loginCustomer(loginDto: LoginDto): Promise<ResponseLoginDto> {
    const customer = await this.customerService.findCustomerByCpf(loginDto.cpf);

    if (!customer?.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await validatePassword(
      loginDto.password,
      customer?.password || '',
    );

    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      accessToken: this.jwtService.sign({ ...new LoginPayload(customer) }),
      user: new CustomerLoginDto(customer),
    };
  }
}
