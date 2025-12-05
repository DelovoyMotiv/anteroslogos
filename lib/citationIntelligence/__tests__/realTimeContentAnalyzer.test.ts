/**
 * Unit tests for Real-Time Content Analyzer
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeContentRealTime,
  analyzeContentBatch,
  getAnalysisSummary,
} from '../realTimeContentAnalyzer';

describe('Real-Time Content Analyzer', () => {
  describe('analyzeContentRealTime', () => {
    it('should analyze content and return all required metrics', async () => {
      const content = `
        Artificial intelligence is transforming healthcare. According to recent research,
        AI systems can diagnose diseases with 95% accuracy. Studies indicate that machine
        learning algorithms are more effective than traditional methods. Dr. Smith from
        Stanford University demonstrated that deep learning models can detect cancer earlier.
        The technology has been proven to reduce diagnostic errors by 40%.
      `;
      
      const result = await analyzeContentRealTime(content);
      
      // Check all required fields are present
      expect(result).toHaveProperty('semanticDensity');
      expect(result).toHaveProperty('entityPresence');
      expect(result).toHaveProperty('claimStructure');
      expect(result).toHaveProperty('citationPotential');
      expect(result).toHaveProperty('analysisTime');
      
      // Check semantic density is calculated
      expect(result.semanticDensity).toBeGreaterThan(0);
      expect(result.semanticDensity).toBeLessThanOrEqual(100);
      
      // Check entity presence
      expect(result.entityPresence.count).toBeGreaterThan(0);
      expect(result.entityPresence.entities).toBeInstanceOf(Array);
      expect(result.entityPresence.diversity).toBeGreaterThanOrEqual(0);
      expect(result.entityPresence.diversity).toBeLessThanOrEqual(100);
      
      // Check claim structure
      expect(result.claimStructure.totalClaims).toBeGreaterThan(0);
      expect(result.claimStructure.claims).toBeInstanceOf(Array);
      expect(result.claimStructure.evidenceRatio).toBeGreaterThanOrEqual(0);
      expect(result.claimStructure.evidenceRatio).toBeLessThanOrEqual(1);
      
      // Check citation potential
      expect(result.citationPotential).toBeGreaterThan(0);
      expect(result.citationPotential).toBeLessThanOrEqual(100);
      
      // Check analysis time is reasonable (< 2000ms)
      expect(result.analysisTime).toBeLessThan(2000);
    });
    
    it('should handle empty content gracefully', async () => {
      const result = await analyzeContentRealTime('');
      
      expect(result.semanticDensity).toBe(0);
      expect(result.entityPresence.count).toBe(0);
      expect(result.claimStructure.totalClaims).toBe(0);
      expect(result.citationPotential).toBe(0);
    });
    
    it('should detect entities correctly', async () => {
      const content = `
        Apple Inc. announced new products in California. Tim Cook presented the iPhone
        at the event on September 15, 2024. Microsoft and Google also attended.
      `;
      
      const result = await analyzeContentRealTime(content);
      
      // Should detect organizations (Apple, Microsoft, Google)
      // Should detect persons (Tim Cook)
      // Should detect locations (California)
      // Should detect dates (September 15, 2024)
      expect(result.entityPresence.count).toBeGreaterThan(0);
      
      // Check entity diversity (multiple types)
      expect(result.entityPresence.diversity).toBeGreaterThan(0);
    });
    
    it('should detect claims with evidence', async () => {
      const content = `
        Research shows that exercise improves health. According to studies, people who
        exercise regularly live longer. Data shows a 30% reduction in heart disease.
        The findings suggest that even moderate exercise is beneficial.
      `;
      
      const result = await analyzeContentRealTime(content);
      
      // Should detect multiple claims
      expect(result.claimStructure.totalClaims).toBeGreaterThan(0);
      
      // Should have high evidence ratio (all claims have evidence indicators)
      expect(result.claimStructure.evidenceRatio).toBeGreaterThan(0.5);
    });
    
    it('should calculate semantic density based on content quality', async () => {
      const highQualityContent = `
        Quantum computing leverages superposition and entanglement. According to IBM Research,
        quantum processors can solve optimization problems exponentially faster. The technology
        demonstrates significant advantages in cryptography and drug discovery. Studies indicate
        that quantum algorithms outperform classical methods for specific applications.
      `;
      
      const lowQualityContent = `
        This is a simple text. It has few words. Not much information here.
      `;
      
      const highQualityResult = await analyzeContentRealTime(highQualityContent);
      const lowQualityResult = await analyzeContentRealTime(lowQualityContent);
      
      // High quality content should have higher semantic density
      expect(highQualityResult.semanticDensity).toBeGreaterThan(lowQualityResult.semanticDensity);
    });
    
    it('should complete analysis within 2 seconds', async () => {
      const longContent = `
        ${'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(100)}
        According to research, this is a claim. Studies indicate another claim.
        Data shows evidence for this statement. The findings suggest a conclusion.
      `;
      
      const result = await analyzeContentRealTime(longContent);
      
      // Must complete in < 2000ms as per requirements
      expect(result.analysisTime).toBeLessThan(2000);
    });
    
    it('should calculate citation potential correctly', async () => {
      const excellentContent = `
        Artificial intelligence, machine learning, and deep learning are transforming industries.
        According to MIT researchers, AI systems achieve 98% accuracy in image recognition.
        Studies by Stanford University demonstrate that neural networks outperform traditional algorithms.
        Research published in Nature shows that transformer models revolutionize natural language processing.
        Data from Google AI indicates that large language models exhibit emergent capabilities.
        The findings suggest that AI will continue to advance rapidly in the coming years.
      `;
      
      const poorContent = `
        AI is good. It helps people. Many use it.
      `;
      
      const excellentResult = await analyzeContentRealTime(excellentContent);
      const poorResult = await analyzeContentRealTime(poorContent);
      
      // Excellent content should have higher citation potential
      expect(excellentResult.citationPotential).toBeGreaterThan(poorResult.citationPotential);
      expect(excellentResult.citationPotential).toBeGreaterThan(50);
    });
  });
  
  describe('analyzeContentBatch', () => {
    it('should analyze multiple content pieces', async () => {
      const contents = [
        'Research shows that AI improves productivity. According to studies, automation saves time.',
        'Machine learning algorithms can predict outcomes. Data indicates high accuracy rates.',
        'Deep learning models process images effectively. Studies demonstrate superior performance.',
      ];
      
      const results = await analyzeContentBatch(contents);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('semanticDensity');
        expect(result).toHaveProperty('entityPresence');
        expect(result).toHaveProperty('claimStructure');
        expect(result).toHaveProperty('citationPotential');
      });
    });
    
    it('should handle empty batch', async () => {
      const results = await analyzeContentBatch([]);
      expect(results).toHaveLength(0);
    });
  });
  
  describe('getAnalysisSummary', () => {
    it('should calculate summary statistics', async () => {
      const contents = [
        'Research shows AI is effective. Studies indicate 90% accuracy.',
        'Machine learning improves predictions. Data demonstrates clear benefits.',
      ];
      
      const results = await analyzeContentBatch(contents);
      const summary = getAnalysisSummary(results);
      
      expect(summary).toHaveProperty('avgSemanticDensity');
      expect(summary).toHaveProperty('avgEntityCount');
      expect(summary).toHaveProperty('avgClaimCount');
      expect(summary).toHaveProperty('avgCitationPotential');
      expect(summary).toHaveProperty('totalAnalysisTime');
      
      expect(summary.avgSemanticDensity).toBeGreaterThan(0);
      expect(summary.avgEntityCount).toBeGreaterThanOrEqual(0);
      expect(summary.avgClaimCount).toBeGreaterThan(0);
      expect(summary.avgCitationPotential).toBeGreaterThan(0);
      expect(summary.totalAnalysisTime).toBeGreaterThanOrEqual(0);
    });
    
    it('should handle empty results', () => {
      const summary = getAnalysisSummary([]);
      
      expect(summary.avgSemanticDensity).toBe(0);
      expect(summary.avgEntityCount).toBe(0);
      expect(summary.avgClaimCount).toBe(0);
      expect(summary.avgCitationPotential).toBe(0);
      expect(summary.totalAnalysisTime).toBe(0);
    });
  });
});
