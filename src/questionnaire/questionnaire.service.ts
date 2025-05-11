import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Question, QuestionDocument } from './schema/question.schema';
import { Answer, AnswerDocument } from './schema/answer.schema';
import { Types } from 'mongoose'; // Add this import

@Injectable()
export class QuestionnaireService {
  constructor(
    @InjectModel(Question.name) private questionModel: Model<QuestionDocument>,
    @InjectModel(Answer.name) private answerModel: Model<AnswerDocument>,
  ) {}

  async createQuestion(text: string) {
    return this.questionModel.create({ text });
  }

  async getAllQuestions() {
    return this.questionModel.find().exec();
  }

 // Service
 async canSubmit(userId: string) {
  const now = this.getNow();
  console.log('🕒 Current server time:', now);

  const monday = this.getLastMonday(now);
  console.log('🗓 Last Monday:', monday);

  const userObjectId = new Types.ObjectId(userId);

  const submitted = await this.answerModel.exists({
    user: userObjectId,
    status: 0,
    submittedAt: { $gte: monday }
  });

  let canTake = !submitted;

  // 🛠 ADD this real-time check if it's not yet Monday 8AM
  if (!this.isMonday8AM(now)) {
    console.log('🔒 It is not Monday 8AM yet, force lock');
    canTake = false;
  } else {
    console.log('🔓 It is Monday 8AM or after, unlock allowed');
  }

  const nextAvailable = this.getNextMonday(now);

  console.log('✅ canTake:', canTake);
  console.log('✅ nextAvailable:', nextAvailable);

  return {
    canTake,
    nextAvailable: nextAvailable.toISOString(),
  };
}



// Submit answers
async submitAnswers(userId: string, answers: { questionId: string, answer: string }[]) {
  const now = this.getNow();

  const docs = answers.map(a => ({
    user: new Types.ObjectId(userId),                 // Make sure user is ObjectId
    question: new Types.ObjectId(a.questionId),        // Make sure question is ObjectId
    answer: a.answer,
    submittedAt: now,
    status: 0, // 🔥 locked immediately after submit
  }));

  return this.answerModel.insertMany(docs);
}

// Helpers
private getLastMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0); // 🛠 Change here
  return monday;
}


private getNextMonday(date: Date): Date {
  const d = new Date(date);
  const diff = (7 - d.getDay() + 1) % 7;
  const nextMonday = new Date(d.setDate(d.getDate() + diff));
  nextMonday.setHours(8, 0, 0, 0);
  return nextMonday;
}

private getNow(): Date {
  const realNow = new Date();
  console.log('🕒 Real Now:', realNow);
  return realNow;
} 
private isMonday8AM(date: Date): boolean {
  return date.getDay() === 1 && date.getHours() >= 8;
}
}