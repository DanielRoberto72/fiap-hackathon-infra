import { z } from 'zod';
import { ComponentsExtractionSchema } from './components.schema';
import { RisksAndRecommendationsSchema } from './risks.schema';

export const EventTypeEnum = z.enum([
  'analysis.requested',
  'analysis.processing.started',
  'analysis.completed',
  'analysis.failed',
]);
export type EventType = z.infer<typeof EventTypeEnum>;

const BaseEnvelopeSchema = z.object({
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  traceId: z.string().min(1).max(128).optional(),
  source: z.enum(['upload-orchestration', 'processing', 'report']),
});

export const AnalysisRequestedEventSchema = BaseEnvelopeSchema.extend({
  eventType: z.literal('analysis.requested'),
  data: z.object({
    analysisId: z.string().uuid(),
    s3Bucket: z.string().min(1),
    s3Key: z.string().min(1),
    mimetype: z.string().min(1),
    size: z.number().int().positive(),
    originalFilename: z.string().max(255),
    submittedBy: z.string().nullable(),
  }),
});
export type AnalysisRequestedEvent = z.infer<typeof AnalysisRequestedEventSchema>;

export const AnalysisProcessingStartedEventSchema = BaseEnvelopeSchema.extend({
  eventType: z.literal('analysis.processing.started'),
  data: z.object({
    analysisId: z.string().uuid(),
    startedAt: z.string().datetime(),
  }),
});
export type AnalysisProcessingStartedEvent = z.infer<typeof AnalysisProcessingStartedEventSchema>;

export const AnalysisCompletedEventSchema = BaseEnvelopeSchema.extend({
  eventType: z.literal('analysis.completed'),
  data: z.object({
    analysisId: z.string().uuid(),
    completedAt: z.string().datetime(),
    components: ComponentsExtractionSchema,
    risks: RisksAndRecommendationsSchema,
    providerChain: z.object({
      step1: z.enum(['gemini', 'mock']),
      step2: z.enum(['groq', 'mock']),
    }),
    degraded: z.boolean(),
    durationMs: z.number().int().nonnegative(),
  }),
});
export type AnalysisCompletedEvent = z.infer<typeof AnalysisCompletedEventSchema>;

export const AnalysisFailedEventSchema = BaseEnvelopeSchema.extend({
  eventType: z.literal('analysis.failed'),
  data: z.object({
    analysisId: z.string().uuid(),
    failedAt: z.string().datetime(),
    reason: z.enum([
      'MALWARE_DETECTED',
      'INVALID_FILE',
      'DOWNLOAD_FAILED',
      'AI_PROVIDER_EXHAUSTED',
      'SCHEMA_VALIDATION_FAILED',
      'TIMEOUT',
      'INTERNAL',
    ]),
    detail: z.string().max(1000),
  }),
});
export type AnalysisFailedEvent = z.infer<typeof AnalysisFailedEventSchema>;

export const AnyAnalysisEventSchema = z.discriminatedUnion('eventType', [
  AnalysisRequestedEventSchema,
  AnalysisProcessingStartedEventSchema,
  AnalysisCompletedEventSchema,
  AnalysisFailedEventSchema,
]);
export type AnyAnalysisEvent = z.infer<typeof AnyAnalysisEventSchema>;
