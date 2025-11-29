/**
 * Basic usage example for @anteroslogos/sdk
 * 
 * Run with: npm install && npx tsx examples/basic-usage.ts
 */

import { AnterosClient, ValidationError, RateLimitError } from '../src/index.js';

async function main() {
  // Initialize client
  const client = new AnterosClient({
    apiKey: process.env.ANTEROS_API_KEY || 'sk_test_example',
  });

  try {
    console.log('=== GEO Audit Example ===');
    const audit = await client.auditURL('https://example.com', {
      depth: 'standard',
      options: {
        includeScreenshots: false,
        platforms: ['perplexity', 'chatgpt'],
      },
    });

    console.log(`Score: ${audit.score}/100`);
    console.log(`Grade: ${audit.grade}`);
    console.log(`Categories:`, audit.categories);
    console.log(`Recommendations: ${audit.recommendations.length}`);

    console.log('\n=== Knowledge Graph Example ===');
    const graph = await client.extractGraph('https://example.com', {
      includeClaims: true,
      maxEntities: 50,
    });

    console.log(`Entities: ${graph.entities.length}`);
    console.log(`Relationships: ${graph.relationships.length}`);
    
    if (graph.entities.length > 0) {
      const firstEntity = graph.entities[0];
      console.log(`First entity: ${firstEntity?.name} (${firstEntity?.type})`);
    }

    console.log('\n=== Citation Prediction Example ===');
    const citation = await client.predictCitation('https://example.com');
    
    console.log(`Overall score: ${(citation.overallScore * 100).toFixed(1)}%`);
    for (const prediction of citation.predictions) {
      console.log(`  ${prediction.platform}: ${(prediction.probability * 100).toFixed(1)}%`);
    }

    console.log('\n=== CCC Balance Example ===');
    const balance = await client.ccc.getBalance();
    
    console.log(`Available: ${balance.available} CCC`);
    console.log(`Staked: ${balance.staked} CCC`);
    if (balance.tier) {
      console.log(`Tier: ${balance.tier}`);
      console.log(`Discount: ${balance.discountPercentage}%`);
    }

    console.log('\n=== Batch Audit Example ===');
    const batch = await client.audit.batch({
      urls: [
        'https://example.com',
        'https://example.org',
      ],
      depth: 'quick',
    });

    console.log(`Batch ID: ${batch.batchId}`);
    console.log(`Completed: ${batch.completed}/${batch.total}`);

  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Validation error:', error.message);
      console.error('Details:', error.errors);
    } else if (error instanceof RateLimitError) {
      console.error(`Rate limited. Retry after ${error.retryAfter}ms`);
    } else {
      console.error('Error:', error);
    }
  }
}

main().catch(console.error);
