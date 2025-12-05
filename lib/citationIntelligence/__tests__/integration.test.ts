/**
 * Integration Tests for Citation Intelligence
 * Tests that all components work together correctly
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { citationPredictor } from '../citationPredictor';
import { generateForecasts, explainForecast } from '../forecaster';
import { identifyQuickWins, rankPagesByCitationPotential } from '../quickWinIdentifier';
import { extractFeatures } from '../featureExtractor';
import type { KnowledgeGraph, TemporalData } from '../../../types/citation-intelligence.types';

describe('Citation Intelligence - Integration Tests', () => {
  beforeAll(async () => {
    await citationPredictor.initialize();
  });
  
  it('should complete end-to-end citation prediction workflow', async () => {
    // Sample content
    const content = `
      Artificial Intelligence and Machine Learning are transforming the technology industry.
      According to recent research, AI adoption has increased by 45% in the last year.
      Companies like Google, Microsoft, and OpenAI are leading the innovation.
      Deep learning models have achieved remarkable results in natural language processing.
      The future of AI looks promising with continued advancements in neural networks.
    `;
    
    // Sample knowledge graph
    const knowledgeGraph: KnowledgeGraph = {
      id: 'test-kg',
      domain: 'https://example.com',
      entities: [
        {
          id: 'entity-1',
          name: 'Artificial Intelligence',
          type: 'Concept',
          properties: {},
          mentions: 2,
          firstSeen: new Date(),
          lastSeen: new Date(),
        },
        {
          id: 'entity-2',
          name: 'Google',
          type: 'Organization',
          properties: {},
          mentions: 1,
          firstSeen: new Date(),
          lastSeen: new Date(),
        },
      ],
      relationships: [],
      claims: [
        {
          id: 'claim-1',
          statement: 'AI adoption has increased by 45% in the last year',
          subjectId: 'entity-1',
          predicateId: 'increase',
          objectId: '45%',
          evidence: [
            {
              type: 'data',
              source: 'research',
              confidence: 0.9,
            },
          ],
        },
      ],
      metadata: {
        sourceUrl: 'https://example.com',
        extractedAt: new Date(),
        version: '1.0.0',
      },
    };
    
    // Sample temporal data
    const temporalData: TemporalData[] = [
      {
        timestamp: new Date('2024-01-01'),
        url: 'https://example.com',
        scores: { overall: 50, categories: {}, citationProbability: 50 },
        interventions: [],
        externalFactors: { seasonality: 0.5, competitorActivity: 0.5, algorithmUpdates: [] },
      },
      {
        timestamp: new Date('2024-02-01'),
        url: 'https://example.com',
        scores: { overall: 55, categories: {}, citationProbability: 55 },
        interventions: [],
        externalFactors: { seasonality: 0.5, competitorActivity: 0.5, algorithmUpdates: [] },
      },
    ];
    
    // Step 1: Calculate citation probability
    const citationResult = citationPredictor.calculateProbability(
      content,
      knowledgeGraph,
      temporalData,
      [45, 50, 48]
    );
    
    expect(citationResult.score).toBeGreaterThanOrEqual(0);
    expect(citationResult.score).toBeLessThanOrEqual(100);
    expect(citationResult.factors.length).toBeGreaterThan(0);
    expect(citationResult.quickWins.length).toBeGreaterThan(0);
    
    // Step 2: Generate forecasts
    const forecasts = generateForecasts(citationResult.score, temporalData, []);
    
    expect(forecasts.horizons.length).toBe(3);
    expect(forecasts.citationVelocity).toBeDefined();
    expect(forecasts.seasonalFactors).toBeDefined();
    
    // Step 3: Explain forecast
    const explanation = explainForecast(forecasts, citationResult.score);
    
    expect(explanation.summary).toBeDefined();
    expect(explanation.keyInsights.length).toBeGreaterThan(0);
    expect(explanation.recommendations.length).toBeGreaterThan(0);
    
    // Step 4: Identify quick wins
    const featureVector = extractFeatures(content, knowledgeGraph, temporalData, [45, 50, 48]);
    const quickWinAnalysis = identifyQuickWins(featureVector, citationResult);
    
    expect(quickWinAnalysis.quickWins.length).toBeGreaterThan(0);
    expect(quickWinAnalysis.totalPotentialLift).toBeGreaterThan(0);
    expect(quickWinAnalysis.recommendedSequence.length).toBeGreaterThan(0);
    
    // Step 5: Rank pages
    const pages = [
      {
        url: 'https://example.com/page1',
        currentScore: citationResult.score,
        featureVector,
      },
    ];
    
    const rankedPages = rankPagesByCitationPotential(pages);
    
    expect(rankedPages.length).toBe(1);
    expect(rankedPages[0].potentialLift).toBeGreaterThanOrEqual(0);
    expect(['high', 'medium', 'low']).toContain(rankedPages[0].priority);
  });
  
  it('should handle minimal data gracefully', async () => {
    const content = 'Short content.';
    const knowledgeGraph: KnowledgeGraph = {
      id: 'test',
      domain: 'https://example.com',
      entities: [],
      relationships: [],
      claims: [],
      metadata: {
        sourceUrl: 'https://example.com',
        extractedAt: new Date(),
        version: '1.0.0',
      },
    };
    
    const result = citationPredictor.calculateProbability(content, knowledgeGraph, [], []);
    
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
  
  it('should provide consistent results across multiple calls', async () => {
    const content = 'Test content about AI and machine learning.';
    const knowledgeGraph: KnowledgeGraph = {
      id: 'test',
      domain: 'https://example.com',
      entities: [],
      relationships: [],
      claims: [],
      metadata: {
        sourceUrl: 'https://example.com',
        extractedAt: new Date(),
        version: '1.0.0',
      },
    };
    
    const result1 = citationPredictor.calculateProbability(content, knowledgeGraph, [], []);
    const result2 = citationPredictor.calculateProbability(content, knowledgeGraph, [], []);
    
    expect(result1.score).toBe(result2.score);
  });
});

