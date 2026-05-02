import { z } from 'zod';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, AnalysisStatus } from '../types/analysis-status';

export const AnalysisIdSchema = z.string().uuid();

export const CreateAnalysisRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  mimetype: z.enum(ALLOWED_MIME_TYPES),
  size: z.number().int().positive().max(MAX_FILE_SIZE_BYTES),
  idempotencyKey: z.string().min(1).max(128).optional(),
});
export type CreateAnalysisRequest = z.infer<typeof CreateAnalysisRequestSchema>;

export const CreateAnalysisResponseSchema = z.object({
  analysisId: z.string().uuid(),
  status: z.enum([
    AnalysisStatus.RECEIVED,
    AnalysisStatus.PROCESSING,
    AnalysisStatus.ANALYZED,
    AnalysisStatus.ERROR,
  ]),
  receivedAt: z.string().datetime(),
});
export type CreateAnalysisResponse = z.infer<typeof CreateAnalysisResponseSchema>;

export const AnalysisStatusResponseSchema = z.object({
  analysisId: z.string().uuid(),
  status: z.enum([
    AnalysisStatus.RECEIVED,
    AnalysisStatus.PROCESSING,
    AnalysisStatus.ANALYZED,
    AnalysisStatus.ERROR,
  ]),
  receivedAt: z.string().datetime(),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  errorReason: z.string().nullable(),
  degraded: z.boolean().default(false),
});
export type AnalysisStatusResponse = z.infer<typeof AnalysisStatusResponseSchema>;
