import { Injectable } from '@nestjs/common';
import { CustomerLessonPackageClassType } from '../entities/customer-lesson-package.enums';

export interface CustomerLessonPackageCalculationClass {
  type: CustomerLessonPackageClassType;
}

export interface CustomerLessonPackageCalculationInput {
  lessonUnitPrice: number | string;
  classes: CustomerLessonPackageCalculationClass[];
}

export interface CustomerLessonPackageCalculationResult {
  totalLessons: number;
  paidLessons: number;
  totalAmount: number;
}

@Injectable()
export class CustomerLessonPackageCalculationService {
  calculateTotals({
    lessonUnitPrice,
    classes,
  }: CustomerLessonPackageCalculationInput): CustomerLessonPackageCalculationResult {
    const normalizedLessonUnitPrice =
      this.normalizeLessonUnitPrice(lessonUnitPrice);

    const totalLessons = classes.length;
    const paidLessons = classes.filter((lessonClass) =>
      this.isPaidLesson(lessonClass.type),
    ).length;

    return {
      totalLessons,
      paidLessons,
      totalAmount: this.roundCurrency(paidLessons * normalizedLessonUnitPrice),
    };
  }

  private isPaidLesson(type: CustomerLessonPackageClassType): boolean {
    if (!Object.values(CustomerLessonPackageClassType).includes(type)) {
      throw new Error(`Invalid lesson package class type: ${type}`);
    }

    return type === CustomerLessonPackageClassType.REGULAR;
  }

  private normalizeLessonUnitPrice(value: number | string): number {
    const normalizedValue =
      typeof value === 'string' ? Number(value.replace(',', '.')) : value;

    if (!Number.isFinite(normalizedValue) || normalizedValue < 0) {
      throw new Error('Invalid lesson unit price');
    }

    return normalizedValue;
  }

  private roundCurrency(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
