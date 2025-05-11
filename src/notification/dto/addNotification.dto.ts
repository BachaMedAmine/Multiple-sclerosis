import { IsNotEmpty, IsString } from "class-validator";

export class AddNotificationDto {

    @IsNotEmpty()
    @IsString()
    title: string;

    @IsNotEmpty()
    @IsString()
    message: string;
}