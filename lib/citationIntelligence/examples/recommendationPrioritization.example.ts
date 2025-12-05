/**
 * Example: Recommendation Prioritization System
 * 
 * This example demonstrates how to:
 * 1. Calculate causal impact for interventions
 * 2. Prioritize recommendations based on proven effects
 * 3. Filter by statistical significance
 * 4. Display recommendations with confidence intervals
 */

import {
  calculateCausalImpact,
  prioritizeRecommendations,
  calculateCausalImpactsByType,
  formatRecommendationWithCausalImpact,
  generateRecommendationSummary,
} from '../recommendationPrioritizer';
import type {
  Intervention,
  OutcomeData,
  StrategyRecommendation,
  TimeSeriesData,
} from '../../../types/citation-intelligence.types';

// ============================================================================
// Example 1: Calculate Causal Impact for a Single Intervention
// ============================================================================

console.log('='.repeat(80));
console.log('Example 1: Calculate Causal Impact for a Single Intervention');
console.log('='.repeat(80));

// Define an intervention
const intervention: Intervention = {
  id: 'int-001',
  type: 'content_optimization',
  description: 'Added structured data and improved semantic density',
  implementedAt: new Date('2024-02-01'),
  url: 'https://example.com/blog/ai-trends',
  metadata: {
    changes: ['Added JSON-LD schema', 'Increased entity mentions', 'Improved readability'],
  },
  status: 'implemented',
};

// Historical data before intervention (January 2024)
const beforeData: TimeSeriesData[] = [
  { timestamp: new Date('2024-01-01'), value: 45 },
  { timestamp: new Date('2024-01-08'), value: 47 },
  { timestamp: new Date('2024-01-15'), value: 46 },
  { timestamp: new Date('2024-01-22'), value: 48 },
  { timestamp: new Date('2024-01-29'), value: 47 },
];

// Data after intervention (February 2024)
const afterData: TimeSeriesData[] = [
  { timestamp: new Date('2024-02-05'), value: 58 },
  { timestamp: new Date('2024-02-12'), value: 60 },
  { timestamp: new Date('2024-02-19'), value: 59 },
  { timestamp: new Date('2024-02-26'), value: 61 },
];

// Control group data (similar page without intervention)
const controlData: TimeSeriesData[] = [
  { timestamp: new Date('2024-01-01'), value: 44 },
  { timestamp: new Date('2024-01-08'), value: 45 },
  { timestamp: new Date('2024-01-15'), value: 44 },
  { timestamp: new Date('2024-01-22'), value: 46 },
  { timestamp: new Date('2024-01-29'), value: 45 },
  { timestamp: new Date('2024-02-05'), value: 46 },
  { timestamp: new Date('2024-02-12'), value: 47 },
  { timestamp: new Date('2024-02-19'), value: 46 },
  { timestamp: new Date('2024-02-26'), value: 48 },
];

const outcomeData: OutcomeData = {
  interventionId: intervention.id,
  metric: 'citationProbability',
  before: beforeData,
  after: afterData,
  control: controlData,
};

// Calculate causal impact
const causalImpact = calculateCausalImpact(intervention, outcomeData);

console.log('\nIntervention:', intervention.description);
console.log('\nCausal Impact Results:');
console.log('  Effect:', causalImpact.effect, 'points');
console.log('  95% Confidence Interval: [', causalImpact.confidence.lower, ',', causalImpact.confidence.upper, ']');
console.log('  P-value:', causalImpact.pValue);
console.log('  Statistically Significant:', causalImpact.significance ? 'Yes (p < 0.05)' : 'No');
console.log('  Counterfactual (what would have happened):', causalImpact.counterfactual.slice(0, 3), '...');

// ============================================================================
// Example 2: Calculate Causal Impacts by Intervention Type
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('Example 2: Calculate Causal Impacts by Intervention Type');
console.log('='.repeat(80));

// Multiple interventions of different types
const interventions: Intervention[] = [
  {
    id: 'int-001',
    type: 'content_optimization',
    description: 'Improved content quality on page A',
    implementedAt: new Date('2024-02-01'),
    url: 'https://example.com/page-a',
    metadata: {},
    status: 'implemented',
  },
  {
    id: 'int-002',
    type: 'content_optimization',
    description: 'Improved content quality on page B',
    implementedAt: new Date('2024-02-05'),
    url: 'https://example.com/page-b',
    metadata: {},
    status: 'implemented',
  },
  {
    id: 'int-003',
    type: 'schema_markup',
    description: 'Added JSON-LD schema to page C',
    implementedAt: new Date('2024-02-10'),
    url: 'https://example.com/page-c',
    metadata: {},
    status: 'implemented',
  },
  {
    id: 'int-004',
    type: 'entity_building',
    description: 'Built entity relationships on page D',
    implementedAt: new Date('2024-02-15'),
    url: 'https://example.com/page-d',
    metadata: {},
    status: 'implemented',
  },
];

