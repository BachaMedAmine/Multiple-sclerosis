import { Type } from "class-transformer";
import { IsBoolean, IsDate, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, MinLength } from "class-validator";

export class AddAppointmentDto {

    @IsNotEmpty()
    @IsString()
    fullName: string;

    @IsNotEmpty()
    @Type(() => Date)
    @IsDate()
    date: Date

    @IsNotEmpty()
    @IsString()
    phone: string
    
    @IsOptional()
    @IsString()
    status?: string

    @IsOptional()
    @IsString()
    fcmToken?: string
    
}