// src/medications/schemas/medication.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from 'src/auth/schema/user.schema';

export enum MedicationType {
  PILL = 'pill',
  CAPSULE = 'capsule',
  INJECTION = 'injection',
  CREAM = 'cream',
  SYRUP = 'syrup',
}

export enum FrequencyType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  SPECIFIC_DAYS = 'specific_days',
}

export enum MealRelation {
  BEFORE_EATING = 'before_eating',
  AFTER_EATING = 'after_eating',
  WITH_FOOD = 'with_food',
  NO_RELATION = 'no_relation',
}

@Schema({ timestamps: true })
export class Medication extends Document {
  @Prop({ required: true })
  name: string;


  @Prop({ 
    type: String, 
    enum: MedicationType, 
    default: MedicationType.PILL 
  })
  medicationType: MedicationType;

  @Prop({ 
    type: String, 
    enum: FrequencyType, 
    default: FrequencyType.DAILY 
  })
  frequencyType: FrequencyType;

  @Prop({ type: [Number], default: [] })
  specificDays: number[]; // for weekly: [1,3,5] = Monday, Wednesday, Friday; for monthly: [1, 15] = 1st and 15th day

  @Prop({ default: 1 })
  dosageQuantity: number;

  @Prop({ default: 'dose' })
  dosageUnit: string;

  @Prop({ 
    type: String, 
    enum: MealRelation, 
    default: MealRelation.NO_RELATION 
  })
  mealRelation: MealRelation;

  @Prop({ required: true })
  timeOfDay: string[]; // ["09:00", "18:00"]

  @Prop({ default: 0 })
  reminderMinutesBefore: number;

  @Prop({ default: 0 })
  currentStock: number;

  @Prop({ default: 0 })
  lowStockThreshold: number;

  @Prop({ default: false })
  notifyLowStock: boolean;

  @Prop()
  color: string;

  @Prop({ type: Object })
description?: {
  fr?: string;
  en?: string;
};

@Prop({ type: Object })
notes?: {
  fr?: string;
  en?: string;
};

  @Prop({ type: Date })
  startDate: Date;

  @Prop({ type: Date })
  endDate: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  imageUrl: string;
}

export const MedicationSchema = SchemaFactory.createForClass(Medication);