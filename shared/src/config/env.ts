import { z } from 'zod';

const SharedEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('debug'),

  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_ENDPOINT_URL: z.string().url().optional(),

  S3_BUCKET_RAW: z.string().default('fiap-hackathon-dev-uploads'),

  SQS_ANALYSIS_REQUESTED_URL: z.string().url().optional(),
  SQS_ANALYSIS_COMPLETED_URL: z.string().url().optional(),
  SQS_ANALYSIS_FAILED_URL: z.string().url().optional(),

  LLM_VISION_PROVIDER: z.enum(['gemini', 'mock']).default('mock'),
  LLM_TEXT_PROVIDER: z.enum(['groq', 'gemini', 'mock']).default('mock'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL_VISION: z.string().default('gemini-2.5-flash'),
  GEMINI_MODEL_TEXT: z.string().default('gemini-2.5-flash'),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),

  JWT_SECRET: z.string().min(16).default('dev-secret-change-me-please-please'),
  JWT_TTL_SECONDS: z.coerce.number().int().positive().default(3600),

  DD_AGENT_HOST: z.string().default('localhost'),
  DD_TRACE_AGENT_PORT: z.coerce.number().int().positive().default(8126),
  DD_SERVICE: z.string().optional(),
  DD_ENV: z.string().default('dev'),
  DD_VERSION: z.string().default('0.1.0'),
});

export type SharedEnv = z.infer<typeof SharedEnvSchema>;

export function loadSharedEnv(source: NodeJS.ProcessEnv = process.env): SharedEnv {
  const parsed = SharedEnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return parsed.data;
}
