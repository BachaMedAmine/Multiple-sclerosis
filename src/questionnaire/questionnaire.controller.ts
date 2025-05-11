import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { QuestionnaireService } from './questionnaire.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

@Controller('questionnaire')
export class QuestionnaireController {
  constructor(private readonly questionnaireService: QuestionnaireService) {}

  // Admin endpoint to create question
  @Post('create')
  async createQuestion(@Body('text') text: string) {
    return this.questionnaireService.createQuestion(text);
  }

  // Get all questions
  @UseGuards(JwtAuthGuard)
  @Get('questions')
  async getQuestions() {
    return this.questionnaireService.getAllQuestions();
  }

  // Submit answers
  @UseGuards(JwtAuthGuard)
  @Post('submit')
  async submitAnswers(
    @Req() req: Request,
    @Body() body: { answers: { questionId: string, answer: string }[] }
  ) {
    const user = req.user as any;
    return this.questionnaireService.submitAnswers(user._id, body.answers);
  }

  // Check if user can submit
  @UseGuards(JwtAuthGuard)
  @Get('can-submit')
  async canSubmit(@Req() req: Request) {
    const user = req.user as any;
    return this.questionnaireService.canSubmit(user._id);
  }
}
