import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StockHistoryDocument = StockHistory & Document;

@Schema({ timestamps: true })
export class StockHistory {
  @Prop({ type: Types.ObjectId, ref: 'Medication', required: true })
  medicationId: Types.ObjectId;

  @Prop({ required: true })
  previousStock: number;

  @Prop({ required: true })
  newStock: number;

  @Prop({ required: true })
  changeAmount: number;

  @Prop({ type: Object })
notes?: {
  fr?: string;
  en?: string;
};

  @Prop({ required: true })
  type: 'add' | 'remove' | 'take' | 'adjustment';

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;
}

export const StockHistorySchema = SchemaFactory.createForClass(StockHistory); 