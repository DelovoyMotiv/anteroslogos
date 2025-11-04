/**
 * GEO Marketolog AI Agent
 * Intelligent recommendation engine powered by LLM
 */

import {
  createOpenRouterClient,
  isOpenRouterConfigured,
  type AIRecommendationRequest,
  type AIRecommendationResponse,
} from './openrouter';
import type { AuditResult, EnhancedRecommendation } from '../geoAuditEnhanced';

// ==================== TYPES ====================

export interface AgentConfig {
  enabled: boolean;
  fallbackToDefault: boolean;
  timeout: number; // milliseconds
}

export interface AgentResult {
  recommendations: EnhancedRecommendation[];
  insights: string[];
  source: 'ai' | 'fallback';
  model?: string;
  error?: string;
}

// ==================== AGENT ====================

export class GeoMarketologAgent {
  private config: AgentConfig;
  private client: ReturnType<typeof createOpenRouterClient>;

  constructor(config?: Partial<AgentConfig>) {
    this.config = {
      enabled: isOpenRouterConfigured(),
      fallbackToDefault: true,
      timeout: 30000, // 30 seconds
      ...config,
    };

    this.client = this.config.enabled ? createOpenRouterClient() : null;
  }

  /**
   * Generate AI-powered recommendations or fallback to defaults
   */
  async generateRecommendations(
    auditResult: AuditResult
  ): Promise<AgentResult> {
    // If AI is disabled or not configured, use fallback
    if (!this.config.enabled || !this.client) {
      console.log('AI Agent disabled, using fallback recommendations');
      return {
        recommendations: auditResult.recommendations,
        insights: auditResult.insights,
        source: 'fallback',
      };
    }

    try {
      // Prepare request for AI
      const request = this.prepareAIRequest(auditResult);

      // Call AI with timeout
      const response = await this.callAIWithTimeout(request);

      // Convert AI response to EnhancedRecommendation format
      const recommendations = this.convertToEnhancedRecommendations(
        response.recommendations
      );

      return {
        recommendations,
        insights: response.insights,
        source: 'ai',
        model: import.meta.env.VITE_OPENROUTER_MODEL,
      };
    } catch (error) {
      console.error('AI Agent failed:', error);

      // Fallback to default recommendations if enabled
      if (this.config.fallbackToDefault) {
        console.log('Falling back to default recommendations');
        return {
          recommendations: auditResult.recommendations,
          insights: auditResult.insights,
          source: 'fallback',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }

      throw error;
    }
  }

  /**
   * Prepare audit result for AI request
   */
  private prepareAIRequest(
    auditResult: AuditResult
  ): AIRecommendationRequest {
    // Extract critical issues from all detail sections
    const criticalIssues: string[] = [];
    Object.values(auditResult.details).forEach((detail: any) => {
      if (detail.issues && Array.isArray(detail.issues)) {
        // Only include first 2 issues per category to keep prompt concise
        criticalIssues.push(...detail.issues.slice(0, 2));
      }
    });

    // Extract top strengths from all detail sections
    const topStrengths: string[] = [];
    Object.values(auditResult.details).forEach((detail: any) => {
      if (detail.strengths && Array.isArray(detail.strengths)) {
        // Only include first 2 strengths per category
        topStrengths.push(...detail.strengths.slice(0, 2));
      }
    });

    return {
      url: auditResult.url,
      overallScore: auditResult.overallScore,
      scores: auditResult.scores,
      criticalIssues: criticalIssues.slice(0, 10), // Max 10 issues
      topStrengths: topStrengths.slice(0, 10), // Max 10 strengths
    };
  }

  /**
   * Call AI with timeout protection
   */
  private async callAIWithTimeout(
    request: AIRecommendationRequest
  ): Promise<AIRecommendationResponse> {
    if (!this.client) {
      throw new Error('OpenRouter client not initialized');
    }

    return Promise.race([
      this.client.generateRecommendations(request),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('AI request timeout')),
          this.config.timeout
        )
      ),
    ]);
  }

  /**
   * Convert AI recommendations to EnhancedRecommendation format
   */
  private convertToEnhancedRecommendations(
    aiRecommendations: AIRecommendationResponse['recommendations']
  ): EnhancedRecommendation[] {
    return aiRecommendations.map((rec) => ({
      category: rec.category,
      priority: rec.priority,
      effort: rec.effort,
      title: rec.title,
      description: rec.description,
      impact: rec.impact,
      implementation: rec.implementation,
      estimatedTime: rec.estimatedTime,
      // AI recommendations don't include code examples
      // They are more strategic and less technical
    }));
  }

  /**
   * Check if agent is ready to use
   */
  isReady(): boolean {
    return this.config.enabled && this.client !== null;
  }

  /**
   * Get agent status info
   */
  getStatus(): {
    enabled: boolean;
    configured: boolean;
    model?: string;
  } {
    return {
      enabled: this.config.enabled,
      configured: isOpenRouterConfigured(),
      model: this.config.enabled
        ? import.meta.env.VITE_OPENROUTER_MODEL
        : undefined,
    };
  }
}

// ==================== SINGLETON ====================

let agentInstance: GeoMarketologAgent | null = null;

/**
 * Get singleton instance of GEO Marketolog Agent
 */
export function getGeoMarketologAgent(): GeoMarketologAgent {
  if (!agentInstance) {
    agentInstance = new GeoMarketologAgent();
  }
  return agentInstance;
}

/**
 * Reset agent instance (useful for testing or reconfiguration)
 */
export function resetGeoMarketologAgent(): void {
  agentInstance = null;
}

// ==================== UTILITIES ====================

/**
 * Enhance existing recommendations with AI insights
 * This merges AI recommendations with default ones
 */
export function mergeRecommendations(
  defaultRecs: EnhancedRecommendation[],
  aiRecs: EnhancedRecommendation[]
): EnhancedRecommendation[] {
  // Use AI recommendations as primary
  // Add default recommendations that aren't covered by AI
  const aiCategories = new Set(aiRecs.map((r) => r.category));
  const uniqueDefaults = defaultRecs.filter(
    (r) => !aiCategories.has(r.category)
  );

  // Combine: AI first, then unique defaults
  const combined = [...aiRecs, ...uniqueDefaults];

  // Sort by priority: critical > high > medium > low
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  combined.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  return combined;
}

/**
 * Filter recommendations by priority
 */
export function filterByPriority(
  recommendations: EnhancedRecommendation[],
  priorities: ('critical' | 'high' | 'medium' | 'low')[]
): EnhancedRecommendation[] {
  return recommendations.filter((r) => priorities.includes(r.priority));
}

/**
 * Filter recommendations by effort
 */
export function filterByEffort(
  recommendations: EnhancedRecommendation[],
  efforts: ('quick-win' | 'strategic' | 'long-term')[]
): EnhancedRecommendation[] {
  return recommendations.filter((r) => efforts.includes(r.effort));
}

/**
 * Get quick wins (high impact, low effort)
 */
export function getQuickWins(
  recommendations: EnhancedRecommendation[]
): EnhancedRecommendation[] {
  return recommendations.filter(
    (r) =>
      r.effort === 'quick-win' &&
      (r.priority === 'critical' || r.priority === 'high')
  );
}
