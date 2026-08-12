import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { File as MulterFile } from 'multer';
import { CustomerLoginDto } from 'src/dtos/customerLogin.dto';
import { UpdateCustomerProfileDto } from 'src/dtos/update-customer-profile.dto';
import { CustomerEntity } from 'src/entities/customer.entity';
import { PasswordType } from 'src/types/password.type';
import { UserType } from 'src/utils/user-type.enum';
import { Roles } from '../decorators/roles.decorator';
import { UserId } from '../decorators/user-id.decorator';
import { CustomerService } from './customer.service';

@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Roles(UserType.Admin, UserType.Root)
  @Get('birthdays/month')
  async getBirthdaysOfMonth(
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    return this.customerService.getBirthdaysOfMonth(
      month ? Number(month) : undefined,
      year ? Number(year) : undefined,
    );
  }

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Get('me')
  async getProfile(@UserId() userId: number): Promise<CustomerLoginDto> {
    return this.customerService.getCustomerProfile(userId);
  }

  @Get(':cpf')
  async findCustomerByCpf(@Param('cpf') cpf: string) {
    return this.customerService.findCustomerByCpf(cpf);
  }

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Patch('/avatar')
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(@UploadedFile() file: MulterFile, @UserId() userId: number) {
    return this.customerService.uploadImageToCloudinary(file, userId);
  }

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Patch('/profile')
  async updateProfile(
    @Body() updateProfile: UpdateCustomerProfileDto,
    @UserId() userId: number,
  ): Promise<CustomerLoginDto> {
    return this.customerService.updateProfileCustomer(updateProfile, userId);
  }

  @Roles(UserType.Admin, UserType.Root, UserType.User)
  @Patch('/resetPassword')
  async updatePasswordUser(
    @Body() updatePassword: PasswordType,
    @UserId() userId: number,
  ): Promise<CustomerEntity> {
    return this.customerService.updatePasswordCustomer(updatePassword, userId);
  }
}
