import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  AddCustomerLessonPackageClassesDto,
  CreateCustomerLessonPackageDto,
  ListCustomerLessonPackageCalendarQueryDto,
  ListCustomerLessonPackagePendingClassesQueryDto,
  MarkCustomerLessonPackageClassPendingDto,
  UpdateCustomerLessonPackageClassDto,
  UpdateCustomerLessonPackageClassStatusDto,
  UpdateCustomerLessonPackageDto,
  UpdateCustomerLessonPackageStatusDto,
} from '../dtos/customer-lesson-package.dto';
import { CustomerLessonPackageClassEntity } from '../entities/customer-lesson-package-class.entity';
import { CustomerLessonPackagePendingClassEntity } from '../entities/customer-lesson-package-pending-class.entity';
import { CustomerLessonPackageEntity } from '../entities/customer-lesson-package.entity';
import { Roles } from '../decorators/roles.decorator';
import { UserId } from '../decorators/user-id.decorator';
import { UserType } from '../utils/user-type.enum';
import { CustomerLessonPackageService } from './customer-lesson-package.service';
import { customerLessonPackageSwagger } from './customer-lesson-package.swagger';

@Controller('customer-lesson-packages')
export class CustomerLessonPackageController {
  constructor(
    private readonly customerLessonPackageService: CustomerLessonPackageService,
  ) {}

  @Roles(UserType.Admin, UserType.Root)
  @Post()
  async create(
    @Body() createPackageDto: CreateCustomerLessonPackageDto,
    @UserId() userId: number,
  ): Promise<CustomerLessonPackageEntity> {
    return this.customerLessonPackageService.create(createPackageDto, userId);
  }

  @Roles(UserType.Admin, UserType.Root)
  @Get('customer/:customerId')
  async findByCustomerId(
    @Param('customerId', ParseIntPipe) customerId: number,
  ): Promise<CustomerLessonPackageEntity[]> {
    return this.customerLessonPackageService.findByCustomerId(customerId);
  }

  @Roles(UserType.Admin, UserType.Root)
  @Get('customer/:customerId/active')
  async findActiveByCustomerId(
    @Param('customerId', ParseIntPipe) customerId: number,
  ): Promise<CustomerLessonPackageEntity[]> {
    return this.customerLessonPackageService.findActiveByCustomerId(customerId);
  }

  @Roles(UserType.Admin, UserType.Root)
  @Get('pending-classes')
  async findPendingClasses(
    @Query() query: ListCustomerLessonPackagePendingClassesQueryDto,
  ): Promise<CustomerLessonPackagePendingClassEntity[]> {
    return this.customerLessonPackageService.findPendingClasses(query);
  }

  @Roles(UserType.Admin, UserType.Root)
  @Get('calendar')
  async findCalendarClasses(
    @Query() query: ListCustomerLessonPackageCalendarQueryDto,
  ): Promise<CustomerLessonPackageClassEntity[]> {
    return this.customerLessonPackageService.findCalendarClasses(query);
  }

  @Get('swagger')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getSwaggerUi() {
    return `
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Customer Lesson Packages Swagger</title>
          <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
          <style>
            body {
              margin: 0;
              background: #fafafa;
            }
            .topbar {
              background-color: #111827;
            }
          </style>
        </head>
        <body>
          <div id="swagger-ui"></div>
          <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
          <script>
            window.onload = function () {
              window.ui = SwaggerUIBundle({
                url: '/api/v2/customer-lesson-packages/swagger-json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                  SwaggerUIBundle.presets.apis,
                  SwaggerUIBundle.SwaggerUIStandalonePreset
                ],
                layout: 'BaseLayout'
              });
            };
          </script>
        </body>
      </html>
    `;
  }

  @Get('swagger-json')
  getSwaggerJson() {
    return customerLessonPackageSwagger;
  }

  @Roles(UserType.Admin, UserType.Root)
  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CustomerLessonPackageEntity> {
    return this.customerLessonPackageService.findById(id);
  }

  @Roles(UserType.Admin, UserType.Root)
  @Get(':id/classes')
  async findClassesByPackageId(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CustomerLessonPackageClassEntity[]> {
    return this.customerLessonPackageService.findClassesByPackageId(id);
  }

  @Roles(UserType.Admin, UserType.Root)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePackageDto: UpdateCustomerLessonPackageDto,
  ): Promise<CustomerLessonPackageEntity> {
    return this.customerLessonPackageService.update(id, updatePackageDto);
  }

  @Roles(UserType.Admin, UserType.Root)
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateCustomerLessonPackageStatusDto,
  ): Promise<CustomerLessonPackageEntity> {
    return this.customerLessonPackageService.updateStatus(id, updateStatusDto);
  }

  @Roles(UserType.Admin, UserType.Root)
  @Post(':id/classes')
  async addClasses(
    @Param('id', ParseIntPipe) id: number,
    @Body() addClassesDto: AddCustomerLessonPackageClassesDto,
  ): Promise<CustomerLessonPackageEntity> {
    return this.customerLessonPackageService.addClasses(id, addClassesDto);
  }

  @Roles(UserType.Admin, UserType.Root)
  @Patch('classes/:classId')
  async updateClass(
    @Param('classId', ParseIntPipe) classId: number,
    @Body() updateClassDto: UpdateCustomerLessonPackageClassDto,
  ): Promise<CustomerLessonPackageEntity> {
    return this.customerLessonPackageService.updateClass(
      classId,
      updateClassDto,
    );
  }

  @Roles(UserType.Admin, UserType.Root)
  @Patch('classes/:classId/status')
  async updateClassStatus(
    @Param('classId', ParseIntPipe) classId: number,
    @Body() updateStatusDto: UpdateCustomerLessonPackageClassStatusDto,
  ): Promise<CustomerLessonPackageEntity> {
    return this.customerLessonPackageService.updateClassStatus(
      classId,
      updateStatusDto,
    );
  }

  @Roles(UserType.Admin, UserType.Root)
  @Patch('classes/:classId/pending')
  async markClassAsPending(
    @Param('classId', ParseIntPipe) classId: number,
    @Body() pendingDto: MarkCustomerLessonPackageClassPendingDto,
  ): Promise<CustomerLessonPackageEntity> {
    return this.customerLessonPackageService.markClassAsPending(
      classId,
      pendingDto,
    );
  }

  @Roles(UserType.Admin, UserType.Root)
  @Patch('classes/:classId/cancel')
  async cancelClass(
    @Param('classId', ParseIntPipe) classId: number,
  ): Promise<CustomerLessonPackageEntity> {
    return this.customerLessonPackageService.cancelClass(classId);
  }

  @Roles(UserType.Admin, UserType.Root)
  @Patch('classes/:classId/finish')
  async finishClass(
    @Param('classId', ParseIntPipe) classId: number,
  ): Promise<CustomerLessonPackageEntity> {
    return this.customerLessonPackageService.finishClass(classId);
  }
}
