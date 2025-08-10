import {
  Controller,
  Get,
  Param,
  Patch,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { File as MulterFile } from 'multer';
import { Roles } from 'src/decorators/roles.decorator';
import { UserId } from 'src/decorators/user-id.decorator';
import { UserType } from 'src/utils/user-type.enum';
import { CustomerService } from './customer.service';

@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

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
}
