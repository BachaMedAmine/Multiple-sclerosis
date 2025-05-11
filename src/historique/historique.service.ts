import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Historique } from './schema/historique.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as admin from 'firebase-admin';

@Injectable()
export class HistoriqueService {
constructor(
@InjectModel(Historique.name) private historiqueModel: Model<Historique>,
private httpService: HttpService
) {}

// 🔹 Générer une description avec OpenAI
// 🔹 Générer une description avec OpenAI en français et en anglais
async generateDescription(userText: string): Promise<{ fr: string; en: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  const apiUrl = 'https://api.openai.com/v1/chat/completions';

  const prompts = {
    fr: "Tu es un assistant médical. Reformule la description de douleur donnée par l'utilisateur en une seule phrase claire, précise, à la première personne du singulier. Rédige uniquement en français.",
    en: "You are a medical assistant. Rephrase the user's pain description into one clear, precise sentence using the first person. Write only in English."
  };

  async function askFor(language: 'fr' | 'en'): Promise<string> {
    const requestBody = {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: prompts[language] },
        { role: 'user', content: userText },
        { role: 'system', content: `Current date and time is: ${new Date().toLocaleString()}.` }
      ],
      temperature: 0.5
    };

    interface OpenAIResponse {
      data: {
        choices: {
          message: {
            content: string;
          };
        }[];
      };
    }
    
    const response = await firstValueFrom(
      this.httpService.post(apiUrl, requestBody, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })
    ) as OpenAIResponse;
    
    return response.data.choices[0].message.content;
  }

  // Exécute les deux requêtes l’une après l’autre (ou en parallèle avec Promise.all si tu préfères)
  const fr = await askFor.call(this, 'fr');
  const en = await askFor.call(this, 'en');

  return { fr, en };
}

// 🔹 Enregistrer l'historique avec les parties du corps
async saveHistory(
userId: string,
imageUrl: string,
userText: string,
bodyPartName?: string,
bodyPartIndex?: number[],
fcmToken?: string
) {

  const description = await this.generateDescription(userText); // ✅ un objet { fr, en }
  const initializedFcmToken = fcmToken ?? "";

const newHistorique = new this.historiqueModel({
    user: userId,
    imageUrl,
    generatedDescription: description,
    bodyPartName: bodyPartName || null,
    bodyPartIndex: bodyPartIndex || [],
    isActive: true,
    startTime: new Date(),
    lastCheckTime: new Date(),
    fcmToken: initializedFcmToken
  });
return newHistorique.save();
}

async getHistoryByUserId(userId: string, lang: 'fr' | 'en' = 'fr') {
  console.log("🧐 Requête MongoDB avec userId :", userId);

  const results = await this.historiqueModel
    .find({ user: userId })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  const translated = results.map((item) => {
    return {
      ...item,
      generatedDescription:
        item.generatedDescription?.[lang] || item.generatedDescription?.['fr'] || '',
    };
  });

  console.log("📂 Résultat de la requête traduite :", translated);

  return translated;
}

// 🔹 Fonction pour récupérer et regrouper l'historique par date
async getHistoryGroupedByDate(userId: string) {
console.log("📅 Récupération de l'historique groupé par date pour l'utilisateur:", userId);

// 🔍 Récupérer les entrées triées par date décroissante (du plus récent au plus ancien)
const historique = await this.historiqueModel
.find({ user: userId })
.sort({ createdAt: -1 })
.exec();

// 🔹 Groupe les entrées par date (YYYY-MM-DD)
const groupedHistory = historique.reduce((acc, entry) => {
const date = entry.createdAt ? entry.createdAt.toISOString().split('T')[0] : 'unknown';
if (!acc[date]) {
acc[date] = [];
}
acc[date].push(entry);
return acc;
}, {} as Record<string, Historique[]>);

// 🔹 Convertir en tableau de dates triées
const result = Object.keys(groupedHistory)
.map(date => ({
date,
records: groupedHistory[date],
}))
.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Trier du plus récent au plus ancien

return result;
}

async getHistoryByDate(
  userId: string,
  startDate: string,
  endDate?: string,
  lang: 'fr' | 'en' = 'fr'
) {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date(startDate);
  end.setHours(23, 59, 59, 999);

  console.log('🟦 Intervalle recherché :', start.toISOString(), end.toISOString());

  const results = await this.historiqueModel
    .find({
      user: userId,
      createdAt: { $gte: start, $lte: end },
    })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  const translated = results.map((item) => ({
    ...item,
    generatedDescription:
      item.generatedDescription?.[lang] || item.generatedDescription?.['fr'] || '',
  }));

  console.log('📄 Résultats trouvés :', translated.length);
  return translated;
}

async getHistoriquesNeedingCheck(userId: string, lang: 'fr' | 'en' = 'fr') {
  const result = await this.historiqueModel
    .find({
      user: userId,
      isActive: true,
      needsPainCheck: true,
    })
    .sort({ lastCheckTime: 1 })
    .lean()
    .exec(); // tri du plus ancien au plus récent

  return result.map((item) => ({
    ...item,
    generatedDescription:
      item.generatedDescription?.[lang] || item.generatedDescription?.['fr'] || '',
  }));
}

async updatePainStatus(historiqueId: string, stillHurting: boolean) {
  const historique = await this.historiqueModel.findById(historiqueId);
  if (!historique) throw new Error('Historique introuvable');

  if (stillHurting) {
    // Encore mal ➔ remettre à jour le lastCheckTime
    historique.lastCheckTime = new Date();
  } else {
    // Plus mal ➔ arrêter la douleur
    historique.endTime = new Date();
    historique.isActive = false;
  }

  // Dans tous les cas ➔ supprimer le besoin de re-check
  historique.needsPainCheck = false;

  return historique.save();
}

    //Notification
   //Notification
   async sendNotification(fcmToken: string, messageTitle: string, messageBody: string) {
    if (!fcmToken || typeof fcmToken !== 'string' || fcmToken.length < 100) {
      console.warn("⚠️ Invalid or missing FCM token, skipping notification:", fcmToken);
      return;
    }
  
    const message = {
      notification: {
        title: messageTitle,
        body: messageBody,
      },
      android: {
        notification: {
          icon: 'ms_logo',
        },
      },
      token: fcmToken,
    };
  
    try {
      const response = await admin.messaging().send(message);
      console.log("✅ Notification sent successfully:", response);
    } catch (error) {
      console.error("❌ Error sending notification:", error);
    }
  }

  async updateFcmToken(historiqueId: string, fcmToken: string): Promise<{ message: string }> {
    const historique = await this.historiqueModel.findById(historiqueId);
    if (!historique) {
      throw new NotFoundException("Historique not found!");
    }
  
    // Validate FCM token before updating
    if (!fcmToken || typeof fcmToken !== 'string' || fcmToken.length < 100) {
      console.warn("⚠️ Invalid FCM token provided:", fcmToken);
      throw new Error("Invalid FCM token. Token must be a non-empty string with sufficient length.");
    }
  
    historique.fcmToken = fcmToken;
    await historique.save();
  
    console.log("✅ FCM token updated for historiqueId:", historiqueId);
    return { message: "FCM Token updated successfully!" };
  }

}
