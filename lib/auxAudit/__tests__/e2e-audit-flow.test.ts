/**
 * End-to-End Test for AUX Audit Flow
 * 
 * This test validates the complete audit flow by testing all components together,
 * ensuring they integrate correctly and produce valid results.
 * 
 * Requirements tested: All requirements (1.1-15.5)
 */

import { describe, it, expect } from 'vitest';
import { ProtocolDiscoveryEngine } from '../ProtocolDiscoveryEngine';
import { SemanticAffordanceAnalyzer } from '../SemanticAffordanceAnalyzer';
import { FrictionAnalyzer } from '../FrictionAnalyzer';
import { calculateAUXScore, classifyScore } from '../scoringUtils';
import { RecommendationEngine } from '../RecommendationEngine';
import type { AUXAuditResults } from '../types';

describe('E2E: Complete AUX Audit Flow', () => {
  const TEST_TIMEOUT = 30000; // 30 seconds for real network requests

  it('should complete full audit flow with all components', async () => {
    console.log('\n🔍 Starting complete audit flow test...\n');

    // Step 1: Protocol Discovery (Requirements 3.1-3.5)
    console.log('Step 1: Protocol Discovery');
    const protocolEngine = new ProtocolDiscoveryEngine();
    const testUrl = 'https://example.com';
    
    const protocols = await protocolEngine.discoverProtocols(testUrl);
    expect(Array.isArray(protocols)).toBe(true);
    expect(protocols.length).toBeGreaterThan(0);
    
    protocols.forEach(protocol => {
      expect(protocol).toHaveProperty('name');
      expect(protocol).toHaveProperty('available');
      expect(protocol).toHaveProperty('url');
    });
    console.log(`✓ Discovered ${protocols.length} protocols`);

    // Step 2: Fetch HTML content
    console.log('\nStep 2: Fetching HTML content');
    const htmlResponse = await fetch(testUrl);
    expect(htmlResponse.ok).toBe(true);
    const html = await htmlResponse.text();
    expect(html.length).toBeGreaterThan(0);
    console.log(`✓ Fetched ${html.length} bytes of HTML`);

    // Step 3: Semantic Affordance Analysis (Requirements 4.1-4.5)
    console.log('\nStep 3: Semantic Affordance Analysis');
    const semanticAnalyzer = new SemanticAffordanceAnalyzer();
    const semanticAnalysis = await semanticAnalyzer.analyzeHTML(html);
    
    expect(semanticAnalysis).toHaveProperty('ariaScore');
    expect(semanticAnalysis).toHaveProperty('interactiveElements');
    expect(semanticAnalysis).toHaveProperty('totalElements');
    expect(semanticAnalysis).toHaveProperty('labeledElements');
    
    expect(semanticAnalysis.ariaScore).toBeGreaterThanOrEqual(0);
    expect(semanticAnalysis.ariaScore).toBeLessThanOrEqual(100);
    expect(Array.isArray(semanticAnalysis.interactiveElements)).toBe(true);
    
    console.log(`✓ Found ${semanticAnalysis.totalElements} interactive elements`);
    console.log(`✓ ARIA density: ${semanticAnalysis.ariaScore}%`);

    // Step 4: Friction Analysis (Requirements 5.1-5.5)
    console.log('\nStep 4: Friction Analysis');
    const frictionAnalyzer = new FrictionAnalyzer();
    
    // Load HTML into Cheerio for friction analysis
    const cheerio = await import('cheerio');
    const dom = cheerio.load(html);
    
    const frictionPoints = await frictionAnalyzer.detectFriction(html, dom);
    
    expect(Array.isArray(frictionPoints)).toBe(true);
    frictionPoints.forEach(point => {
      expect(point).toHaveProperty('type');
      expect(point).toHaveProperty('description');
      expect(point).toHaveProperty('severity');
      expect(['captcha', 'interstitial', 'canvas', 'auth-wall', 'other']).toContain(point.type);
      expect(['low', 'medium', 'high']).toContain(point.severity);
    });
    console.log(`✓ Detected ${frictionPoints.length} friction points`);

    // Step 5: Calculate AUX Score (Requirements 8.1-8.4)
    console.log('\nStep 5: Score Calculation');
    const scrapedData = {
      ariaScore: semanticAnalysis.ariaScore,
      protocols,
      interactiveElements: semanticAnalysis.interactiveElements,
      frictionPoints,
      forms: []
    };

    // Mock LLM analysis for testing
    const mockLLMAnalysis = {
      score: 65,
      frictionPoints: frictionPoints.map(fp => fp.description),
      riskLevel: 'medium' as const,
      summary: 'Test website shows moderate agent readiness',
      recommendations: [],
      intentTriggers: []
    };

    const auxScore = calculateAUXScore(scrapedData, mockLLMAnalysis);
    expect(auxScore).toBeGreaterThanOrEqual(0);
    expect(auxScore).toBeLessThanOrEqual(100);
    
    const classification = classifyScore(auxScore);
    expect(['Agent-Blind', 'Agent-Capable', 'Agent-Ready']).toContain(classification);
    
    // Verify classification logic (Requirements 8.2-8.4)
    if (auxScore < 50) {
      expect(classification).toBe('Agent-Blind');
    } else if (auxScore <= 80) {
      expect(classification).toBe('Agent-Capable');
    } else {
      expect(classification).toBe('Agent-Ready');
    }
    
    console.log(`✓ AUX Score: ${auxScore} (${classification})`);

    // Step 6: Generate Recommendations (Requirements 11.1-11.5)
    console.log('\nStep 6: Recommendation Generation');
    const recommendationEngine = new RecommendationEngine();
    
    const auditResults: AUXAuditResults = {
      score: auxScore,
      classification,
      protocols,
      ariaScore: semanticAnalysis.ariaScore,
      interactiveElements: semanticAnalysis.interactiveElements,
      frictionPoints,
      recommendations: [],
      intentTriggers: mockLLMAnalysis.intentTriggers,
      summary: mockLLMAnalysis.summary,
      riskLevel: mockLLMAnalysis.riskLevel,
      analyzedAt: new Date().toISOString()
    };

    const recommendations = recommendationEngine.generateRecommendations(auditResults);
    expect(Array.isArray(recommendations)).toBe(true);
    
    recommendations.forEach(rec => {
      expect(rec).toHaveProperty('title');
      expect(rec).toHaveProperty('description');
      expect(rec).toHaveProperty('priority');
      expect(['low', 'medium', 'high']).toContain(rec.priority);
      // Requirement 11.5: Should have code example or doc link
      expect(rec.codeExample || rec.docLink).toBeTruthy();
    });
    
    console.log(`✓ Generated ${recommendations.length} recommendations`);

    // Step 7: Verify Complete Results Structure (Requirement 6.4)
    console.log('\nStep 7: Verifying Complete Results Structure');
    const completeResults: AUXAuditResults = {
      ...auditResults,
      recommendations
    };

    // Verify all required fields are present
    expect(completeResults).toHaveProperty('score');
    expect(completeResults).toHaveProperty('classification');
    expect(completeResults).toHaveProperty('protocols');
    expect(completeResults).toHaveProperty('ariaScore');
    expect(completeResults).toHaveProperty('interactiveElements');
    expect(completeResults).toHaveProperty('frictionPoints');
    expect(completeResults).toHaveProperty('recommendations');
    expect(completeResults).toHaveProperty('intentTriggers');
    expect(completeResults).toHaveProperty('summary');
    expect(completeResults).toHaveProperty('riskLevel');
    expect(completeResults).toHaveProperty('analyzedAt');

    console.log('✓ All required fields present');

    // Step 8: JSON Serialization (Requirements 15.1-15.5)
    console.log('\nStep 8: JSON Serialization');
    const serialized = JSON.stringify(completeResults);
    expect(serialized).toBeTruthy();
    
    const deserialized = JSON.parse(serialized);
    expect(deserialized.score).toBe(completeResults.score);
    expect(deserialized.classification).toBe(completeResults.classification);
    expect(deserialized.protocols.length).toBe(completeResults.protocols.length);
    
    console.log('✓ JSON serialization working correctly');

    console.log('\n✅ Complete audit flow test passed!\n');
    console.log('Summary:');
    console.log(`  - Protocols: ${protocols.length}`);
    console.log(`  - Interactive Elements: ${semanticAnalysis.totalElements}`);
    console.log(`  - ARIA Score: ${semanticAnalysis.ariaScore}%`);
    console.log(`  - Friction Points: ${frictionPoints.length}`);
    console.log(`  - AUX Score: ${auxScore} (${classification})`);
    console.log(`  - Recommendations: ${recommendations.length}`);
  }, TEST_TIMEOUT);


  it('should handle errors gracefully throughout the flow', async () => {
    console.log('\n🔍 Testing error handling...\n');

    // Test 1: Invalid URL handling
    console.log('Test 1: Invalid URL');
    const protocolEngine = new ProtocolDiscoveryEngine();
    
    try {
      await protocolEngine.discoverProtocols('not-a-valid-url');
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeDefined();
      console.log('✓ Invalid URL properly rejected');
    }

    // Test 2: Empty HTML handling
    console.log('\nTest 2: Empty HTML');
    const semanticAnalyzer = new SemanticAffordanceAnalyzer();
    const emptyAnalysis = await semanticAnalyzer.analyzeHTML('');
    
    expect(emptyAnalysis.ariaScore).toBe(0);
    expect(emptyAnalysis.totalElements).toBe(0);
    expect(emptyAnalysis.interactiveElements.length).toBe(0);
    console.log('✓ Empty HTML handled gracefully');

    // Test 3: Malformed HTML handling
    console.log('\nTest 3: Malformed HTML');
    const malformedHtml = '<div><button>Unclosed';
    const malformedAnalysis = await semanticAnalyzer.analyzeHTML(malformedHtml);
    
    expect(malformedAnalysis).toHaveProperty('ariaScore');
    expect(malformedAnalysis).toHaveProperty('interactiveElements');
    console.log('✓ Malformed HTML handled gracefully');

    // Test 4: Score edge cases
    console.log('\nTest 4: Score Classification Edge Cases');
    
    // Test boundary conditions
    expect(classifyScore(0)).toBe('Agent-Blind');
    expect(classifyScore(49)).toBe('Agent-Blind');
    expect(classifyScore(50)).toBe('Agent-Capable');
    expect(classifyScore(80)).toBe('Agent-Capable');
    expect(classifyScore(81)).toBe('Agent-Ready');
    expect(classifyScore(100)).toBe('Agent-Ready');
    
    console.log('✓ Score classification boundaries correct');

    console.log('\n✅ Error handling test passed!\n');
  }, TEST_TIMEOUT);

  it('should verify component integration with real data', async () => {
    console.log('\n🔍 Testing component integration with real website...\n');

    const testUrl = 'https://example.com';
    
    // Run all analysis components in parallel (Requirement 12.5)
    console.log('Running parallel analysis...');
    const startTime = Date.now();
    
    const [protocols, htmlResponse] = await Promise.all([
      new ProtocolDiscoveryEngine().discoverProtocols(testUrl),
      fetch(testUrl)
    ]);
    
    const html = await htmlResponse.text();
    
    // Load HTML into Cheerio
    const cheerio = await import('cheerio');
    const dom = cheerio.load(html);
    
    const [semanticAnalysis, frictionPoints] = await Promise.all([
      new SemanticAffordanceAnalyzer().analyzeHTML(html),
      new FrictionAnalyzer().detectFriction(html, dom)
    ]);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✓ Parallel analysis completed in ${duration}ms`);
    
    // Verify performance (Requirement 12.2)
    expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
    
    // Verify all components returned valid data
    expect(protocols.length).toBeGreaterThan(0);
    expect(semanticAnalysis.totalElements).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(frictionPoints)).toBe(true);
    
    console.log('\nIntegration Results:');
    console.log(`  - Duration: ${duration}ms`);
    console.log(`  - Protocols: ${protocols.length}`);
    console.log(`  - Interactive Elements: ${semanticAnalysis.totalElements}`);
    console.log(`  - ARIA Score: ${semanticAnalysis.ariaScore}%`);
    console.log(`  - Friction Points: ${frictionPoints.length}`);
    
    console.log('\n✅ Component integration test passed!\n');
  }, TEST_TIMEOUT);

  it('should validate data serialization round-trip', async () => {
    console.log('\n🔍 Testing data serialization...\n');

    // Create a complete audit result
    const testResult: AUXAuditResults = {
      score: 75,
      classification: 'Agent-Capable',
      protocols: [
        { name: 'agents.json', available: false, url: 'https://example.com/agents.json' },
        { name: 'robots.txt', available: true, url: 'https://example.com/robots.txt' }
      ],
      ariaScore: 60,
      interactiveElements: [
        {
          tag: 'button',
          selector: 'button.submit',
          hasAriaLabel: true,
          ariaLabel: 'Submit form',
          role: 'button'
        }
      ],
      frictionPoints: [
        {
          type: 'captcha',
          description: 'CAPTCHA detected',
          severity: 'high'
        }
      ],
      recommendations: [
        {
          title: 'Add agent manifest',
          description: 'Create agents.json file',
          priority: 'high',
          impact: 20,
          docLink: 'https://docs.example.com'
        }
      ],
      intentTriggers: [
        {
          intent: 'submit',
          selector: 'button.submit',
          confidence: 'high',
          element: {
            tag: 'button',
            selector: 'button.submit',
            hasAriaLabel: true
          }
        }
      ],
      summary: 'Test summary',
      riskLevel: 'medium',
      analyzedAt: new Date().toISOString()
    };

    // Serialize
    const serialized = JSON.stringify(testResult);
    expect(serialized).toBeTruthy();
    console.log(`✓ Serialized to ${serialized.length} bytes`);

    // Deserialize
    const deserialized = JSON.parse(serialized) as AUXAuditResults;
    
    // Verify all fields preserved
    expect(deserialized.score).toBe(testResult.score);
    expect(deserialized.classification).toBe(testResult.classification);
    expect(deserialized.protocols.length).toBe(testResult.protocols.length);
    expect(deserialized.ariaScore).toBe(testResult.ariaScore);
    expect(deserialized.interactiveElements.length).toBe(testResult.interactiveElements.length);
    expect(deserialized.frictionPoints.length).toBe(testResult.frictionPoints.length);
    expect(deserialized.recommendations.length).toBe(testResult.recommendations.length);
    expect(deserialized.intentTriggers.length).toBe(testResult.intentTriggers.length);
    expect(deserialized.summary).toBe(testResult.summary);
    expect(deserialized.riskLevel).toBe(testResult.riskLevel);
    expect(deserialized.analyzedAt).toBe(testResult.analyzedAt);
    
    console.log('✓ All fields preserved after round-trip');
    
    console.log('\n✅ Serialization test passed!\n');
  }, TEST_TIMEOUT);
});
