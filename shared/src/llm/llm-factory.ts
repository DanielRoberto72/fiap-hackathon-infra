import { GeminiLlmProvider, type GeminiProviderConfig } from './gemini.provider';
import { GroqLlmProvider, type GroqProviderConfig } from './groq.provider';
import { MockLlmProvider } from './mock.provider';
import { LlmPipeline } from './llm-pipeline';
import { LlmProvider } from './llm-provider.interface';

export type LlmProviderName = 'gemini' | 'groq' | 'mock';

export interface LlmFactoryConfig {
  visionProvider: LlmProviderName;
  textProvider: LlmProviderName;
  gemini?: GeminiProviderConfig;
  groq?: GroqProviderConfig;
}

export class LlmFactory {
  static buildPipeline(config: LlmFactoryConfig): LlmPipeline {
    const vision = LlmFactory.buildProvider(config.visionProvider, config);
    const text = LlmFactory.buildProvider(config.textProvider, config);
    const fallback = new MockLlmProvider();
    return new LlmPipeline({
      visionProvider: vision,
      textProvider: text,
      fallbackProvider: fallback,
    });
  }

  static buildProvider(name: LlmProviderName, config: LlmFactoryConfig): LlmProvider {
    switch (name) {
      case 'gemini':
        if (!config.gemini) {
          throw new Error('LlmFactory: gemini config required when visionProvider/textProvider is "gemini"');
        }
        return new GeminiLlmProvider(config.gemini);
      case 'groq':
        if (!config.groq) {
          throw new Error('LlmFactory: groq config required when textProvider is "groq"');
        }
        return new GroqLlmProvider(config.groq);
      case 'mock':
        return new MockLlmProvider();
      default: {
        const _exhaustive: never = name;
        throw new Error(`Unknown provider: ${_exhaustive as string}`);
      }
    }
  }
}
