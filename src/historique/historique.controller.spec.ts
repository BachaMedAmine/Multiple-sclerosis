// historique.controller.ts
import { HistoriqueService } from './historique.service';
import { Controller, Post, UploadedFile, UseInterceptors, Request, Body, UseGuards, Get } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileUploadService } from '../auth/fileUpload.service';

@Controller('historique')
export class HistoriqueController {
  constructor(private readonly historiqueService: HistoriqueService) {}

  @Post('upload-screenshot')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('screenshot', FileUploadService.multerOptions))
  async uploadScreenshot(
    @UploadedFile() file: Express.Multer.File,
    @Body('userText') userText: string,
    @Request() req
  ) {
    console.log("🔹 Headers received:", req.headers);
    console.log("🔹 Authenticated user:", req.user);

    if (!file) {
      throw new Error('No file uploaded');
    }

    const userId = req.user.userId;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const fileUrl = `/uploads/images/${file.filename}`;
    const description = userText || "No description provided";

    return this.historiqueService.saveHistory(userId, fileUrl, description);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getHistorique(@Request() req) {
    const userId = req.user.userId;
    return this.historiqueService.getHistoryByUserId(userId);
  }

  @Get('grouped')
  @UseGuards(JwtAuthGuard)
  async getHistoriqueGrouped(@Request() req) {
    const userId = req.user.userId;
    return this.historiqueService.getHistoryGroupedByDate(userId);
  }
}