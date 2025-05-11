import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateStockDto {
  @IsNumber()
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number;

  @IsOptional()
  notes?: string;
} 