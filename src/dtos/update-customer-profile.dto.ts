import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCustomerProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
