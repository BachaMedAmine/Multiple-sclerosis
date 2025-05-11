import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { SchemaTypes, Types } from "mongoose";
import { User } from "src/auth/schema/user.schema";

@Schema({
    timestamps: true
})

export class Appointment {

    @Prop()
    fullName: string

    @Prop()
    date: Date

    @Prop()
    phone: string

    @Prop({ type: String, enum: ["Upcoming", "Completed", "Canceled"] })
    status: string

    @Prop()
    fcmToken: string

    @Prop({ type: SchemaTypes.ObjectId, ref: "User" })
    user: Types.ObjectId;

}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment)