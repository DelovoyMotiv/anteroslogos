import { z } from 'zod';
import { PlatformSchema } from './audit.js';

/**
 * Citation prediction request
 */
export const CitationRequestSchema = z.object({
  url: z.string().url('Invalid URL format'),
  platforms: z.array(PlatformSchema).optional(),
}).strict();
export type CitationRequest = z.infer<typeof CitationRequestSchema>;

/**
 * Platform-specific citation prediction
 */
export const PlatformPredictionSchema = z.object({
  platform: PlatformSchema,
  probability: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  factors: z.record(z.string(), z.number()).optional(),
}).strict();
export type PlatformPrediction = z.infer<typeof PlatformPredictionSchema>;

/**
 * Citation prediction result
 */
export const CitationResultSchema = z.object({
  url: z.string().url(),
  predictions: z.array(PlatformPredictionSchema),
  overallScore: z.number().min(0).max(1),
  timestamp: z.number(),
}).strict();
export type CitationResult = z.infer<typeof CitationResultSchema>;
