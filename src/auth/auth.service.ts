import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginType } from 'src/types/login.type';
import { CustomerService } from '../customer/customer.service';
import { CustomerLoginDto } from '../dtos/customerLogin.dto';
import { LoginDto } from '../dtos/login.dto';
import { LoginPayload } from '../dtos/loginPayload.dto';
import { ResponseLoginDto } from '../dtos/responseLogin.dto';
import { UserLoginDto } from '../dtos/userLogin.dto';
import { FirebaseService } from '../firebase/firebase.service';
import { UserService } from '../user/user.service';
import { validatePassword } from '../utils/password';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly customerService: CustomerService,
    private readonly firebaseService: FirebaseService,
  ) {}

  // private generateTokens(payload: LoginPayload) {
  //   const accessToken = this.jwtService.sign(
  //     { ...payload },
  //     { expiresIn: '1d' }, // access token expira rápido
  //   );

  //   const refreshToken = this.jwtService.sign(
  //     { ...payload },
  //     { expiresIn: '7d' }, // refresh token dura mais tempo
  //   );

  //   return { accessToken, refreshToken };
  // }

  private generateTokens(payload: LoginPayload) {
    const accessToken = this.jwtService.sign(
      { ...payload },
      { expiresIn: '30d' }, // access token expira em 5 minutos
    );

    const refreshToken = this.jwtService.sign(
      { ...payload },
      { expiresIn: '30d' }, // refresh token expira em 10 minutos
    );
    return { accessToken, refreshToken };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userService
      .findByEmail(loginDto.email)
      .catch(() => undefined);

    const isMatch = await validatePassword(
      loginDto.password,
      user?.password || '',
    );

    if (!user || !isMatch) {
      throw new NotFoundException('Email ou senha inválidos');
    }

    const payload = new LoginPayload(user);
    const { accessToken, refreshToken } = this.generateTokens(payload); // ✅ usa 2m aqui
    return {
      accessToken,
      refreshToken,
      user: new UserLoginDto(user),
    };
  }

  async loginCustomerAndRegisterPush(
    loginDto: LoginType,
  ): Promise<ResponseLoginDto> {
    const customer = await this.customerService.findCustomerByEmail(
      loginDto.email,
    );

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

    if (loginDto.pushToken && customer.id) {
      await this.firebaseService.saveToken(
        String(customer.id),
        loginDto.pushToken,
      );
    }
    const payload = new LoginPayload(customer);
    const { accessToken } = this.generateTokens(payload);
    return {
      accessToken: accessToken,
      user: new CustomerLoginDto(customer),
    };
  }

  async loginCustomer(
    loginDto: LoginType,
  ): Promise<ResponseLoginDto & { refreshToken: string }> {
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

    const payload = new LoginPayload(customer);
    const { accessToken, refreshToken } = this.generateTokens(payload);

    return {
      accessToken,
      refreshToken,
      user: new CustomerLoginDto(customer),
    };
  }

  async refreshCustomerToken(
    refreshToken: string,
  ): Promise<ResponseLoginDto & { refreshToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken);

      const customer = await this.customerService.findCustomerById(
        payload.userId,
      );

      if (!customer) {
        throw new NotFoundException('Cliente não encontrado');
      }

      if (customer.password !== payload.password) {
        throw new UnauthorizedException('Credenciais inválidas');
      }

      const newPayload = new LoginPayload(customer);
      const { accessToken, refreshToken: newRefreshToken } =
        this.generateTokens(newPayload);

      return {
        accessToken,
        refreshToken: newRefreshToken,
        user: new CustomerLoginDto(customer),
      };
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
  }

  async loginUserProfileWithToken(token: string): Promise<ResponseLoginDto> {
    let payload: {
      userId: number;
      typeUser: number;
      password: string;
      iat: number;
      exp: number;
    };

    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    const user = await this.customerService.findCustomerById(payload.userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (user.password !== payload.password) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const accessToken = this.jwtService.sign({ ...new LoginPayload(user) });

    return {
      accessToken,
      user: new CustomerLoginDto(user),
    };
  }
}
