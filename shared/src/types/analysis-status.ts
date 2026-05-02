export const AnalysisStatus = {
  RECEIVED: 'RECEIVED',
  PROCESSING: 'PROCESSING',
  ANALYZED: 'ANALYZED',
  ERROR: 'ERROR',
} as const;

export type AnalysisStatus = (typeof AnalysisStatus)[keyof typeof AnalysisStatus];

export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/pdf',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
