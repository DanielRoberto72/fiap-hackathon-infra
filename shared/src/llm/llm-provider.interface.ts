import type { ComponentsExtraction } from '../schemas/components.schema';
import type { RisksAndRecommendations } from '../schemas/risks.schema';

export interface VisionInput {
  imageBytes: Buffer;
  mimetype: string;
  filename: string;
}

export interface TextInput {
  systemPrompt: string;
  userPrompt: string;
  responseSchema?: unknown;
}

export interface LlmProvider {
  readonly name: 'gemini' | 'groq' | 'mock';
  readonly capabilities: { vision: boolean; text: boolean };

  extractComponents(input: VisionInput): Promise<ComponentsExtraction>;

  classifyRisks(components: ComponentsExtraction): Promise<RisksAndRecommendations>;
}

export class LlmProviderError extends Error {
  constructor(
    message: string,
    public readonly providerName: string,
    public readonly cause?: unknown,
    public readonly retryable: boolean = true,
  ) {
    super(message);
    this.name = 'LlmProviderError';
  }
}

export class LlmSchemaValidationError extends Error {
  constructor(
    message: string,
    public readonly providerName: string,
    public readonly rawOutput: unknown,
    public readonly zodIssues: unknown,
  ) {
    super(message);
    this.name = 'LlmSchemaValidationError';
  }
}