// Outcome data for each intervention
const outcomes = new Map<string, OutcomeData>([
  [
    'int-001',
    {
      interventionId: 'int-001',
      metric: 'citationProbability',
      before: [
        { timestamp: new Date('2024-01-15'), value: 50 },
        { timestamp: new Date('2024-01-22'), value: 52 },
        { timestamp: new Date('2024-01-29'), value: 51 },
      ],
      after: [
        { timestamp: new Date('2024-02-05'), value: 62 },
        { timestamp: new Date('2024-02-12'), value: 64 },
        { timestamp: new Date('2024-02-19'), value: 63 },
      ],
    },
  ],
  [
    'int-002',
    {
      interventionId: 'int-002',
      metric: 'citationProbability',
      before: [
        { timestamp: new Date('2024-01-20'), value: 48 },
        { timestamp: new Date('2024-01-27'), value: 49 },
        { timestamp: new Date('2024-02-03'), value: 48 },
      ],
      after: [
        { timestamp: new Date('2024-02-10'), value: 58 },
        { timestamp: new Date('2024-02-17'), value: 60 },
        { timestamp: new Date('2024-02-24'), value: 59 },
      ],
    },
  ],
  [
    'int-003',
    {
      interventionId: 'int-003',
      metric: 'citationProbability',
      before: [
        { timestamp: new Date('2024-01-25'), value: 55 },
        { timestamp: new Date('2024-02-01'), value: 56 },
        { timestamp: new Date('2024-02-08'), value: 55 },
      ],
      after: [
        { timestamp: new Date('2024-02-15'), value: 70 },
        { timestamp: new Date('2024-02-22'), value: 72 },
        { timestamp: new Date('2024-02-29'), value: 71 },
      ],
    },
  ],
  [
    'int-004',
    {
      interventionId: 'int-004',
      metric: 'citationProbability',
      before: [
        { timestamp: new Date('2024-02-01'), value: 52 },
        { timestamp: new Date('2024-02-08'), value: 53 },
        { timestamp: new Date('2024-02-15'), value: 52 },
      ],
      after: [
        { timestamp: new Date('2024-02-20'), value: 60 },
        { timestamp: new Date('2024-02-27'), value: 62 },
        { timestamp: new Date('2024-03-05'), value: 61 },
      ],
    },
  ],
]);

// Calculate causal impacts by type
const impactsByType = calculateCausalImpactsByType(interventions, outcomes);

console.log('\nCausal Impacts by Intervention Type:');
for (const [type, impact] of impactsByType.entries()) {
  console.log(`\n${type}:`);
  console.log('  Average Effect:', impact.effect, 'points');
  console.log('  95% CI: [', impact.confidence.lower, ',', impact.confidence.upper, ']');
  console.log('  P-value:', impact.pValue);
  console.log('  Significant:', impact.significance ? 'Yes' : 'No');
}

// ============================================================================
// Example 3: Prioritize Recommendations Based on Causal Impact
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('Example 3: Prioritize Recommendations Based on Causal Impact');
console.log('='.repeat(80));

