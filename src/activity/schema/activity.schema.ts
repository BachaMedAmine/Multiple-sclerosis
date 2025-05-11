import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ActivityDocument = Activity & Document;

@Schema({ timestamps: true }) // Enables createdAt and updatedAt
export class Activity {
  @Prop({
    type: Object,
    required: true,
  })
  translations: {
    fr: { activity: string; description: string };
    en: { activity: string; description: string };
  };
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);
