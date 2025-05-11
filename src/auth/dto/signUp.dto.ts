import { IsBoolean, IsDate, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, MinLength } from "class-validator";

export class SignUpDto {

    @IsNotEmpty()
    @IsString()
    fullName: string;

    @IsNotEmpty()
    @IsEmail({}, { message: "Please enter the correct email form."})
    email: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(6)
    password: string;

    @IsOptional()
    @IsDate()
    birthday?: Date

    @IsOptional()
    @IsString()
    gender?: string

    @IsOptional()
    @IsNumber()
    phone?: number

    @IsOptional()
    @IsBoolean()
    profileCompleted?: boolean
    
    @IsOptional()
    @IsString()
    careGiverEmail?: string

    @IsOptional()
    @IsNumber()
    newCareGiverPhone?: number;

    @IsOptional()
    @IsString()
    newCareGiverName?: string;

    @IsOptional()
    @IsBoolean()
    diagnosis?: string

    @IsOptional()
    @IsString()
    type?: string

    @IsOptional()
    @IsString()
    medicalReport?: string

    @IsOptional()
    @IsString()
    fcmToken?: string
}