// Initial recommendations (before causal analysis)
const recommendations: StrategyRecommendation[] = [
  {
    id: 'rec-001',
    title: 'Optimize Content Quality',
    description: 'Improve semantic density and add more entity mentions',
    category: 'content',
    type: 'content_optimization',
    priority: 'medium',
    expectedImpact: {
      citationLift: 5, // Initial estimate
      confidence: { lower: 3, upper: 7 },
    },
    effort: {
      level: 'medium',
      estimatedHours: 8,
    },
    implementation: {
      steps: [
        'Analyze current content quality',
        'Identify entity gaps',
        'Rewrite sections with low semantic density',
        'Add structured claims with evidence',
      ],
      resources: ['Content writer', 'SEO specialist'],
      dependencies: [],
    },
  },
  {
    id: 'rec-002',
    title: 'Add JSON-LD Schema Markup',
    description: 'Implement comprehensive structured data',
    category: 'schema',
    type: 'schema_markup',
    priority: 'high',
    expectedImpact: {
      citationLift: 10, // Initial estimate
      confidence: { lower: 8, upper: 12 },
    },
    effort: {
      level: 'low',
      estimatedHours: 4,
    },
    implementation: {
      steps: [
        'Extract entities from knowledge graph',
        'Generate JSON-LD schema',
        'Validate against Schema.org',
        'Deploy to production',
      ],
      resources: ['Technical SEO specialist'],
      dependencies: ['Knowledge graph extraction'],
    },
  },
  {
    id: 'rec-003',
    title: 'Build Entity Relationships',
    description: 'Establish connections between entities in content',
    category: 'entity',
    type: 'entity_building',
    priority: 'medium',
    expectedImpact: {
      citationLift: 7, // Initial estimate
      confidence: { lower: 5, upper: 9 },
    },
    effort: {
      level: 'high',
      estimatedHours: 16,
    },
    implementation: {
      steps: [
        'Identify key entities',
        'Research entity relationships',
        'Create content linking entities',
        'Update knowledge graph',
      ],
      resources: ['Content strategist', 'Domain expert'],
      dependencies: ['Entity authority analysis'],
    },
  },
  {
    id: 'rec-004',
    title: 'Improve Technical SEO',
    description: 'Optimize page speed and mobile experience',
    category: 'technical',
    type: 'technical_optimization',
    priority: 'low',
    expectedImpact: {
      citationLift: 3, // Initial estimate
      confidence: { lower: 1, upper: 5 },
    },
    effort: {
      level: 'medium',
      estimatedHours: 12,
    },
    implementation: {
      steps: [
        'Audit page speed',
        'Optimize images',
        'Implement lazy loading',
        'Improve mobile responsiveness',
      ],
      resources: ['Frontend developer'],
      dependencies: [],
    },
  },
];

// Prioritize with causal impact data (filter significant only)
const prioritizedSignificant = prioritizeRecommendations(
  recommendations,
  impactsByType,
  true // Filter by significance
);

console.log('\nPrioritized Recommendations (Significant Only):');
console.log('Total:', prioritizedSignificant.length, 'recommendations\n');

prioritizedSignificant.forEach((rec, index) => {
  const formatted = formatRecommendationWithCausalImpact(rec);
  console.log(`${index + 1}. ${formatted.title}`);
  console.log('   Expected Lift:', formatted.expectedLift);
  console.log('   Confidence:', formatted.confidence);
  console.log('   Significance:', formatted.significance);
  console.log('   Effort:', formatted.effort);
  console.log('   Priority:', formatted.priority);
  console.log();
});

// Prioritize without filtering (show all)
const prioritizedAll = prioritizeRecommendations(
  recommendations,
  impactsByType,
  false // Don't filter
);

console.log('\nAll Recommendations (Ranked by Impact):');
console.log('Total:', prioritizedAll.length, 'recommendations\n');

prioritizedAll.forEach((rec, index) => {
  const formatted = formatRecommendationWithCausalImpact(rec);
  console.log(`${index + 1}. ${formatted.title}`);
  console.log('   Expected Lift:', formatted.expectedLift);
  console.log('   Significance:', formatted.significance);
  console.log();
});

// ============================================================================
// Example 4: Generate Summary Statistics
// ============================================================================

console.log('='.repeat(80));
console.log('Example 4: Generate Summary Statistics');
console.log('='.repeat(80));

const summary = generateRecommendationSummary(prioritizedAll);

console.log('\nRecommendation Summary:');
console.log('  Total Recommendations:', summary.totalRecommendations);
console.log('  Statistically Significant:', summary.significantRecommendations);
console.log('  Average Expected Lift:', summary.averageExpectedLift, 'points');
console.log('  Total Expected Lift:', summary.totalExpectedLift, 'points');
console.log('  High Priority Count:', summary.highPriorityCount);
console.log('  Low Effort Count:', summary.lowEffortCount);

console.log('\n' + '='.repeat(80));
console.log('Key Insights:');
console.log('='.repeat(80));

if (summary.significantRecommendations > 0) {
  console.log(`\n✓ ${summary.significantRecommendations} recommendations have proven causal impact (p < 0.05)`);
  console.log(`✓ Implementing all significant recommendations could increase citation probability by ${summary.totalExpectedLift} points`);
  
  if (summary.lowEffortCount > 0) {
    console.log(`✓ ${summary.lowEffortCount} recommendations are low-effort quick wins`);
  }
  
  console.log('\nRecommended Action Plan:');
  console.log('1. Start with low-effort, high-impact recommendations');
  console.log('2. Focus on statistically significant interventions');
  console.log('3. Monitor results and update causal impact estimates');
  console.log('4. Iterate based on actual outcomes');
} else {
  console.log('\n⚠ No recommendations have statistically significant causal impact yet');
  console.log('  Recommendation: Collect more data or implement test interventions');
}

console.log('\n' + '='.repeat(80));
