import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Answer extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Question', required: true })
  question: Types.ObjectId;

  @Prop({ required: true })
  answer: string;

  @Prop({ required: true })
  submittedAt: Date; // when the user submitted this answer

  @Prop({ type: Number, default: 0 }) // 🔥 ADD THIS LINE
  status: number;
}

export type AnswerDocument = Answer & Document;
export const AnswerSchema = SchemaFactory.createForClass(Answer);
