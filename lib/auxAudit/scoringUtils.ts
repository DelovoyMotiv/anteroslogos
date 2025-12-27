/**
 * AUX Audit Module - Scoring Utilities
 * 
 * This file contains utilities for calculating and classifying AUX Scores.
 * 
 * Requirements:
 * - 8.1: AUX Score must be between 0 and 100
 * - 8.2: Score < 50 = "Agent-Blind"
 * - 8.3: Score 50-80 = "Agent-Capable"
 * - 8.4: Score > 80 = "Agent-Ready"
 */

import type { ScrapedData, LLMAnalysis, Classification } from './types';

/**
 * Calculate the AUX Score based on scraped data and LLM analysis.
 * 
 * The score is primarily determined by the LLM's analysis, but we validate
 * and potentially adjust it based on the scraped data to ensure consistency.
 * 
 * Scoring factors:
 * - LLM-provided score (primary)
 * - Protocol availability (bonus/penalty)
 * - ARIA density (quality factor)
 * - Friction points (penalty)
 * 
 * @param data - Scraped data from the website
 * @param llmAnalysis - Analysis results from the LLM
 * @returns AUX Score between 0 and 100
 * 
 * @example
 * const score = calculateAUXScore(scrapedData, llmAnalysis);
 * console.log(score); // 75
 */
export function calculateAUXScore(
  data: ScrapedData,
  llmAnalysis: LLMAnalysis
): number {
  // Start with the LLM's score as the base
  let score = llmAnalysis.score;
  
  // Ensure the score is within valid range (0-100)
  score = Math.max(0, Math.min(100, score));
  
  // Apply adjustments based on scraped data
  
  // Protocol bonus: Each available protocol adds a small bonus
  const availableProtocols = data.protocols.filter(p => p.available).length;
  const protocolBonus = availableProtocols * 2; // +2 per protocol
  
  // ARIA quality factor: High ARIA density indicates better agent readiness
  const ariaFactor = data.ariaScore / 100; // 0-1 scale
  const ariaBonus = ariaFactor * 5; // Up to +5 for perfect ARIA
  
  // Friction penalty: Each high-severity friction point reduces score
  const highSeverityFriction = data.frictionPoints.filter(
    fp => fp.severity === 'high'
  ).length;
  const mediumSeverityFriction = data.frictionPoints.filter(
    fp => fp.severity === 'medium'
  ).length;
  const frictionPenalty = (highSeverityFriction * 5) + (mediumSeverityFriction * 2);
  
  // Apply adjustments
  score = score + protocolBonus + ariaBonus - frictionPenalty;
  
  // Ensure final score is within valid range
  score = Math.max(0, Math.min(100, score));
  
  // Round to nearest integer
  return Math.round(score);
}

/**
 * Classify an AUX Score into a human-readable category.
 * 
 * Classification rules:
 * - Agent-Blind: score < 50 (site is not ready for agents)
 * - Agent-Capable: 50 <= score <= 80 (site works but has issues)
 * - Agent-Ready: score > 80 (site is well-optimized for agents)
 * 
 * @param score - AUX Score (0-100)
 * @returns Classification label
 * 
 * @example
 * classifyScore(45); // "Agent-Blind"
 * classifyScore(65); // "Agent-Capable"
 * classifyScore(85); // "Agent-Ready"
 */
export function classifyScore(score: number): Classification {
  if (score < 50) {
    return 'Agent-Blind';
  } else if (score <= 80) {
    return 'Agent-Capable';
  } else {
    return 'Agent-Ready';
  }
}
