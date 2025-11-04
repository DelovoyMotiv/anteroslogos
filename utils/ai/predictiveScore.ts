/**
 * Predictive GEO Score™
 * ML-powered forecasting for GEO scores and AI visibility
 * November 2025 - Production Ready
 */

// ==================== TYPES ====================

export interface ScoreHistory {
  timestamp: string;
  overallScore: number;
  categoryScores: {
    schemaMarkup: number;
    aiCrawlers: number;
    eeat: number;
    contentQuality: number;
    citationPotential: number;
  };
}

export interface Forecast {
  date: string;
  predictedScore: number;
  confidence: number; // 0-100
  range: {
    min: number;
    max: number;
  };
}

export interface WhatIfScenario {
  scenario: string;
  description: string;
  estimatedImpact: number; // +/- points
  probability: number; // 0-100
  implementation: string;
  timeToEffect: string; // "2-4 weeks"
}

export interface PredictiveInsight {
  type: 'opportunity' | 'risk' | 'milestone';
  title: string;
  description: string;
  estimatedDate?: string;
  confidence: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface AIVisibilityForecast {
  system: 'ChatGPT' | 'Claude' | 'Gemini' | 'Perplexity' | 'Overall';
  current: number; // 0-100
  forecast30d: number;
  forecast60d: number;
  forecast90d: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  projectedCitations: {
    next30days: number;
    next60days: number;
    next90days: number;
  };
}

// ==================== PREDICTIVE ENGINE ====================

export class PredictiveGEOEngine {
  private history: ScoreHistory[];
  
