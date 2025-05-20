import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
  UnauthorizedException,
  Param,
} from '@nestjs/common';
import { Request } from 'express'; // ✅ Needed for typing req
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard'; // ✅ Adjust this path if needed
import { OpenAIService } from './openai.service';
import { AssistantContextService } from './assistant-context.service';

@Controller('assistant')
export class AssistantController {
  constructor(
    private readonly contextService: AssistantContextService,
    private readonly openaiService: OpenAIService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('ask')
  async ask(
    @Req() req: Request,
    @Query('question') question: string,
  ) {
    const user = req.user as any; // Normally comes from your JwtStrategy

    if (!user || !user.userId) {
      throw new UnauthorizedException('User not authenticated. Please login.');
    }

    const context = await this.contextService.buildContextSummary(user.userId);
    const response = await this.openaiService.askAssistant(context, question);
    return { response };
  }

  @Get('openai/context/:userId')
  async getContextSummary(@Param('userId') userId: string) {
    const context = await this.contextService.buildContextSummary(userId);
    return { context };
  }
}