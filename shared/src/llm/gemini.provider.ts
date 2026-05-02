import { GoogleGenAI } from '@google/genai';
import { ComponentsExtractionSchema, type ComponentsExtraction } from '../schemas/components.schema';
import {
  RisksAndRecommendationsSchema,
  type RisksAndRecommendations,
} from '../schemas/risks.schema';
import {
  COMPONENTS_EXTRACTION_SYSTEM_PROMPT,
  COMPONENTS_EXTRACTION_USER_PROMPT,
} from './prompts/components-extraction.prompt';
import {
  RISKS_CLASSIFICATION_SYSTEM_PROMPT,
  RISKS_CLASSIFICATION_USER_PROMPT,
} from './prompts/risks-classification.prompt';
import {
  LlmProvider,
  LlmProviderError,
  LlmSchemaValidationError,
  VisionInput,
} from './llm-provider.interface';

export interface GeminiProviderConfig {
  apiKey: string;
  modelVision?: string;
  modelText?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

const DEFAULT_VISION_MODEL = 'gemini-2.5-flash';
const DEFAULT_TEXT_MODEL = 'gemini-2.5-flash';

export class GeminiLlmProvider implements LlmProvider {
  readonly name = 'gemini' as const;
  readonly capabilities = { vision: true, text: true };

  private readonly client: GoogleGenAI;
  private readonly modelVision: string;
  private readonly modelText: string;
  private readonly temperature: number;
  private readonly maxOutputTokens: number;

  constructor(config: GeminiProviderConfig) {
    if (!config.apiKey) {
      throw new Error('GeminiLlmProvider: apiKey is required');
    }
    this.client = new GoogleGenAI({ apiKey: config.apiKey });
    this.modelVision = config.modelVision ?? DEFAULT_VISION_MODEL;
    this.modelText = config.modelText ?? DEFAULT_TEXT_MODEL;
    this.temperature = config.temperature ?? 0.2;
    this.maxOutputTokens = config.maxOutputTokens ?? 4096;
  }

  async extractComponents(input: VisionInput): Promise<ComponentsExtraction> {
    const base64Image = input.imageBytes.toString('base64');
    let response;
    try {
      response = await this.client.models.generateContent({
        model: this.modelVision,
        contents: [
          {
            role: 'user',
            parts: [
              { text: COMPONENTS_EXTRACTION_USER_PROMPT },
              { inlineData: { mimeType: input.mimetype, data: base64Image } },
            ],
          },
        ],
        config: {
          systemInstruction: COMPONENTS_EXTRACTION_SYSTEM_PROMPT,
          temperature: this.temperature,
          maxOutputTokens: this.maxOutputTokens,
          responseMimeType: 'application/json',
        },
      });
    } catch (cause) {
      throw new LlmProviderError('Gemini vision call failed', this.name, cause, true);
    }
    const text = response.text ?? '';
    return this.parseJsonOrThrow(text, ComponentsExtractionSchema, 'extractComponents');
  }

  async classifyRisks(components: ComponentsExtraction): Promise<RisksAndRecommendations> {
    const userPrompt = RISKS_CLASSIFICATION_USER_PROMPT(JSON.stringify(components));
    let response;
    try {
      response = await this.client.models.generateContent({
        model: this.modelText,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction: RISKS_CLASSIFICATION_SYSTEM_PROMPT,
          temperature: this.temperature,
          maxOutputTokens: this.maxOutputTokens,
          responseMimeType: 'application/json',
        },
      });
    } catch (cause) {
      throw new LlmProviderError('Gemini text call failed', this.name, cause, true);
    }
    const text = response.text ?? '';
    return this.parseJsonOrThrow(text, RisksAndRecommendationsSchema, 'classifyRisks');
  }

  private parseJsonOrThrow<T>(
    raw: string,
    schema: { parse: (value: unknown) => T },
    context: string,
  ): T {
    let parsed: unknown;
    try {
      parsed = JSON.parse(this.stripCodeFences(raw));
    } catch (cause) {
      throw new LlmProviderError(
        `Gemini ${context}: response was not valid JSON`,
        this.name,
        { raw, cause },
        false,
      );
    }
    try {
      return schema.parse(parsed);
    } catch (zodError) {
      throw new LlmSchemaValidationError(
        `Gemini ${context}: response failed schema validation`,
        this.name,
        parsed,
        zodError,
      );
    }
  }

  private stripCodeFences(s: string): string {
    return s
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
  }
}
