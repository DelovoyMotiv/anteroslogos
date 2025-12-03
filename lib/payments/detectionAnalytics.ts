/**
 * @file lib/payments/detectionAnalytics.ts
 * @description Analytics and monitoring for automatic payment detection
 * @purpose Observability into detection accuracy and performance
 */

import { createClient } from "@supabase/supabase-js";

// =====================================================
// Environment & Configuration
// =====================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error("Missing required Supabase environment variables");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// =====================================================
// Types
// =====================================================

export interface DetectionStats {
  totalDetections: number;
  matched: number;
  noMatch: number;
  errors: number;
  duplicates: number;
  matchRate: number; // Percentage
  avgConfidenceScore: number;
  last24Hours: {
    totalDetections: number;
    matched: number;
    matchRate: number;
  };
}

export interface DetectionDetails {
  id: string;
  txHash: string;
  blockNumber: number;
  timestamp: Date;
  fromAddress: string;
  toAddress: string;
  amount: number;
  token: string;
  detectedInvoiceId: string | null;
  confidenceScore: number | null;
  matchCriteria: string[] | null;
  detectionStatus: "matched" | "no_match" | "error" | "duplicate";
  errorMessage: string | null;
  processedAt: Date;
}

export interface ConfidenceDistribution {
  scoreRange: string;
  count: number;
  percentage: number;
}

// =====================================================
// Analytics Functions
// =====================================================

/**
 * Gets overall detection statistics
 * @param timeWindow - Optional time window in hours (default: all time)
 * @returns Detection statistics
 */
export async function getDetectionStats(timeWindow?: number): Promise<DetectionStats> {
  // Build query with optional time filter
  let overallQuery = supabase
    .from("a2a_payment_detections")
    .select("detection_status, confidence_score")
    .order("created_at", { ascending: false });

  if (timeWindow) {
    const cutoffTime = new Date(Date.now() - timeWindow * 60 * 60 * 1000).toISOString();
    overallQuery = overallQuery.gte("created_at", cutoffTime);
  }

  // Overall stats
  const { data: overallData, error: overallError } = await overallQuery;

  if (overallError) {
    throw new Error(`Failed to fetch detection stats: ${overallError.message}`);
  }

  // Last 24 hours stats
  const { data: recentData, error: recentError } = await supabase
    .from("a2a_payment_detections")
    .select("detection_status, confidence_score")
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (recentError) {
    throw new Error(`Failed to fetch recent stats: ${recentError.message}`);
  }

  // Calculate overall stats
  const totalDetections = overallData?.length || 0;
  const matched = overallData?.filter((d) => d.detection_status === "matched").length || 0;
  const noMatch = overallData?.filter((d) => d.detection_status === "no_match").length || 0;
  const errors = overallData?.filter((d) => d.detection_status === "error").length || 0;
  const duplicates = overallData?.filter((d) => d.detection_status === "duplicate").length || 0;
  const matchRate = totalDetections > 0 ? (matched / totalDetections) * 100 : 0;

  // Calculate average confidence score (for matched only)
  const matchedWithScores = overallData?.filter(
    (d) => d.detection_status === "matched" && d.confidence_score !== null
  );
  const avgConfidenceScore =
    matchedWithScores && matchedWithScores.length > 0
      ? matchedWithScores.reduce((sum, d) => sum + (d.confidence_score || 0), 0) /
        matchedWithScores.length
      : 0;

  // Calculate recent stats
  const recentTotal = recentData?.length || 0;
  const recentMatched = recentData?.filter((d) => d.detection_status === "matched").length || 0;
  const recentMatchRate = recentTotal > 0 ? (recentMatched / recentTotal) * 100 : 0;

  return {
    totalDetections,
    matched,
    noMatch,
    errors,
    duplicates,
    matchRate,
    avgConfidenceScore,
    last24Hours: {
      totalDetections: recentTotal,
      matched: recentMatched,
      matchRate: recentMatchRate,
    },
  };
}

/**
 * Gets recent detection attempts with details
 * @param limit - Max number of results
 * @param status - Optional status filter
 * @returns Array of detection details
 */
