// src/medications/schemas/reminder.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Medication } from './medication.schema';
import { User } from 'src/auth/schema/user.schema';

@Schema({ timestamps: true })
export class Reminder extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Medication', required: true })
  medicationId: Medication;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ required: true })
  scheduledDate: Date;

  @Prop({ required: true })
  scheduledTime: string;

  @Prop({ default: false })
  isCompleted: boolean;

  @Prop({ default: false })
  isSkipped: boolean;

  @Prop()
  completedAt: Date;

  @Prop({
    type: Object,
    default: {
      fr: 'Prenez votre médicament',
      en: 'Take your medication',
    },
  })
  message: {
    fr: string;
    en: string;
  };
}

export const ReminderSchema = SchemaFactory.createForClass(Reminder);