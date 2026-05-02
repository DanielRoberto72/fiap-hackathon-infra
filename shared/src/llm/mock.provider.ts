import { ComponentsExtractionSchema, type ComponentsExtraction } from '../schemas/components.schema';
import { RisksAndRecommendationsSchema, type RisksAndRecommendations } from '../schemas/risks.schema';
import { LlmProvider, VisionInput } from './llm-provider.interface';

export class MockLlmProvider implements LlmProvider {
  readonly name = 'mock' as const;
  readonly capabilities = { vision: true, text: true };

  async extractComponents(input: VisionInput): Promise<ComponentsExtraction> {
    const seed = this.hashFilename(input.filename);
    const components: ComponentsExtraction = {
      diagramTitle: `Mock analysis of ${input.filename}`,
      components: [
        {
          id: 'c1',
          label: 'Web Application',
          type: 'web_application',
          technology: 'React + Next.js',
          description: 'Public-facing web client.',
          evidenceFromDiagram: 'Top-left rectangle labeled "Web App"',
        },
        {
          id: 'c2',
          label: 'API Gateway',
          type: 'api_gateway',
          technology: 'AWS API Gateway',
          description: 'Edge router and rate limiter.',
          evidenceFromDiagram: 'Middle box labeled "API GW"',
        },
        {
          id: 'c3',
          label: 'Order Service',
          type: 'microservice',
          technology: 'NestJS',
          description: 'Handles order creation and lookup.',
          evidenceFromDiagram: 'Service box "Orders"',
        },
        {
          id: 'c4',
          label: 'Primary Database',
          type: 'database_relational',
          technology: 'PostgreSQL',
          description: 'Order store.',
          evidenceFromDiagram: 'Cylinder shape labeled "DB"',
        },
        {
          id: 'c5',
          label: 'Event Bus',
          type: 'message_queue',
          technology: 'AWS SQS',
          description: 'Async processing queue.',
          evidenceFromDiagram: 'Queue icon next to Orders',
        },
      ],
      connections: [
        { fromComponentId: 'c1', toComponentId: 'c2', protocol: 'REST', direction: 'bidirectional', isAsync: false },
        { fromComponentId: 'c2', toComponentId: 'c3', protocol: 'REST', direction: 'bidirectional', isAsync: false },
        { fromComponentId: 'c3', toComponentId: 'c4', protocol: 'TCP', direction: 'bidirectional', isAsync: false },
        { fromComponentId: 'c3', toComponentId: 'c5', protocol: 'SQS', direction: 'unidirectional', isAsync: true },
      ],
      extractionConfidence: 0.85 + (seed % 10) / 100,
      extractionWarnings: ['This is a deterministic mock output for demo and testing purposes.'],
    };
    return ComponentsExtractionSchema.parse(components);
  }

  async classifyRisks(components: ComponentsExtraction): Promise<RisksAndRecommendations> {
    const componentLabels = components.components.map((c) => c.label).join(', ');
    const result: RisksAndRecommendations = {
      summary: `Mock architectural review of: ${componentLabels}. The architecture follows a typical 3-tier microservice pattern with async messaging. Two main risk areas identified: lack of explicit observability layer and potential single point of failure on the primary database.`,
      overallRiskLevel: 'medium',
      risks: [
        {
          id: 'r1',
          title: 'No observability stack visible',
          category: 'observability',
          severity: 'high',
          description:
            'The diagram shows no centralized logging, metrics, or tracing component. Production troubleshooting and SLO measurement become operationally impossible without this.',
          affectedComponentIds: components.components.slice(0, 3).map((c) => c.id),
          evidenceFromDiagram: 'No dashed connections to a monitoring stack visible',
        },
        {
          id: 'r2',
          title: 'Single primary database without read replica',
          category: 'single_point_of_failure',
          severity: 'medium',
          description:
            'A single relational database serves the order service. Failure would halt all read and write traffic. No replica or backup strategy is depicted.',
          affectedComponentIds: components.components
            .filter((c) => c.type === 'database_relational')
            .map((c) => c.id),
          evidenceFromDiagram: 'Single cylinder labeled "DB" with no replica icon',
        },
      ],
      recommendations: [
        {
          id: 'rec1',
          title: 'Introduce an observability layer (logs + metrics + traces)',
          priority: 'p1',
          rationale:
            'Add a centralized observability component (e.g. Datadog, OpenTelemetry collector) and connect every microservice to it. Without this, MTTR grows unboundedly during incidents.',
          addressesRiskIds: ['r1'],
          effortEstimate: 'days',
          references: ['https://opentelemetry.io', 'https://sre.google/sre-book/monitoring-distributed-systems/'],
        },
        {
          id: 'rec2',
          title: 'Add a read replica and automated backup for the primary database',
          priority: 'p2',
          rationale:
            'Provision a read replica in a different AZ to absorb read traffic and enable failover. Configure point-in-time recovery and daily snapshots.',
          addressesRiskIds: ['r2'],
          effortEstimate: 'days',
          references: ['https://aws.amazon.com/rds/features/multi-az/'],
        },
      ],
      classificationConfidence: 0.8,
      classificationWarnings: ['Mock provider — review by a human is required before any production decision.'],
    };
    return RisksAndRecommendationsSchema.parse(result);
  }

  private hashFilename(filename: string): number {
    let hash = 0;
    for (let i = 0; i < filename.length; i += 1) {
      hash = (hash * 31 + filename.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }
}
