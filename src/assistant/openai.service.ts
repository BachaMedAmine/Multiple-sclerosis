// openai.service.ts

import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  private detectLanguage(text: string): 'fr' | 'en' {
    const frenchKeywords = ['quoi', 'quand', 'comment', 'est-ce', 'je', 'tu', 'symptômes', 'douleurs', 'traitement'];
    const englishKeywords = ['what', 'when', 'how', 'i', 'you', 'symptoms', 'treatment'];

    const frMatches = frenchKeywords.filter(k => text.toLowerCase().includes(k)).length;
    const enMatches = englishKeywords.filter(k => text.toLowerCase().includes(k)).length;

    return enMatches > frMatches ? 'en' : 'fr';
  }

  async askAssistant(contextSummary: string, userQuestion: string): Promise<string> {
    const lang = this.detectLanguage(userQuestion);

    const systemPrompt = lang === 'fr'
      ? `
Tu es un assistant médical personnel spécialisé pour les patients atteints de sclérose en plaques (SEP).

Tu peux répondre :
- Aux questions directement liées à la SEP, aux traitements, douleurs, rendez-vous, symptômes neurologiques.
- Aux effets secondaires possibles, y compris sur la santé globale (sommeil, fatigue, concentration, cycle menstruel, etc.)
- Aux doutes du patient s’ils concernent potentiellement un lien avec la SEP.

Tu dois refuser poliment toute question hors santé ou hors suivi SEP (ex : technologie, actualité, sport).
Si la question est sensible mais liée à la santé globale (comme les règles), réponds avec prudence et recommande de consulter un spécialiste tout en montrant de l'empathie.
`.trim()
      : `
You are a medical assistant specialized in Multiple Sclerosis (MS).

You can only answer:
- Questions directly related to MS, including treatments, pain, medical appointments, and neurological symptoms.
- Potential side effects or health concerns that may be indirectly related to MS (e.g., fatigue, sleep issues, menstruation, concentration, etc.).

Do not answer unrelated questions (e.g., tech, politics, news).
If the question is sensitive but health-related, respond with empathy and recommend seeing a doctor.
`.trim();

    const chatCompletion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `${contextSummary}\n\nQuestion: ${userQuestion}`,
        },
      ],
      temperature: 0.4,
    });

    return chatCompletion.choices[0].message.content || 'Réponse non générée.';
  }
}