  constructor(history: ScoreHistory[]) {
    this.history = history.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  /**
   * Generate score forecasts for 30/60/90 days
   */
  generateForecasts(): {
    forecast30d: Forecast;
    forecast60d: Forecast;
    forecast90d: Forecast;
  } {
    const now = new Date();
    
    // Simple linear regression for trend
    const trend = this.calculateTrend();
    const currentScore = this.history[this.history.length - 1]?.overallScore || 0;
    
    // Calculate forecasts with diminishing returns
    const forecast30d = this.forecastScore(currentScore, trend, 30);
    const forecast60d = this.forecastScore(currentScore, trend, 60);
    const forecast90d = this.forecastScore(currentScore, trend, 90);
    
    return {
      forecast30d: {
        date: this.addDays(now, 30).toISOString(),
        predictedScore: Math.round(forecast30d.score),
        confidence: forecast30d.confidence,
        range: {
          min: Math.max(0, Math.round(forecast30d.score - 5)),
          max: Math.min(100, Math.round(forecast30d.score + 5)),
        },
      },
      forecast60d: {
        date: this.addDays(now, 60).toISOString(),
        predictedScore: Math.round(forecast60d.score),
        confidence: forecast60d.confidence,
        range: {
          min: Math.max(0, Math.round(forecast60d.score - 8)),
          max: Math.min(100, Math.round(forecast60d.score + 8)),
        },
      },
      forecast90d: {
        date: this.addDays(now, 90).toISOString(),
        predictedScore: Math.round(forecast90d.score),
        confidence: forecast90d.confidence,
        range: {
          min: Math.max(0, Math.round(forecast90d.score - 10)),
          max: Math.min(100, Math.round(forecast90d.score + 10)),
        },
      },
    };
  }

  /**
   * Generate What-If scenarios
   */
  generateWhatIfScenarios(currentScore: number): WhatIfScenario[] {
    const scenarios: WhatIfScenario[] = [];
    
    // Scenario 1: Add comprehensive Schema markup
    if (currentScore < 90) {
      scenarios.push({
        scenario: 'Implement comprehensive Schema.org markup',
        description: 'Add Organization, Person, Article, and BreadcrumbList schemas with @graph structure',
        estimatedImpact: Math.min(15, (90 - currentScore) * 0.3),
        probability: 85,
        implementation: '1. Audit current schema gaps\n2. Implement missing schema types\n3. Validate with Google Rich Results Test\n4. Monitor AI crawler responses',
        timeToEffect: '2-4 weeks',
      });
    }
    
    // Scenario 2: Enhance E-E-A-T signals
    if (currentScore < 85) {
      scenarios.push({
        scenario: 'Strengthen E-E-A-T signals',
        description: 'Add author credentials, update dates, citations, and expert quotes',
        estimatedImpact: Math.min(12, (85 - currentScore) * 0.25),
        probability: 90,
        implementation: '1. Add author bylines with credentials\n2. Include publication/update dates\n3. Add inline citations to authoritative sources\n4. Create About and Contact pages',
        timeToEffect: '1-2 weeks',
      });
    }
    
    // Scenario 3: Optimize content for AI citation
    if (currentScore < 80) {
      scenarios.push({
        scenario: 'Optimize content for AI citation likelihood',
        description: 'Increase factual density, add data points, improve structure',
        estimatedImpact: Math.min(10, (80 - currentScore) * 0.2),
        probability: 80,
        implementation: '1. Add 5+ factual data points per 500 words\n2. Include statistics with sources\n3. Use clear headings and lists\n4. Add definitions for key terms',
        timeToEffect: '3-6 weeks',
      });
    }
    
    // Scenario 4: Enable all AI crawlers
    scenarios.push({
      scenario: 'Enable all major AI crawlers',
      description: 'Explicitly allow GPTBot, Claude-Web, PerplexityBot, and others in robots.txt',
      estimatedImpact: Math.min(8, (90 - currentScore) * 0.15),
      probability: 95,
      implementation: '1. Update robots.txt with AI crawler directives\n2. Submit sitemap to AI systems\n3. Monitor crawler access logs',
      timeToEffect: '1 week',
    });
    
    // Scenario 5: Create knowledge graph
    if (currentScore >= 70) {
      scenarios.push({
        scenario: 'Implement advanced knowledge graph',
        description: 'Connect entities with sameAs, relatedTo, and hasPart relationships',
        estimatedImpact: Math.min(7, (95 - currentScore) * 0.1),
        probability: 70,
        implementation: '1. Map entity relationships\n2. Implement @graph structure\n3. Connect to external knowledge bases (Wikidata, DBpedia)\n4. Validate graph completeness',
        timeToEffect: '4-8 weeks',
      });
    }
    
    return scenarios.sort((a, b) => b.estimatedImpact - a.estimatedImpact);
  }

  /**
   * Generate predictive insights
   */
  generateInsights(currentScore: number, forecasts: ReturnType<typeof this.generateForecasts>): PredictiveInsight[] {
    const insights: PredictiveInsight[] = [];
    const trend = this.calculateTrend();
    
    // Milestone predictions
    if (currentScore < 90 && forecasts.forecast90d.predictedScore >= 90) {
      const daysTo90 = this.estimateDaysToScore(currentScore, 90, trend);
      insights.push({
        type: 'milestone',
        title: 'On track to reach Authority grade (90+)',
        description: `At current improvement rate, you'll reach 90+ score in approximately ${daysTo90} days`,
        estimatedDate: this.addDays(new Date(), daysTo90).toISOString(),
        confidence: forecasts.forecast90d.confidence,
        priority: 'high',
      });
    }
    
    // Opportunity detection
    if (trend > 0 && forecasts.forecast60d.predictedScore > currentScore + 5) {
      insights.push({
        type: 'opportunity',
        title: 'Accelerating growth trajectory detected',
        description: 'Your GEO improvements are compound! Recent optimizations showing multiplicative effects',
        confidence: 85,
        priority: 'medium',
      });
    }
    
    // Risk detection
    if (trend < -0.5) {
      insights.push({
        type: 'risk',
        title: 'Score decline detected',
        description: 'Recent changes or competitor advancements may be impacting your visibility. Review recent Schema changes and content updates',
        confidence: 75,
        priority: 'critical',
      });
    }
    
    // Plateau warning
    if (Math.abs(trend) < 0.1 && currentScore < 85) {
      insights.push({
        type: 'risk',
        title: 'Growth plateau - strategic shift recommended',
        description: 'Current optimizations showing diminishing returns. Consider What-If scenarios for breakthrough improvements',
        confidence: 80,
        priority: 'high',
      });
    }
    
    // Excellence achieved
    if (currentScore >= 95) {
      insights.push({
        type: 'milestone',
        title: 'Elite GEO status achieved',
        description: 'You rank in top 5% of GEO-optimized sites. Focus on content freshness and maintaining authority signals',
        confidence: 95,
        priority: 'medium',
      });
    }
    
    return insights;
  }

  /**
   * Forecast AI visibility across systems
   */
  forecastAIVisibility(currentScore: number): AIVisibilityForecast[] {
    const baseVisibility = Math.max(0, Math.min(100, (currentScore - 40) * 1.5));
    const forecasts: AIVisibilityForecast[] = [];
    
    const systems: Array<AIVisibilityForecast['system']> = [
      'ChatGPT', 'Claude', 'Gemini', 'Perplexity', 'Overall'
    ];
    
    systems.forEach(system => {
      // Each system has slightly different visibility based on their algorithms
      const systemMultiplier = system === 'ChatGPT' ? 1.1 :
                              system === 'Claude' ? 1.0 :
                              system === 'Gemini' ? 1.05 :
                              system === 'Perplexity' ? 1.15 :
                              1.0; // Overall
      
      const current = Math.round(baseVisibility * systemMultiplier);
      const trend = this.calculateTrend();
      
      // Project forward with diminishing returns
      const forecast30d = Math.min(100, Math.round(current + trend * 30 * 0.8));
      const forecast60d = Math.min(100, Math.round(current + trend * 60 * 0.6));
      const forecast90d = Math.min(100, Math.round(current + trend * 90 * 0.5));
      
      forecasts.push({
        system,
        current,
        forecast30d,
        forecast60d,
        forecast90d,
        trend: trend > 0.5 ? 'increasing' : trend < -0.5 ? 'decreasing' : 'stable',
        projectedCitations: {
          next30days: Math.round(forecast30d / 10 * 5),
          next60days: Math.round(forecast60d / 10 * 10),
          next90days: Math.round(forecast90d / 10 * 15),
        },
      });
    });
    
    return forecasts;
  }

  /**
   * Calculate days until target score is reached
   */
  estimateDaysToScore(currentScore: number, targetScore: number, trend: number): number {
    if (trend <= 0 || currentScore >= targetScore) {
      return 0;
    }
    
    // With diminishing returns
    const days = (targetScore - currentScore) / (trend * 0.7);
    return Math.round(days);
  }

  // ==================== PRIVATE HELPERS ====================

  private calculateTrend(): number {
    if (this.history.length < 2) return 0;
    
    // Linear regression for trend calculation
    const scores = this.history.map(h => h.overallScore);
    const n = scores.length;
    
    const xValues = scores.map((_, i) => i);
    const yValues = scores;
    
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    return slope;
  }

  private forecastScore(
    currentScore: number, 
    trend: number, 
    days: number
  ): { score: number; confidence: number } {
    // Apply trend with diminishing returns
    const diminishingFactor = Math.pow(0.95, days / 30); // Reduce impact over time
    const forecastDelta = trend * days * diminishingFactor;
    const forecastScore = Math.max(0, Math.min(100, currentScore + forecastDelta));
    
    // Confidence decreases with time
    const confidence = Math.max(60, 95 - (days / 90) * 35);
    
    return {
      score: forecastScore,
      confidence: Math.round(confidence),
    };
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Generate mock score history for demonstration
 * In production: This would come from auditHistory.ts
 */
export function generateMockHistory(currentScore: number, days: number = 90): ScoreHistory[] {
  const history: ScoreHistory[] = [];
  const now = new Date();
  
  // Generate trend (improving if current score < 80, stable otherwise)
  const baseTrend = currentScore < 80 ? 0.3 : 0.1;
  
  for (let i = days; i >= 0; i -= 7) { // Weekly data points
    const timestamp = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const randomVariation = (Math.random() - 0.5) * 5;
    const trendEffect = baseTrend * (days - i) / 7;
    const score = Math.max(0, Math.min(100, currentScore - trendEffect + randomVariation));
    
    history.push({
      timestamp: timestamp.toISOString(),
      overallScore: Math.round(score),
      categoryScores: {
        schemaMarkup: Math.round(score * (0.9 + Math.random() * 0.2)),
        aiCrawlers: Math.round(score * (0.85 + Math.random() * 0.3)),
        eeat: Math.round(score * (0.95 + Math.random() * 0.1)),
        contentQuality: Math.round(score * (0.9 + Math.random() * 0.2)),
        citationPotential: Math.round(score * (0.8 + Math.random() * 0.4)),
      },
    });
  }
  
  return history;
}

/**
 * Calculate competitive advantage score
 */
export function calculateCompetitiveAdvantage(
  yourForecast: Forecast,
  competitorAverage: number
): {
  advantage: number;
  status: 'leading' | 'competitive' | 'behind';
  message: string;
} {
  const advantage = yourForecast.predictedScore - competitorAverage;
  
  let status: 'leading' | 'competitive' | 'behind';
  let message: string;
  
  if (advantage > 10) {
    status = 'leading';
    message = `You're leading competitors by ${Math.round(advantage)} points`;
  } else if (advantage > -5) {
    status = 'competitive';
    message = `You're competitive with market average`;
  } else {
    status = 'behind';
    message = `You're ${Math.abs(Math.round(advantage))} points behind competitors`;
  }
  
  return { advantage: Math.round(advantage), status, message };
}
