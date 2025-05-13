import { HistoriqueService } from './historique.service';
import { Controller, Post, UploadedFile, UseInterceptors, Request, Body, UseGuards, Get, Query, Patch, Put } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { FileUploadService } from 'src/auth/fileUpload.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('historique')
export class HistoriqueController {
constructor(private readonly historiqueService: HistoriqueService) {}


@Post('/upload-screenshot')
@UseGuards(JwtAuthGuard)
@UseInterceptors(FileInterceptor('screenshot', FileUploadService.multerOptions))
async uploadScreenshot(@UploadedFile() file: Express.Multer.File, @Request() req) {
console.log("🔹 Headers reçus :", req.headers);
console.log("🔹 Utilisateur JWT décodé :", req.user);

if (!file) {
  console.log("❌ Aucun fichier reçu !");
  return { message: 'Aucun fichier envoyé !' };
}

const userId = req.user?.userId;
if (!userId) {
console.log("❌ L'utilisateur n'est pas défini !");
return { message: "Utilisateur non authentifié !" };
}
const bodyPartName = req.body.bodyPartName || '';
const bodyPartIndex = (req.body.bodyPartIndex || '')
.split(',')
.map((i: string) => Number(i.trim()))
.filter((i: number) => !isNaN(i));
console.log("🔍 bodyPartName:", bodyPartName);
console.log("🔍 bodyPartIndex:", bodyPartIndex);

const fileUrl = `/uploads/images/${file.filename}`;
const userText = req.body.userText || "Aucune description fournie";
const fcmToken = req.body.fcmToken || '';

console.log("🔹 Headers reçus :", req.headers);
console.log("🔹 Fichier reçu :", file);
console.log("🔹 Body reçu :", req.body);


return this.historiqueService.saveHistory(
userId,
fileUrl,
userText,
bodyPartName,
bodyPartIndex,
fcmToken
);
}


@Get()
@UseGuards(JwtAuthGuard)
async getHistorique(@Request() req) {
const userId = req.user?.userId;
console.log("📜 Récupération de l'historique pour l'utilisateur connecté, ID:", userId);

if (!userId) {
return { message: "Utilisateur non authentifié !" };
}

return this.historiqueService.getHistoryByUserId(userId);
}


// 🔹 Nouvelle route pour récupérer l'historique groupé par date
@Get('/grouped')
@UseGuards(JwtAuthGuard)
async getHistoriqueGrouped(@Request() req) {
const userId = req.user?.userId;
console.log("📜 Récupération de l'historique groupé pour l'utilisateur:", userId);
if (!userId) {
return { message: "Utilisateur non authentifié !" };
}
return this.historiqueService.getHistoryGroupedByDate(userId);
}

@Get('/by-date')
@UseGuards(JwtAuthGuard)
async getHistoriqueByDate(
  @Request() req,
  @Query('start') startDate: string,
  @Query('end') endDate?: string,
) {
  const userId = req.user?.userId;
  if (!userId) {
    return { message: "Utilisateur non authentifié !" };
  }

  return this.historiqueService.getHistoryByDate(userId, startDate, endDate);
}

// 🔵 Nouvelle route pour récupérer seulement les historiques needing check
@Get('/needs-check')
@UseGuards(JwtAuthGuard)
async getNeedsPainCheck(@Request() req) {
  const userId = req.user?.userId;
  if (!userId) {
    return { message: "Utilisateur non authentifié !" };
  }
  return this.historiqueService.getHistoriquesNeedingCheck(userId);
}

// PATCH /historique/check-douleur
@Patch('/check-douleur')
@UseGuards(JwtAuthGuard)
async updateDouleurStatus(
  @Body() body: { historiqueId: string; stillHurting: boolean },
  @Request() req
) {
  const userId = req.user?.userId;
  return this.historiqueService.updatePainStatus(body.historiqueId, body.stillHurting);
}

@Put('updateFcmToken')
  async updateFcmToken(@Body() body: { historiqueId: string, fcmToken: string }) {
    return this.historiqueService.updateFcmToken(body.historiqueId, body.fcmToken);
  }

  
  @Post('/predict-next-relapse')
  @UseGuards(JwtAuthGuard)
  async predictNextRelapse(@Request() req) {
  const userId = req.user?.userId;
  if (!userId) return { message: "Utilisateur non authentifié !" };
  
  return this.historiqueService.prepareRelapsePrediction(userId);
  }
  

}