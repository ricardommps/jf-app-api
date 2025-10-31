import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginDto } from '../dtos/login.dto';
import { LoginType } from '../types/login.type';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('login-customer')
  async loginCustomer(@Body() loginDto: LoginType) {
    return this.authService.loginCustomerAndRegisterPush(loginDto);
  }

  @Get('login-biometrics')
  async loginUserProfileWithToken(@Headers('authorization') token: string) {
    if (!token) {
      throw new UnauthorizedException('Token não informado');
    }

    return this.authService.loginUserProfileWithToken(token.trim());
  }

  @Post('refresh-customer')
  async refreshCustomer(@Body('refreshToken') refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token não informado');
    }
    return this.authService.refreshCustomerToken(refreshToken.trim());
  }
}
