import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Activity } from './schema/activity.schema';
import axios from 'axios';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);
  constructor(@InjectModel(Activity.name) private activityModel: Model<Activity>) {}

  private readonly apiKey = 'AIzaSyC_uyUqse59UGc0BlLgxrYrlyxc8c6dzdg'; // Replace with your real API key
  private readonly apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;

  // 🔥 Fetch & Save AI-generated Activities (for testing, every 5 minutes)
  @Cron(CronExpression.EVERY_5_MINUTES) // Change to '0 10 * * 1' for production (Monday at 10:00 AM UTC)
  async fetchAndSaveActivities(): Promise<void> {
    this.logger.log('🚀 Starting fetchAndSaveActivities');
    this.logger.debug(`🟡 Called at ${new Date().toISOString()}`);

    try {
      this.logger.log('📡 Sending request to AI API...');
      const response = await axios.post(this.apiUrl, {
        contents: [
          {
            parts: [
              {
                text: 'Suggest 4 activities for multiple sclerosis patients. Return JSON array [{"activity": "string", "description": "string"}]'
              }
            ]
          }
        ]
      });

      this.logger.debug('🌐 AI Response: ' + JSON.stringify(response.data, null, 2));

      // Validate response format
      if (!response.data.candidates || response.data.candidates.length === 0) {
        this.logger.error('❌ No candidates found in AI response');
        return;
      }

      // Extract AI response text
      let textResponse = response.data.candidates[0]?.content?.parts[0]?.text?.trim() || '';
      this.logger.debug('📌 Raw AI Output: ' + textResponse);

      // Remove code block formatting if present
      if (textResponse.startsWith('```json')) {
        textResponse = textResponse.replace('```json', '').replace('```', '').trim();
      }

      // Parse JSON safely
      let activities: { activity: string; description: string }[];
      try {
        activities = JSON.parse(textResponse);
      } catch (parseError) {
        this.logger.error(`❌ Failed to parse AI response: ${parseError.message}`);
        return;
      }

      this.logger.debug('✅ Parsed Activities: ' + JSON.stringify(activities, null, 2));

      // Validate received activities
      if (!Array.isArray(activities) || activities.length === 0) {
        this.logger.warn('⚠️ No valid activities received');
        return;
      }

      // Ensure activities have required fields
      const validActivities = activities.filter(
        (act) => typeof act.activity === 'string' && typeof act.description === 'string'
      );
      if (validActivities.length === 0) {
        this.logger.warn('⚠️ No activities with valid activity and description fields');
        return;
      }

      this.logger.log('🌍 Translating activities to French...');
      const translatedActivities = await Promise.all(
        validActivities.map(async (act) => {
          try {
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
          } catch (error) {
            this.logger.warn(`⚠️ Translation failed for activity "${act.activity}": ${error.message}`);
            // Fallback to English if translation fails
            return {
              translations: {
                en: {
                  activity: act.activity,
                  description: act.description,
                },
                fr: {
                  activity: act.activity,
                  description: act.description,
                }
              }
            };
          }
        })
      );

      this.logger.debug('🧪 Translated Activities: ' + JSON.stringify(translatedActivities, null, 2));

      this.logger.log('💾 Saving new translated activities...');
      const savedActivities = await this.activityModel.insertMany(translatedActivities);
      this.logger.log(`✅ Saved ${savedActivities.length} activities`);
    } catch (error) {
      this.logger.error('❌ API Call Failed: ' + (error.response?.data?.error?.message || error.message));
    }
  }

  // 🔥 Manual trigger for testing
  async triggerFetchAndSaveActivities(): Promise<void> {
    this.logger.log('🛠️ Manually triggering fetchAndSaveActivities');
    await this.fetchAndSaveActivities();
  }

  private async translateText(text: string, targetLang: 'fr' | 'en'): Promise<string> {
    try {
      const prompt = `Translate the following into ${targetLang}. Only return the translated sentence, no explanations, no Markdown, no formatting:\n"${text}"`;
      const response = await axios.post(this.apiUrl, {
        contents: [{ parts: [{ text: prompt }] }],
      });

      const translatedText = response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!translatedText) {
        this.logger.warn(`⚠️ Empty translation for "${text}" to ${targetLang}`);
        return text;
      }
      return translatedText;
    } catch (err) {
      this.logger.warn(`⚠️ Failed to translate "${text}" to ${targetLang}: ${err.message}`);
      return text; // Fallback: return original if translation fails
    }
  }

  private cleanTranslation(raw: string): string {
    const cleaned = raw
      .replace(/\*\*/g, '') // Remove Markdown bold
      .replace(/`/g, '') // Remove backticks
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

  // 🔥 Get the latest 4 activities
  async getActivities(): Promise<any[]> {
    this.logger.log('📡 Fetching latest activities...');

    // Fetch all activities, not just today's, to ensure we get results during testing
    const activities = await this.activityModel
      .find({})
      .sort({ createdAt: -1 })
      .limit(4)
      .lean()
      .exec();

    this.logger.debug('✅ Fetched Activities: ' + JSON.stringify(activities, null, 2));
    return activities;
  }
}