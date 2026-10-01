import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CustomerLessonPackageClassStatus,
  CustomerLessonPackageClassType,
  CustomerLessonPackageStatus,
} from '../entities/customer-lesson-package.enums';

export class CreateCustomerLessonPackageClassDto {
  @IsDateString()
  @IsNotEmpty()
  scheduledDate: string;

  @IsString()
  @IsOptional()
  scheduledTime?: string;

  @IsEnum(CustomerLessonPackageClassType)
  @IsNotEmpty()
  type: CustomerLessonPackageClassType;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

export class CreateCustomerLessonPackageDto {
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  customerId: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  createdById?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  lessonUnitPrice: number;

  @IsEnum(CustomerLessonPackageStatus)
  @IsOptional()
  status?: CustomerLessonPackageStatus;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateCustomerLessonPackageClassDto)
  classes: CreateCustomerLessonPackageClassDto[];
}

export class UpdateCustomerLessonPackageDto {
  @IsString()
  @IsOptional()
  @MaxLength(120)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  lessonUnitPrice?: number;

  @IsEnum(CustomerLessonPackageStatus)
  @IsOptional()
  status?: CustomerLessonPackageStatus;
}

export class AddCustomerLessonPackageClassesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateCustomerLessonPackageClassDto)
  classes: CreateCustomerLessonPackageClassDto[];
}

export class UpdateCustomerLessonPackageClassDto {
  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @IsString()
  @IsOptional()
  scheduledTime?: string;

  @IsEnum(CustomerLessonPackageClassType)
  @IsOptional()
  type?: CustomerLessonPackageClassType;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

export class UpdateCustomerLessonPackageStatusDto {
  @IsEnum(CustomerLessonPackageStatus)
  @IsNotEmpty()
  status: CustomerLessonPackageStatus;
}

export class UpdateCustomerLessonPackageClassStatusDto {
  @IsEnum(CustomerLessonPackageClassStatus)
  @IsNotEmpty()
  status: CustomerLessonPackageClassStatus;
}

export class MarkCustomerLessonPackageClassPendingDto {
  @IsDateString()
  @IsOptional()
  rescheduledDate?: string;

  @IsString()
  @IsOptional()
  rescheduledTime?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  justification?: string;
}

export class ListCustomerLessonPackagePendingClassesQueryDto {
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  customerId?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  packageId?: number;
}

export class ListCustomerLessonPackageCalendarQueryDto {
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  customerId?: number;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}
