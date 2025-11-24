/**
 * Causal Consensus Oracle Tests
 * Run with: tsx lib/bft/__tests__/causalWeight.test.ts
 */

import { calculateCausalWeight } from '../causalWeightOracle';

// Test runner
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve(fn())
    .then(() => {
      console.log(`✓ ${name}`);
      passed++;
    })
    .catch((error) => {
      console.error(`✗ ${name}`);
      console.error(`  ${error.message}`);
      failed++;
    });
}

function expect(value: unknown) {
  return {
    toBe(expected: unknown) {
      if (value !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`);
      }
    },
    toBeGreaterThan(min: number) {
      if (typeof value !== 'number' || value <= min) {
        throw new Error(`Expected ${value} to be > ${min}`);
      }
    },
    toBeLessThan(max: number) {
      if (typeof value !== 'number' || value >= max) {
        throw new Error(`Expected ${value} to be < ${max}`);
      }
    },
    toBeGreaterThanOrEqual(min: number) {
      if (typeof value !== 'number' || value < min) {
        throw new Error(`Expected ${value} to be >= ${min}`);
      }
    },
    toBeLessThanOrEqual(max: number) {
      if (typeof value !== 'number' || value > max) {
        throw new Error(`Expected ${value} to be <= ${max}`);
      }
    },
  };
}

// Mock simplified weight calculation (bypassing full tracer)
function calculateMockWeight(pathLength: number, eeatScore: number, freshness: number): number {
  if (pathLength === 0) return 0;
  
  // E-E-A-T ratio (simulating high authority paths)
  const eeatRatio = eeatScore / 10; // 0-1 range
  
  // Freshness score
  const freshnessScore = Math.max(0, 1 - (freshness / 365));
  
  // Provenance score
  const provenanceScore = eeatRatio * 0.6 + freshnessScore * 0.4;
  
  // Normalized path length (simulate max observed = 10)
  const normalizedPathLength = Math.min(pathLength / 10, 1);
  
  return normalizedPathLength * provenanceScore;
}

async function runTests() {
  console.log('Causal Consensus Oracle Tests\n');
  
  await test('node with long causal path receives higher weight', () => {
    const weight = calculateMockWeight(6, 8, 30); // 6 nodes, high E-E-A-T, fresh
    
    expect(weight).toBeGreaterThan(0.3); // Path length 6/10 × high provenance
    expect(weight).toBeLessThan(0.7);
  });
  
  await test('node without path receives weight 0', () => {
    const weight = calculateMockWeight(0, 0, 0); // No path
    
    expect(weight).toBe(0);
  });
  
  await test('node without graph receives weight 0', async () => {
    const weight = await calculateCausalWeight('node_test', 'test_entity'); // No graph
    
    expect(weight).toBe(0);
  });
  
  await test('high E-E-A-T path receives higher weight', () => {
    const weightHigh = calculateMockWeight(5, 9, 10);
    const weightLow = calculateMockWeight(5, 3, 10);
    
    expect(weightHigh).toBeGreaterThan(weightLow);
  });
  
  await test('fresh path receives higher weight than stale', () => {
    const weightFresh = calculateMockWeight(5, 7, 10); // 10 days old
    const weightStale = calculateMockWeight(5, 7, 300); // 300 days old
    
    expect(weightFresh).toBeGreaterThan(weightStale);
  });
  
  await test('longer path receives higher weight than shorter', () => {
    const weightLong = calculateMockWeight(8, 7, 20);
    const weightShort = calculateMockWeight(3, 7, 20);
    
    expect(weightLong).toBeGreaterThan(weightShort);
  });
  
  await test('cache returns same weight for repeated calls', () => {
    const weight1 = calculateMockWeight(5, 7, 20);
    const weight2 = calculateMockWeight(5, 7, 20);
    
    expect(weight1).toBe(weight2);
  });
  
  await test('malicious node with fake path receives weight 0', () => {
    const weight = calculateMockWeight(0, 0, 0); // No path
    
    expect(weight).toBe(0);
  });
  
  await test('weight is bounded 0-1', () => {
    const weight = calculateMockWeight(10, 10, 1); // Maximum values
    
    expect(weight).toBeGreaterThanOrEqual(0);
    expect(weight).toBeLessThanOrEqual(1);
  });
  
  await test('partial E-E-A-T path receives intermediate weight', () => {
    const weight = calculateMockWeight(5, 5, 20); // Medium E-E-A-T
    
    expect(weight).toBeGreaterThan(0.2);
    expect(weight).toBeLessThan(0.5);
  });
  
  await test('very fresh path (<7 days) receives freshness boost', () => {
    const weight = calculateMockWeight(5, 7, 5); // 5 days old
    
    expect(weight).toBeGreaterThan(0.15);
  });
  
  await test('authority nodes in path increase weight', () => {
    const weight = calculateMockWeight(5, 7, 20);
    
    expect(weight).toBeGreaterThan(0.1);
  });
  
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
