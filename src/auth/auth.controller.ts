import { Body, Controller, Post } from '@nestjs/common';
import { LoginType } from 'src/types/login.type';
import { LoginDto } from '../dtos/login.dto';
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
}
