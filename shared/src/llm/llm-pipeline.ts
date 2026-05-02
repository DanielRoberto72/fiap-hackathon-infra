import type { ComponentsExtraction } from '../schemas/components.schema';
import type { RisksAndRecommendations } from '../schemas/risks.schema';
import {
  LlmProvider,
  LlmProviderError,
  LlmSchemaValidationError,
  VisionInput,
} from './llm-provider.interface';

export interface LlmPipelineConfig {
  visionProvider: LlmProvider;
  textProvider: LlmProvider;
  fallbackProvider: LlmProvider;
  maxAttemptsPerStep?: number;
  initialBackoffMs?: number;
}

export interface PipelineResult {
  components: ComponentsExtraction;
  risks: RisksAndRecommendations;
  providerChain: {
    step1: 'gemini' | 'mock';
    step2: 'groq' | 'mock';
  };
  degraded: boolean;
  durationMs: number;
}

export class LlmPipeline {
  constructor(private readonly config: LlmPipelineConfig) {
    if (!config.visionProvider.capabilities.vision) {
      throw new Error('Vision provider must support vision');
    }
    if (!config.textProvider.capabilities.text) {
      throw new Error('Text provider must support text');
    }
  }

  async run(input: VisionInput): Promise<PipelineResult> {
    const startedAt = Date.now();
    let degraded = false;
    let step1Provider: 'gemini' | 'mock' = this.providerLabel(this.config.visionProvider) === 'gemini' ? 'gemini' : 'mock';
    let step2Provider: 'groq' | 'mock' = this.providerLabel(this.config.textProvider) === 'groq' ? 'groq' : 'mock';

    let components: ComponentsExtraction;
    try {
      components = await this.withRetry(() => this.config.visionProvider.extractComponents(input));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[LlmPipeline] step1 (vision) falhou, fallback para mock:', (e as Error).message, (e as Error).stack);
      degraded = true;
      step1Provider = 'mock';
      components = await this.config.fallbackProvider.extractComponents(input);
    }

    let risks: RisksAndRecommendations;
    try {
      risks = await this.withRetry(() => this.config.textProvider.classifyRisks(components));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[LlmPipeline] step2 (text) falhou, fallback para mock:', (e as Error).message, (e as Error).stack);
      degraded = true;
      step2Provider = 'mock';
      risks = await this.config.fallbackProvider.classifyRisks(components);
    }

    return {
      components,
      risks,
      providerChain: { step1: step1Provider, step2: step2Provider },
      degraded,
      durationMs: Date.now() - startedAt,
    };
  }

  private providerLabel(p: LlmProvider): string {
    return p.name;
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    const maxAttempts = this.config.maxAttemptsPerStep ?? 3;
    const initialBackoff = this.config.initialBackoffMs ?? 500;
    let lastErr: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await fn();
      } catch (e) {
        lastErr = e;
        const retryable = !(e instanceof LlmSchemaValidationError) && !(e instanceof LlmProviderError && !e.retryable);
        if (!retryable || attempt === maxAttempts) {
          throw e;
        }
        await this.sleep(initialBackoff * Math.pow(2, attempt - 1));
      }
    }
    throw lastErr;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
