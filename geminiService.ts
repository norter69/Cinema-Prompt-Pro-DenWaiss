
import { GoogleGenAI } from "@google/genai";
import { ShotType } from './types';
import { SHOT_CONFIGS, MOVEMENTS } from './constants';

export interface ReferenceImage {
  data: string; // base64 string
  mimeType: string;
}

/**
 * Service for professional cinematic prompt construction using Gemini AI.
 */
export class GeminiService {
  /**
   * Fast translation of scene description to cinematic English.
   */
  async translateToEnglish(text: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-flash-preview';

    const systemInstruction = `
      ROLE: Professional Translator for Cinematographers.
      TASK: Translate the provided text into professional, descriptive cinematic English.
      RULES: 
      - Output ONLY the translated text.
      - Use industry terms (e.g., "protagonist" instead of "man", "urban landscape" instead of "city").
      - Keep the meaning but make it sound like a screenplay or a prompt.
      - 100% English only.
    `;

    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: text,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.3,
        }
      });
      return response.text.trim();
    } catch (error) {
      console.error("Translation error:", error);
      return text;
    }
  }

  /**
   * Generates a descriptive, cinematic English prompt from parameters.
   */
  async generateEnhancedPrompt(
    shotType: ShotType, 
    content: string, 
    movementIds: string[],
    image?: ReferenceImage | null
  ): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-flash-preview';

    const shotConfig = SHOT_CONFIGS[shotType];
    const selectedMovements = MOVEMENTS.filter(m => movementIds.includes(m.id));
    const movementDescription = selectedMovements.map(m => m.description).join(' ');

    if (!shotConfig || selectedMovements.length === 0) return "";

    const systemInstruction = `
      ROLE: Professional Cinematography Prompt Constructor.
      STRICT LANGUAGE RULE: THE ENTIRE OUTPUT MUST BE IN ENGLISH. 
      MANDATORY TRANSLATION: Translate everything into professional, descriptive, high-end cinematic English. 
      STRUCTURE: A single, seamless, evocative paragraph.
      CONTENT FORMULA:
      1. Technical shot specs: [Shot Type & Lens specs].
      2. Scene description: TRANSLATED TO ENGLISH with visual DNA from image if present.
      3. Atmosphere: Moody look, lighting, and film stock details.
      4. Camera Movement: Precise technical path (handle multiple movements if provided).
      NO EXPLANATIONS: Return only the final English prompt.
    `;

    const parts: any[] = [
      {
        text: `
          Shot Specs: ${shotConfig.shot} using a ${shotConfig.lens} at ${shotConfig.aperture}.
          User Content: ${content}
          Movement Path: ${movementDescription}
        `
      }
    ];

    if (image) {
      parts.push({
        inlineData: {
          data: image.data,
          mimeType: image.mimeType
        }
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: { parts },
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.75,
        }
      });

      return response.text.trim().replace(/^"(.*)"$/, '$1'); 
    } catch (error) {
      console.error("Gemini Error:", error);
      const fallbackLighting = "Cinematic lighting with professional color grading";
      return `${shotConfig.shot} using a ${shotConfig.lens} at ${shotConfig.aperture} featuring ${content}, ${fallbackLighting}. ${movementDescription}`;
    }
  }
}
