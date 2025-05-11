// src/medications/schemas/medication-history.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Medication } from './medication.schema';

@Schema({ timestamps: true })
export class MedicationHistory extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Medication', required: true })
  medicationId: Medication;

  @Prop({ required: true })
  takenAt: Date;

  @Prop({ default: 1 })
  quantityTaken: number;

  @Prop()
  notes: string;

  @Prop({ default: false })
  skipped: boolean;

  @Prop()
  scheduledTime: string;
}

export const MedicationHistorySchema = SchemaFactory.createForClass(MedicationHistory);