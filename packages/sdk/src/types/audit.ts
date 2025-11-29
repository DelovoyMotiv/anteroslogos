import { z } from 'zod';

/**
 * Audit depth mode
 */
export const AuditDepthSchema = z.enum(['quick', 'standard', 'deep']);
export type AuditDepth = z.infer<typeof AuditDepthSchema>;

/**
 * AI platform types
 */
export const PlatformSchema = z.enum(['perplexity', 'chatgpt', 'claude', 'gemini']);
export type Platform = z.infer<typeof PlatformSchema>;

/**
 * Audit request options
 */
export const AuditOptionsSchema = z.object({
  includeScreenshots: z.boolean().default(false),
  platforms: z.array(PlatformSchema).optional(),
}).strict();
export type AuditOptions = z.infer<typeof AuditOptionsSchema>;

/**
 * Audit request parameters
 */
export const AuditRequestSchema = z.object({
  url: z.string().url('Invalid URL format'),
  depth: AuditDepthSchema.default('standard'),
  options: AuditOptionsSchema.optional(),
}).strict();
export type AuditRequest = z.infer<typeof AuditRequestSchema>;

/**
 * Grade classification
 */
export const GradeSchema = z.enum(['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Expert']);
export type Grade = z.infer<typeof GradeSchema>;

/**
 * Recommendation priority
 */
export const PrioritySchema = z.enum(['critical', 'high', 'medium', 'low']);
export type Priority = z.infer<typeof PrioritySchema>;

/**
 * Individual recommendation
 */
export const RecommendationSchema = z.object({
  priority: PrioritySchema,
  category: z.string(),
  message: z.string(),
  fix: z.string(),
}).strict();
export type Recommendation = z.infer<typeof RecommendationSchema>;

/**
 * Category scores
 */
export const CategoryScoresSchema = z.object({
  content: z.number().min(0).max(100),
  technical: z.number().min(0).max(100),
  authority: z.number().min(0).max(100),
  citations: z.number().min(0).max(100),
  userExperience: z.number().min(0).max(100),
}).strict();
export type CategoryScores = z.infer<typeof CategoryScoresSchema>;

/**
 * Platform-specific insights
 */
export const PlatformInsightSchema = z.object({
  platform: PlatformSchema,
  citationProbability: z.number().min(0).max(1),
  optimizationTips: z.array(z.string()),
}).strict();
export type PlatformInsight = z.infer<typeof PlatformInsightSchema>;

/**
 * Complete audit result
 */
export const AuditResultSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  score: z.number().min(0).max(100),
  grade: GradeSchema,
  categories: CategoryScoresSchema,
  recommendations: z.array(RecommendationSchema),
  platformInsights: z.array(PlatformInsightSchema).optional(),
  timestamp: z.number(),
  duration: z.number(),
}).strict();
export type AuditResult = z.infer<typeof AuditResultSchema>;

/**
 * Batch audit request
 */
export const BatchAuditRequestSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(100),
  depth: AuditDepthSchema.default('standard'),
  options: AuditOptionsSchema.optional(),
}).strict();
export type BatchAuditRequest = z.infer<typeof BatchAuditRequestSchema>;

/**
 * Batch audit result
 */
export const BatchAuditResultSchema = z.object({
  batchId: z.string(),
  total: z.number(),
  completed: z.number(),
  failed: z.number(),
  results: z.array(AuditResultSchema),
}).strict();
export type BatchAuditResult = z.infer<typeof BatchAuditResultSchema>;
