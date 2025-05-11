import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Activity } from './schema/activity.schema';
import axios from 'axios';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class ActivityService {
  constructor(@InjectModel(Activity.name) private activityModel: Model<Activity>) {}

  private readonly apiKey = 'AIzaSyC_uyUqse59UGc0BlLgxrYrlyxc8c6dzdg'; // Replace with your real API key
  private readonly apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;

  // 🔥 Fetch & Save AI-generated Activities every 3 minutes
  @Cron('0 10 * * 1')// Every Monday at 10:00 AM UTC
    async fetchAndSaveActivities(): Promise<void> {
    console.log("🚀 [fetchAndSaveActivities] - Started");
    console.log("🟡 [DEBUG] fetchAndSaveActivities called at", new Date().toISOString());

    try {
      console.log("📡 Sending request to AI API...");
      const response = await axios.post(this.apiUrl, {
        contents: [
          {
            parts: [
              {
                text: "Suggest 4 activities for multiple sclerosis patients. Return JSON array [{\"activity\": \"string\", \"description\": \"string\"}]"
              }
            ]
          }
        ]
      });

      console.log("🌐 [AI Response]:", JSON.stringify(response.data, null, 2));

      // Validate response format
      if (!response.data.candidates || response.data.candidates.length === 0) {
        console.log("❌ [Error] No candidates found in AI response.");
        return;
      }

      // Extract AI response text
      let textResponse = response.data.candidates[0]?.content?.parts[0]?.text?.trim() || "";
      console.log("📌 [Raw AI Output]:", textResponse);

      // Remove code block formatting if present
      if (textResponse.startsWith("```json")) {
        textResponse = textResponse.replace("```json", "").replace("```", "").trim();
      }

      // Parse JSON safely
      const activities = JSON.parse(textResponse);
      console.log("✅ [Parsed Activities]:", activities);

      // Validate received activities
      if (!Array.isArray(activities) || activities.length === 0) {
        console.log("⚠️ [Warning] No valid activities received.");
        return;
      }

      console.log("🌍 Translating activities to French...");
      const translatedActivities = await Promise.all(
        activities.map(async (act) => {
          const frActivityRaw = await this.translateText(act.activity, 'fr');
const frDescriptionRaw = await this.translateText(act.description, 'fr');

const frActivity = this.cleanTranslation(frActivityRaw);
const frDescription = this.cleanTranslation(frDescriptionRaw);
      
          return {
            translations: {
              en: {
                activity: act.activity,
                description: act.description,
              },
              fr: {
                activity: frActivity,
                description: frDescription,
              }
            }
          };
        })
      );
console.log("🧪 Translated full activities:", JSON.stringify(translatedActivities, null, 2)); // <== AJOUT ICI
console.log("💾 Saving new translated activities...");
const savedActivities = await this.activityModel.insertMany(translatedActivities);
      console.log("✅ [Saved Activities]:", savedActivities);
    } catch (error) {
      console.error("❌ [API Call Failed]:", error.response?.data || error.message);
    }
  }

  private async translateText(text: string, targetLang: 'fr' | 'en'): Promise<string> {
    try {
      const prompt = `Translate the following into ${targetLang}. Only return the translated sentence, no explanations, no Markdown, no formatting:\n"${text}"`;
      const response = await axios.post(this.apiUrl, {
        contents: [{ parts: [{ text: prompt }] }],
      });
  
      return response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    } catch (err) {
      console.warn(`⚠️ [Fallback] Failed to translate "${text}" to ${targetLang}: ${err.message}`);
      return text; // fallback: return original if translation fails
    }
  }

  private cleanTranslation(raw: string): string {
    // Supprime les parties Markdown, listes, recommandations, etc.
    const cleaned = raw
      .replace(/\*\*/g, '') // gras Markdown
      .replace(/`/g, '')
      .split('\n')
      .map(line => line.trim())
      .filter(line =>
        line &&
        !line.startsWith('*') &&
        !line.startsWith('-') &&
        !line.startsWith('>') &&
        !line.toLowerCase().includes('option') &&
        !line.toLowerCase().includes('recommend') &&
        !line.toLowerCase().includes('translation') &&
        !line.toLowerCase().includes('here are') &&
        !line.toLowerCase().includes('explanation') &&
        !line.toLowerCase().includes('breakdown') &&
        !line.toLowerCase().includes('depends on')
      );
  
    return cleaned.length > 0 ? cleaned[0] : raw.trim();
  }
  // 🔥 Get the latest 4 activities for today
  async getActivities(): Promise<any[]> {
    console.log("📡 [getActivities] - Fetching latest activities for today...");
  
    const today = new Date().toISOString().split('T')[0];
    const startOfDay = new Date(`${today}T00:00:00Z`);
  
    const activities = await this.activityModel
      .find({ createdAt: { $gte: startOfDay } })
      .sort({ createdAt: -1 })
      .limit(4)
      .lean()
      .exec();
  
    console.log("✅ [Fetched Raw Activities with Translations]:", activities);
    return activities;
  }
}
