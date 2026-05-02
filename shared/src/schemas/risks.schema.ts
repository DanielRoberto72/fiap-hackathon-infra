import { z } from 'zod';

export const RiskCategoryEnum = z.enum([
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
]);
export type RiskCategory = z.infer<typeof RiskCategoryEnum>;

export const RiskSeverityEnum = z.enum(['low', 'medium', 'high', 'critical']);
export type RiskSeverity = z.infer<typeof RiskSeverityEnum>;

export const ArchitecturalRiskSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(5).max(200),
  category: RiskCategoryEnum,
  severity: RiskSeverityEnum,
  description: z.string().min(20).max(800),
  affectedComponentIds: z.array(z.string().min(1)).min(1).max(20),
  evidenceFromDiagram: z.string().max(400),
});
export type ArchitecturalRisk = z.infer<typeof ArchitecturalRiskSchema>;

export const RecommendationPriorityEnum = z.enum(['p0', 'p1', 'p2', 'p3']);
export type RecommendationPriority = z.infer<typeof RecommendationPriorityEnum>;

export const ArchitecturalRecommendationSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(5).max(200),
  priority: RecommendationPriorityEnum,
  rationale: z.string().min(20).max(800),
  addressesRiskIds: z.array(z.string().min(1)).max(20),
  effortEstimate: z.enum(['hours', 'days', 'weeks', 'months']),
  references: z.array(z.string().url().or(z.string().min(3))).max(5),
});
export type ArchitecturalRecommendation = z.infer<typeof ArchitecturalRecommendationSchema>;

export const RisksAndRecommendationsSchema = z.object({
  summary: z.string().min(50).max(2000),
  overallRiskLevel: RiskSeverityEnum,
  risks: z.array(ArchitecturalRiskSchema).max(30),
  recommendations: z.array(ArchitecturalRecommendationSchema).max(30),
  classificationConfidence: z.number().min(0).max(1),
  classificationWarnings: z.array(z.string().max(300)).max(10),
});
export type RisksAndRecommendations = z.infer<typeof RisksAndRecommendationsSchema>;
