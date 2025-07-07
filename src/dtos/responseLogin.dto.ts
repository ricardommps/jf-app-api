import { CustomerLoginDto } from './customerLogin.dto';

export interface ResponseLoginDto {
  user: CustomerLoginDto;
  accessToken: string;
}
