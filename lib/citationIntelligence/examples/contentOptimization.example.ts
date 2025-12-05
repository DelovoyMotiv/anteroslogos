/**
 * Content Optimization Example
 * Demonstrates how to use the Content Optimizer to generate citation-optimized variations
 * 
 * @example
 * ```bash
 * # Run this example
 * npx tsx lib/citationIntelligence/examples/contentOptimization.example.ts
 * ```
 */

import { contentOptimizer } from '../contentOptimizer';
import type { KnowledgeGraph, OptimizationConstraints } from '../../../types/citation-intelligence.types';

/**
 * Example: Generate content variations
 */
async function generateContentVariationsExample() {
  console.log('='.repeat(80));
  console.log('Content Optimization Example');
  console.log('='.repeat(80));
  console.log();
  
  // Initialize the optimizer
  console.log('Initializing content optimizer...');
  await contentOptimizer.initialize();
  console.log('✓ Optimizer initialized');
  console.log();
  
  // Sample content to optimize
  const originalContent = `
Generative Engine Optimization (GEO) is the practice of optimizing content 
to increase its visibility in AI-generated responses. As AI systems like 
ChatGPT and Claude become primary information sources, traditional SEO 
strategies need to evolve.

GEO focuses on creating content that AI systems can easily understand, 
cite, and reference. This includes structured data, clear entity 
relationships, and authoritative claims backed by evidence.
  `.trim();
  
  console.log('Original Content:');
  console.log('-'.repeat(80));
  console.log(originalContent);
  console.log();
  
  // Sample knowledge graph
  const knowledgeGraph: KnowledgeGraph = {
    entities: [
      {
        id: 'e1',
        name: 'Generative Engine Optimization',
        type: 'Concept',
        properties: { description: 'SEO for AI systems' },
        mentions: 8,
        firstSeen: new Date('2024-01-01'),
        lastSeen: new Date('2024-12-01'),
      },
      {
        id: 'e2',
        name: 'ChatGPT',
        type: 'Product',
        properties: { vendor: 'OpenAI' },
        mentions: 5,
        firstSeen: new Date('2024-01-01'),
        lastSeen: new Date('2024-12-01'),
      },
      {
        id: 'e3',
        name: 'Claude',
        type: 'Product',
        properties: { vendor: 'Anthropic' },
        mentions: 4,
        firstSeen: new Date('2024-01-01'),
        lastSeen: new Date('2024-12-01'),
      },
    ],
    relationships: [
      {
        id: 'r1',
        sourceId: 'e1',
        targetId: 'e2',
        type: 'applies_to',
        properties: {},
        strength: 0.9,
        confidence: 0.85,
      },
    ],
    claims: [
      {
        id: 'c1',
        statement: 'GEO optimizes content for AI citation',
        subjectId: 'e1',
        predicateId: 'optimizes',
        objectId: 'content',
        evidence: [
          {
            type: 'citation',
            source: 'Research paper',
            confidence: 0.9,
          },
        ],
      },
    ],
    metadata: {
      sourceUrl: 'https://example.com/geo-guide',
      extractedAt: new Date(),
      version: '1.0',
    },
  };
  
  // Optimization constraints
  const constraints: OptimizationConstraints = {
    preserveFactualAccuracy: true,
    maintainEEAT: true,
    maxLengthIncrease: 30,
    targetAudience: 'technical',
  };
  
  console.log('Generating 3 optimized variations...');
  console.log();
  
  try {
    const variations = await contentOptimizer.generateVariations(
      originalContent,
      knowledgeGraph,
      80, // target score
      constraints
    );
    
    console.log(`✓ Generated ${variations.length} variations`);
    console.log();
    
    // Display each variation
    variations.forEach((variation, index) => {
      console.log('='.repeat(80));
      console.log(`Variation ${index + 1} (ID: ${variation.id})`);
      console.log('='.repeat(80));
      console.log();
      
      console.log(`Predicted Citation Score: ${variation.predictedScore.toFixed(2)}/100`);
      console.log();
      
      console.log('Improvements:');
      console.log(`  • Semantic Density: ${variation.improvements.semanticDensity.toFixed(1)}%`);
      console.log(`  • Entity Count: ${variation.improvements.entityCount.toFixed(1)}%`);
      console.log(`  • Claim Strength: ${variation.improvements.claimStrength.toFixed(1)}%`);
      console.log();
      
      console.log('Changes Made:');
      variation.changes.forEach((change, i) => {
        console.log(`  ${i + 1}. [${change.type}] ${change.location}: ${change.description}`);
      });
      console.log();
      
      console.log('Optimized Content:');
      console.log('-'.repeat(80));
      console.log(variation.content);
      console.log();
      
      console.log('Implementation Guidance:');
      console.log('  Structural Recommendations:');
      variation.implementation.structural.slice(0, 3).forEach((rec, i) => {
        console.log(`    ${i + 1}. ${rec}`);
      });
      console.log();
      
      console.log('  Schema Markup:');
      const schema = variation.implementation.schema as any;
      console.log(`    Type: ${schema?.['@type'] || 'N/A'}`);
      console.log(`    Entities: ${schema?.mentions?.length || 0} mentioned`);
      console.log();
    });
    
    console.log('='.repeat(80));
    console.log('Summary');
    console.log('='.repeat(80));
    console.log();
    console.log(`Best Variation: ${variations[0].id} (Score: ${variations[0].predictedScore.toFixed(2)})`);
    console.log(`Average Improvement: ${(
      (variations[0].improvements.semanticDensity +
       variations[0].improvements.entityCount +
       variations[0].improvements.claimStrength) / 3
    ).toFixed(1)}%`);
    console.log();
    
  } catch (error) {
    console.error('Error generating variations:', error);
    console.log();
    console.log('Note: This example requires VITE_OPENROUTER_API_KEY to be set.');
    console.log('Set it in your .env file or environment variables.');
  }
}

