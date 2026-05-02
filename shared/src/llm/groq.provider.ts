import Groq from 'groq-sdk';
import { type ComponentsExtraction } from '../schemas/components.schema';
import {
  RisksAndRecommendationsSchema,
  type RisksAndRecommendations,
} from '../schemas/risks.schema';
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

export interface GroqProviderConfig {
  apiKey: string;
  modelText?: string;
  temperature?: number;
  maxTokens?: number;
}

const DEFAULT_TEXT_MODEL = 'llama-3.3-70b-versatile';

export class GroqLlmProvider implements LlmProvider {
  readonly name = 'groq' as const;
  readonly capabilities = { vision: false, text: true };

  private readonly client: Groq;
  private readonly modelText: string;
  private readonly temperature: number;
  private readonly maxTokens: number;

  constructor(config: GroqProviderConfig) {
    if (!config.apiKey) {
      throw new Error('GroqLlmProvider: apiKey is required');
    }
    this.client = new Groq({ apiKey: config.apiKey });
    this.modelText = config.modelText ?? DEFAULT_TEXT_MODEL;
    this.temperature = config.temperature ?? 0.2;
    this.maxTokens = config.maxTokens ?? 4096;
  }

  async extractComponents(_input: VisionInput): Promise<ComponentsExtraction> {
    throw new LlmProviderError(
      'Groq provider does not support vision in this configuration; use Gemini for component extraction',
      this.name,
      undefined,
      false,
    );
  }

  async classifyRisks(components: ComponentsExtraction): Promise<RisksAndRecommendations> {
    const userPrompt = RISKS_CLASSIFICATION_USER_PROMPT(JSON.stringify(components));
    let completion;
    try {
      completion = await this.client.chat.completions.create({
        model: this.modelText,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: RISKS_CLASSIFICATION_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      });
    } catch (cause) {
      throw new LlmProviderError('Groq classifyRisks call failed', this.name, cause, true);
    }
    const raw = completion.choices[0]?.message?.content ?? '';
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (cause) {
      throw new LlmProviderError(
        'Groq classifyRisks: response was not valid JSON',
        this.name,
        { raw, cause },
        false,
      );
    }
    try {
      return RisksAndRecommendationsSchema.parse(parsed);
    } catch (zodError) {
      throw new LlmSchemaValidationError(
        'Groq classifyRisks: response failed schema validation',
        this.name,
        parsed,
        zodError,
      );
    }
  }
}
