import { GoogleGenAI, Type } from '@google/genai';
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

const COMPONENT_TYPES = [
  'web_application',
  'mobile_application',
  'api_gateway',
  'load_balancer',
  'microservice',
  'monolith',
  'database_relational',
  'database_document',
  'database_keyvalue',
  'cache',
  'message_queue',
  'event_bus',
  'object_storage',
  'cdn',
  'auth_service',
  'function_serverless',
  'container_orchestrator',
  'observability_stack',
  'external_api',
  'user_actor',
  'unknown',
];

const PROTOCOLS = ['REST', 'gRPC', 'AMQP', 'SQS', 'Kafka', 'WebSocket', 'TCP', 'unknown'];

const COMPONENTS_EXTRACTION_GEMINI_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    diagramTitle: { type: Type.STRING, nullable: true },
    components: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          label: { type: Type.STRING },
          type: { type: Type.STRING, enum: COMPONENT_TYPES },
          technology: { type: Type.STRING, nullable: true },
          description: { type: Type.STRING, nullable: true },
          evidenceFromDiagram: { type: Type.STRING },
        },
        required: ['id', 'label', 'type', 'evidenceFromDiagram'],
      },
    },
    connections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          fromComponentId: { type: Type.STRING },
          toComponentId: { type: Type.STRING },
          protocol: { type: Type.STRING, enum: PROTOCOLS },
          direction: { type: Type.STRING, enum: ['unidirectional', 'bidirectional'] },
          isAsync: { type: Type.BOOLEAN },
        },
        required: ['fromComponentId', 'toComponentId', 'protocol', 'direction', 'isAsync'],
      },
    },
    extractionConfidence: { type: Type.NUMBER },
    extractionWarnings: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['components', 'connections', 'extractionConfidence', 'extractionWarnings'],
};

const RISK_CATEGORIES = [
  'security',
  'scalability',
  'availability',
  'observability',
  'cost',
  'data_consistency',
  'coupling',
  'single_point_of_failure',
  'compliance',
  'maintainability',
];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const PRIORITIES = ['p0', 'p1', 'p2', 'p3'];
const EFFORTS = ['hours', 'days', 'weeks', 'months'];

const RISKS_GEMINI_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    overallRiskLevel: { type: Type.STRING, enum: SEVERITIES },
    risks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          category: { type: Type.STRING, enum: RISK_CATEGORIES },
          severity: { type: Type.STRING, enum: SEVERITIES },
          description: { type: Type.STRING },
          affectedComponentIds: { type: Type.ARRAY, items: { type: Type.STRING } },
          evidenceFromDiagram: { type: Type.STRING },
        },
        required: ['id', 'title', 'category', 'severity', 'description', 'affectedComponentIds', 'evidenceFromDiagram'],
      },
    },
    recommendations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          priority: { type: Type.STRING, enum: PRIORITIES },
          rationale: { type: Type.STRING },
          addressesRiskIds: { type: Type.ARRAY, items: { type: Type.STRING } },
          effortEstimate: { type: Type.STRING, enum: EFFORTS },
          references: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['id', 'title', 'priority', 'rationale', 'addressesRiskIds', 'effortEstimate', 'references'],
      },
    },
    classificationConfidence: { type: Type.NUMBER },
    classificationWarnings: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['summary', 'overallRiskLevel', 'risks', 'recommendations', 'classificationConfidence', 'classificationWarnings'],
};

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
    // Gemini 2.5 Flash usa "thinking tokens" internos que descontam do
    // maxOutputTokens. Em prompts complexos esses thoughts consomem ~3-4k
    // tokens e sobra muito pouco para o JSON final, fazendo a resposta
    // ser cortada com finishReason=MAX_TOKENS. Default conservador alto.
    this.maxOutputTokens = config.maxOutputTokens ?? 16384;
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
          responseSchema: COMPONENTS_EXTRACTION_GEMINI_SCHEMA,
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
          responseSchema: RISKS_GEMINI_SCHEMA,
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
      // eslint-disable-next-line no-console
      console.error(`[Gemini ${context}] raw (first 800 chars):`, (raw ?? '').slice(0, 800));
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
