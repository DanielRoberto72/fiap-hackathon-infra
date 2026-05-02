import { z } from 'zod';

export const ComponentTypeEnum = z.enum([
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
]);
export type ComponentType = z.infer<typeof ComponentTypeEnum>;

export const ArchitecturalComponentSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(200),
  type: ComponentTypeEnum,
  technology: z.string().max(100).nullable(),
  description: z.string().max(500).nullable(),
  evidenceFromDiagram: z.string().max(300),
});
export type ArchitecturalComponent = z.infer<typeof ArchitecturalComponentSchema>;

export const ConnectionSchema = z.object({
  fromComponentId: z.string().min(1),
  toComponentId: z.string().min(1),
  protocol: z.enum(['REST', 'gRPC', 'AMQP', 'SQS', 'Kafka', 'WebSocket', 'TCP', 'unknown']),
  direction: z.enum(['unidirectional', 'bidirectional']),
  isAsync: z.boolean(),
});
export type Connection = z.infer<typeof ConnectionSchema>;

export const ComponentsExtractionSchema = z.object({
  diagramTitle: z.string().max(200).nullable(),
  components: z.array(ArchitecturalComponentSchema).min(1).max(50),
  connections: z.array(ConnectionSchema).max(200),
  extractionConfidence: z.number().min(0).max(1),
  extractionWarnings: z.array(z.string().max(300)).max(10),
});
export type ComponentsExtraction = z.infer<typeof ComponentsExtractionSchema>;
