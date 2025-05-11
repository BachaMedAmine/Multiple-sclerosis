import {
    IsEmail,
    IsOptional,
    IsString,
    IsDate,
    IsNumber,
    IsBoolean,
    IsIn,
  } from "class-validator";
  import { Type } from 'class-transformer';
  
  export class EditProfileDto {
    @IsOptional()
    @IsString()
    newName: string;
  
    @IsOptional()
    @IsEmail()
    newEmail: string;
  
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    newBirthday: Date;
  
    @IsOptional()
    @IsString()
    @IsIn(['male', 'female'])
    newGender: string;
  
    @IsOptional()
    @IsNumber()
    @Type(() => Number) // <-- Ajoute cette ligne magique
    newPhone: number;
  
    @IsOptional()
    @IsEmail()
    newCareGiverEmail: string;

    @IsOptional()
    @IsNumber()
    @Type(() => Number) // <-- Ajoute cette ligne magique
    newCareGiverPhone: number;

    @IsOptional()
    @IsString()
    newCareGiverName: string;
  
    @IsOptional()
    @IsString()
    newDiagnosis: string;
  
    @IsOptional()
    @IsString()
    newMedicalReport: string;

    @IsOptional()
    @IsString()
    @IsIn(['SEP-RR', 'SEP-PS', 'SEP-PP', 'SEP-PR'])
    newType: string;
  }