export async function getRecentDetections(
  limit: number = 50,
  status?: "matched" | "no_match" | "error" | "duplicate"
): Promise<DetectionDetails[]> {
  let query = supabase
    .from("a2a_payment_detections")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("detection_status", status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch recent detections: ${error.message}`);
  }

  return (data || []).map((row) => ({
    id: row.id,
    txHash: row.tx_hash,
    blockNumber: row.block_number,
    timestamp: new Date(row.tx_timestamp),
    fromAddress: row.from_address,
    toAddress: row.to_address,
    amount: Number(row.amount),
    token: row.token,
    detectedInvoiceId: row.detected_invoice_id,
    confidenceScore: row.confidence_score,
    matchCriteria: row.match_criteria,
    detectionStatus: row.detection_status,
    errorMessage: row.error_message,
    processedAt: new Date(row.processed_at),
  }));
}

/**
 * Gets confidence score distribution for matched payments
 * @returns Distribution of confidence scores
 */
export async function getConfidenceDistribution(): Promise<ConfidenceDistribution[]> {
  const { data, error } = await supabase
    .from("a2a_payment_detections")
    .select("confidence_score")
    .eq("detection_status", "matched")
    .not("confidence_score", "is", null);

  if (error) {
    throw new Error(`Failed to fetch confidence distribution: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Group by score ranges
  const ranges = [
    { min: 60, max: 69, label: "60-69" },
    { min: 70, max: 79, label: "70-79" },
    { min: 80, max: 89, label: "80-89" },
    { min: 90, max: 100, label: "90-100" },
  ];

  const total = data.length;
  const distribution: ConfidenceDistribution[] = ranges.map((range) => {
    const count = data.filter(
      (d) => d.confidence_score >= range.min && d.confidence_score <= range.max
    ).length;

    return {
      scoreRange: range.label,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    };
  });

  return distribution;
}

/**
 * Gets failed detections (no match) for analysis
 * Useful for identifying patterns and improving matching algorithm
 * @param limit - Max number of results
 * @returns Array of failed detection details
 */
export async function getFailedDetections(limit: number = 100): Promise<DetectionDetails[]> {
  return getRecentDetections(limit, "no_match");
}

/**
 * Gets detection success rate by time of day (UTC)
 * @returns Success rate by hour
 */
export async function getDetectionRateByHour(): Promise<
  Array<{ hour: number; detections: number; matched: number; matchRate: number }>
> {
  const { data, error } = await supabase
    .from("a2a_payment_detections")
    .select("created_at, detection_status")
    .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

  if (error) {
    throw new Error(`Failed to fetch hourly stats: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Group by hour
  const hourlyStats: Record<number, { detections: number; matched: number }> = {};

  for (const row of data) {
    const hour = new Date(row.created_at).getUTCHours();
    if (!hourlyStats[hour]) {
      hourlyStats[hour] = { detections: 0, matched: 0 };
    }
    hourlyStats[hour].detections++;
    if (row.detection_status === "matched") {
      hourlyStats[hour].matched++;
    }
  }

  // Convert to array
  return Object.entries(hourlyStats).map(([hour, stats]) => ({
    hour: parseInt(hour, 10),
    detections: stats.detections,
    matched: stats.matched,
    matchRate: stats.detections > 0 ? (stats.matched / stats.detections) * 100 : 0,
  }));
}

/**
 * Gets most common match criteria combinations
 * @param limit - Max number of combinations
 * @returns Array of criteria combinations with frequencies
 */
export async function getMostCommonMatchCriteria(
  limit: number = 10
): Promise<Array<{ criteria: string[]; count: number }>> {
  const { data, error } = await supabase
    .from("a2a_payment_detections")
    .select("match_criteria")
    .eq("detection_status", "matched")
    .not("match_criteria", "is", null);

  if (error) {
    throw new Error(`Failed to fetch match criteria: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Count occurrences of each criteria combination
  const criteriaMap: Record<string, number> = {};

  for (const row of data) {
    if (!row.match_criteria) continue;
    const key = JSON.stringify(row.match_criteria);
    criteriaMap[key] = (criteriaMap[key] || 0) + 1;
  }

  // Convert to array and sort by frequency
  return Object.entries(criteriaMap)
    .map(([key, count]) => ({
      criteria: JSON.parse(key) as string[],
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
