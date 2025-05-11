import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsNumber, Min, IsString } from 'class-validator';

export class TakeMedicationDto {
  @IsDate()
  @Type(() => Date) // ✅ this transforms ISO string to Date
  takenAt: Date;

  @IsNumber()
  @Min(0)
  @IsOptional()
  quantityTaken?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}