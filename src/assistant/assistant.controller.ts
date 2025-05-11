// assistant.controller.ts

import { Controller, Get, Param, Query } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import { AssistantContextService } from './assistant-context.service';

@Controller('assistant')
export class AssistantController {
  constructor(
    private readonly contextService: AssistantContextService,
    private readonly openaiService: OpenAIService
  ) {}

  @Get('ask/:userId')
async ask(
  @Param('userId') userId: string,
  @Query('question') question: string,
) {
  try {
    const context = await this.contextService.buildContextSummary(userId);
    const response = await this.openaiService.askAssistant(context, question);
    return { response };
  } catch (error) {
    console.error('❌ Erreur dans /assistant/ask:', error);
    throw error;
  }
}
  @Get('openai/context/:userId')
async getContextSummary(@Param('userId') userId: string) {
  const context = await this.contextService.buildContextSummary(userId);
  return { context };
}
}