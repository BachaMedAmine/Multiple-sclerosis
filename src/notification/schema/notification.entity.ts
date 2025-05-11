import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { SchemaTypes, Types } from "mongoose";

@Schema({
    timestamps: true
})

export class Notification {

    @Prop()
    title: string

    @Prop()
    message: string

    @Prop({ type: SchemaTypes.ObjectId, ref: "User" })
    user: Types.ObjectId;

}

export const NotificationSchema = SchemaFactory.createForClass(Notification)
