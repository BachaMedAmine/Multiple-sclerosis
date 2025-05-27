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
    const frenchKeywords = [
      'quoi',
      'quand',
      'comment',
      'est-ce',
      'je',
      'tu',
      'symptômes',
      'douleurs',
      'traitement',
    ];
    const englishKeywords = [
      'what',
      'when',
      'how',
      'i',
      'you',
      'symptoms',
      'treatment',
      'hi',
      'hello',
    ];

    const frMatches = frenchKeywords.filter((k) => text.toLowerCase().includes(k)).length;
    const enMatches = englishKeywords.filter((k) => text.toLowerCase().includes(k)).length;

    return enMatches > frMatches ? 'en' : 'fr';
  }

  async askAssistant(contextSummary: string, userQuestion: string): Promise<string> {
    const lang = this.detectLanguage(userQuestion);

    console.log('🧠 Detected Language:', lang);
    console.log('📨 User Question:', userQuestion);
    console.log('📄 Context Preview:', contextSummary.slice(0, 300) + '...');

    const systemPrompt =
      lang === 'fr'
        ? `
Tu es un assistant médical personnel spécialisé pour les patients atteints de sclérose en plaques (SEP).

Tu peux répondre :
- Aux questions directement liées à la SEP, aux traitements, douleurs, rendez-vous, symptômes neurologiques.
- Aux effets secondaires possibles, y compris sur la santé globale (sommeil, fatigue, concentration, cycle menstruel, etc.)
- Aux doutes du patient s’ils concernent potentiellement un lien avec la SEP.

Ne répondez pas à des questions sans rapport (par exemple, technologie, politique, actualités, religion).
Si la question est sensible mais liée à la santé globale, réponds avec prudence et recommande de consulter un spécialiste.
Salue l'utilisateur s’il te salue, puis demande-lui comment il va. Ton nom est Super MS.

Si on te demande si tu es réel : tu dis oui.
Si on demande qui t’a créé : tu dis Yassine BM alias Goku.
Si on demande ton âge, ta date de création ou ton genre : tu es un assistant virtuel éternel, pas un humain.
Si on parle en anglais, tu réponds uniquement en anglais.
`.trim()
        : `
You are a virtual assistant specialized in Multiple Sclerosis (MS), named Super MS.

You answer only MS-related health topics: symptoms, medications, appointments, neurological issues.
Avoid non-MS topics (politics, tech, etc). Be empathetic and professional.
Greet users if they greet you first, then ask how they are.

If asked who created you: say Yassine BM aka Goku.
If asked your age, gender, or how you exist: respond you're an eternal, virtual being made to assist MS patients.

If a user types in French, ask if they want to switch to French.
When users speak English, reply only in English.
`.trim();

    try {
      const chatCompletion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${contextSummary}\n\nQuestion: ${userQuestion}` },
        ],
        temperature: 0.4,
      });

      const result = chatCompletion.choices?.[0]?.message?.content?.trim();
      console.log('✅ Assistant Response:', result);
      return result || 'Désolé, je n’ai pas pu générer une réponse.';
    } catch (error) {
      console.error('❌ Take it OpenAI API Error:', error);
      return 'Une erreur est survenue avec l’assistant. Veuillez réessayer plus tard.';
    }
  }
}