/**
 * Example: Enhance semantic density
 */
async function enhanceSemanticDensityExample() {
  console.log('='.repeat(80));
  console.log('Semantic Density Enhancement Example');
  console.log('='.repeat(80));
  console.log();
  
  await contentOptimizer.initialize();
  
  const content = 'Machine learning is a subset of artificial intelligence.';
  
  console.log('Original:');
  console.log(content);
  console.log();
  
  try {
    const enhanced = await contentOptimizer.enhanceSemanticDensity(content);
    
    console.log('Enhanced:');
    console.log(enhanced);
    console.log();
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example: Validate factual accuracy
 */
async function validateFactualAccuracyExample() {
  console.log('='.repeat(80));
  console.log('Factual Accuracy Validation Example');
  console.log('='.repeat(80));
  console.log();
  
  await contentOptimizer.initialize();
  
  // Original content with facts
  const original = `
Generative Engine Optimization (GEO) was introduced in 2024 by researchers at Stanford University. 
The study included 1,234 participants and achieved 95% accuracy in predicting AI citations.
Dr. Jane Smith stated "GEO represents a paradigm shift in content optimization."
Published on January 15, 2024, the research has been cited by ChatGPT and Claude.
  `.trim();
  
  console.log('Original Content:');
  console.log('-'.repeat(80));
  console.log(original);
  console.log();
  
  // Test Case 1: Content with preserved facts
  const preservedFacts = `
Generative Engine Optimization (GEO) was introduced in 2024 by researchers at Stanford University. 
The comprehensive study included 1,234 participants and achieved an impressive 95% accuracy in predicting AI citations.
Dr. Jane Smith, a leading expert in the field, stated "GEO represents a paradigm shift in content optimization."
Published on January 15, 2024, the groundbreaking research has been cited by ChatGPT and Claude.
  `.trim();
  
  console.log('Test Case 1: Content with Preserved Facts');
  console.log('-'.repeat(80));
  const validation1 = contentOptimizer.validateFactualAccuracy(original, preservedFacts);
  console.log(`Valid: ${validation1.isValid ? '✓' : '✗'}`);
  console.log(`Accuracy Score: ${(validation1.factualAccuracyScore * 100).toFixed(1)}%`);
  console.log(`Discrepancies: ${validation1.discrepancies.length}`);
  console.log(`E-E-A-T Signals Present: ${validation1.eeAtSignals.present.join(', ') || 'none'}`);
  console.log(`E-E-A-T Signals Missing: ${validation1.eeAtSignals.missing.join(', ') || 'none'}`);
  console.log();
  
  // Test Case 2: Content with removed numbers
  const removedNumbers = `
Generative Engine Optimization (GEO) was introduced recently by researchers at Stanford University. 
The study included many participants and achieved high accuracy in predicting AI citations.
Dr. Jane Smith stated "GEO represents a paradigm shift in content optimization."
Published recently, the research has been cited by ChatGPT and Claude.
  `.trim();
  
  console.log('Test Case 2: Content with Removed Numbers and Dates');
  console.log('-'.repeat(80));
  const validation2 = contentOptimizer.validateFactualAccuracy(original, removedNumbers);
  console.log(`Valid: ${validation2.isValid ? '✓' : '✗'}`);
  console.log(`Accuracy Score: ${(validation2.factualAccuracyScore * 100).toFixed(1)}%`);
  console.log(`Discrepancies: ${validation2.discrepancies.length}`);
  if (validation2.discrepancies.length > 0) {
    console.log('Discrepancy Details:');
    validation2.discrepancies.forEach(d => {
      console.log(`  • ${d.type} (${d.severity}): "${d.original}" -> "${d.optimized}"`);
    });
  }
  console.log();
  
  // Test Case 3: Content with removed entities and quotes
  const removedEntities = `
A new optimization technique was introduced recently by researchers. 
The study included many participants and achieved high accuracy.
An expert stated that this represents a paradigm shift.
Published recently, the research has been cited by AI systems.
  `.trim();
  
  console.log('Test Case 3: Content with Removed Entities and Quotes');
  console.log('-'.repeat(80));
  const validation3 = contentOptimizer.validateFactualAccuracy(original, removedEntities);
  console.log(`Valid: ${validation3.isValid ? '✓' : '✗'}`);
  console.log(`Accuracy Score: ${(validation3.factualAccuracyScore * 100).toFixed(1)}%`);
  console.log(`Discrepancies: ${validation3.discrepancies.length}`);
  if (validation3.discrepancies.length > 0) {
    console.log('Discrepancy Details:');
    validation3.discrepancies.forEach(d => {
      console.log(`  • ${d.type} (${d.severity}): "${d.original}" -> "${d.optimized}"`);
    });
  }
  console.log(`E-E-A-T Signals Missing: ${validation3.eeAtSignals.missing.join(', ') || 'none'}`);
  console.log();
  
  console.log('='.repeat(80));
  console.log('Summary');
  console.log('='.repeat(80));
  console.log();
  console.log('The factual accuracy validator:');
  console.log('  ✓ Extracts entities, numbers, dates, and quotes from content');
  console.log('  ✓ Compares facts between original and optimized versions');
  console.log('  ✓ Flags discrepancies with severity levels (critical/warning)');
  console.log('  ✓ Calculates an accuracy score (0-1)');
  console.log('  ✓ Checks for E-E-A-T signals (author, credentials, citations, dates)');
  console.log();
}

// Run examples
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    await generateContentVariationsExample();
    console.log();
    await enhanceSemanticDensityExample();
    console.log();
    await validateFactualAccuracyExample();
  })();
}

export {
  generateContentVariationsExample,
  enhanceSemanticDensityExample,
  validateFactualAccuracyExample,
};
