// src/medications/dto/create-medication.dto.ts
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsBoolean,
  IsDate,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MedicationType, FrequencyType, MealRelation } from '../schema/medication.schema';

export class CreateMedicationDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(MedicationType)
  @IsOptional()
  medicationType?: MedicationType;

  @IsEnum(FrequencyType)
  @IsOptional()
  frequencyType?: FrequencyType;

  @IsArray()
  @IsOptional()
  @Type(() => Number) // ✅ ensures correct type from multipart/form-data
  specificDays?: number[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number) // ✅
  dosageQuantity?: number;

  @IsString()
  @IsOptional()
  dosageUnit?: string;

  @IsEnum(MealRelation)
  @IsOptional()
  mealRelation?: MealRelation;

  @IsArray()
  @Type(() => String) // ✅
  timeOfDay: string[];

  @IsNumber()
  @IsOptional()
  @Type(() => Number) // ✅
  reminderMinutesBefore?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number) // ✅
  currentStock?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number) // ✅
  lowStockThreshold?: number;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean) // ✅
  notifyLowStock?: boolean;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date) // ✅
  startDate?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date) // ✅
  endDate?: Date;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}