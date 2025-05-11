import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  timestamps: true, // Automatically adds createdAt and updatedAt fields
})
export class User extends Document {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: false })
  password?: string; // Optional for Google users (no password needed)

  @Prop({ required: false })
  gender: string;

  @Prop({ required: false })
  birthday: Date;

  @Prop({ required: false })
  phone: number;

  @Prop({ required: false, default: false })
  profileCompleted: boolean;

  @Prop({ required: false })
  careGiverEmail: string;

  @Prop({ required: false })
  careGiverName: string;

  @Prop({ required: false })
  careGiverPhone: number;

  @Prop({ required: false })
  diagnosis: string;

  @Prop({ required: false })
  type: string;

  @Prop({ required: false })
  medicalReport: string;

  @Prop({ required: false, unique: true, sparse: true }) // ✅ Use sparse instead of index
  googleId?: string;


  @Prop({ required: false })
  accessToken?: string; // Google access token for Google-authenticated users

  @Prop({ required: false })
  refreshToken?: string; // Google refresh token for Google-authenticated users


  @Prop({ required: false })
  fcmToken?: string;

}

export type UserDocument = User & Document;

export const UserSchema = SchemaFactory.createForClass(User);

