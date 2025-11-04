/**
 * Test Script for AI Schema Generator
 * Tests the new z-ai/glm-4.5-air:free model
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: join(__dirname, '..', '.env') });

const API_KEY = process.env.VITE_OPENROUTER_API_KEY;
const MODEL = process.env.VITE_OPENROUTER_MODEL || 'z-ai/glm-4.5-air:free';

console.log('🧪 Testing AI Schema Generator');
console.log('─────────────────────────────────────');
console.log(`Model: ${MODEL}`);
console.log(`API Key: ${API_KEY ? API_KEY.substring(0, 20) + '...' : 'NOT SET'}`);
console.log('─────────────────────────────────────\n');

if (!API_KEY) {
  console.error('❌ Error: VITE_OPENROUTER_API_KEY not set');
  process.exit(1);
}

// Verify :free suffix is preserved
if (!MODEL.endsWith(':free')) {
  console.warn('⚠️  Warning: Model does not end with :free - this may incur costs!');
  console.warn(`   Current model: ${MODEL}`);
  console.warn('   Expected format: model-name:free\n');
}

async function testSchemaGeneration() {
  const testRequest = {
    url: 'https://example.com',
    contentType: 'article',
    pageContent: {
      title: 'Test Article: GEO Optimization Guide',
      description: 'A comprehensive guide to Generative Engine Optimization',
      author: 'John Doe',
      publishDate: '2025-11-04',
      mainContent: 'This article explains how to optimize content for AI systems...',
    },
  };

  console.log('📝 Generating Article schema...\n');

  const systemPrompt = `You are an elite Schema.org architect specializing in GEO optimization.

EXPERTISE:
- Schema.org ontology (all types and properties)
- JSON-LD formatting and @graph structures
- AI system requirements (ChatGPT, Claude, Gemini, Perplexity)
- Knowledge graph connections (sameAs, relatedTo, about)
- E-E-A-T signals in structured data

TASK:
Generate complete, valid Schema.org JSON-LD markup optimized for AI citation.

REQUIREMENTS:
1. Use correct Schema.org types and properties
2. Include AI-optimized properties (knowsAbout, expertise, hasCredential, isAccessibleForFree)
3. Add knowledge graph connections where possible
4. Use @graph structure for multiple entities
5. Include all relevant properties, no minimal versions

OUTPUT FORMAT (JSON only):
{
  "schemaType": "Article",
  "jsonLd": "Complete JSON-LD string ready to use",
  "htmlSnippet": "<script type=\\"application/ld+json\\">...</script>",
  "aiInsights": ["Insight 1", "Insight 2"],
  "estimatedImpact": {
    "geoScoreIncrease": 10,
    "citationProbabilityIncrease": 25,
    "visibilityImprovement": "High"
  }
}

CRITICAL: Return ONLY valid JSON, no markdown, no explanations.`;

  const userPrompt = `Generate Schema.org markup for this website:

URL: ${testRequest.url}
Content Type: ${testRequest.contentType}

Title: ${testRequest.pageContent.title}
Description: ${testRequest.pageContent.description}
Author: ${testRequest.pageContent.author}
Published: ${testRequest.pageContent.publishDate}

Generate comprehensive ${testRequest.contentType} schema with:
1. All standard properties for this type
2. AI-optimized properties (knowsAbout, expertise, etc.)
3. Knowledge graph connections (sameAs, about)
4. E-E-A-T signals where applicable
5. Structured for maximum AI citation probability

Return ONLY valid JSON matching the output format.`;

  try {
    console.log('🚀 Calling OpenRouter API...\n');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://anoteroslogos.com',
        'X-Title': 'Anóteros Lógos Schema Generator Test',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    console.log('✅ Response received!\n');
    console.log('📊 Usage Stats:');
    console.log(`   Prompt tokens: ${data.usage?.prompt_tokens || 'N/A'}`);
    console.log(`   Completion tokens: ${data.usage?.completion_tokens || 'N/A'}`);
    console.log(`   Total tokens: ${data.usage?.total_tokens || 'N/A'}`);
    console.log(`   Model used: ${data.model || MODEL}\n`);

    const content = data.choices[0].message.content;
    
    // Try to parse as JSON
    let cleaned = content.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```\n?/g, '');
    }

    try {
      const parsed = JSON.parse(cleaned);
      
      console.log('📄 Generated Schema:');
      console.log('─────────────────────────────────────');
      console.log(`Type: ${parsed.schemaType}`);
      console.log(`GEO Score Impact: +${parsed.estimatedImpact?.geoScoreIncrease || 0}`);
      console.log(`Citation Probability: +${parsed.estimatedImpact?.citationProbabilityIncrease || 0}%`);
      console.log(`Visibility: ${parsed.estimatedImpact?.visibilityImprovement || 'N/A'}\n`);
      
      if (parsed.aiInsights && parsed.aiInsights.length > 0) {
        console.log('💡 AI Insights:');
        parsed.aiInsights.forEach((insight, i) => {
          console.log(`   ${i + 1}. ${insight}`);
        });
        console.log('');
      }
      
      console.log('🎯 JSON-LD Schema (preview):');
      console.log(parsed.jsonLd.substring(0, 500) + '...\n');
      
      console.log('✅ Schema generation test PASSED!');
      console.log('─────────────────────────────────────');
      
    } catch (parseError) {
      console.error('❌ Failed to parse response as JSON');
      console.log('\n📝 Raw response:');
      console.log(content.substring(0, 1000));
      throw parseError;
    }

  } catch (error) {
    console.error('\n❌ Test FAILED:');
    console.error(error.message);
    process.exit(1);
  }
}

// Run test
testSchemaGeneration().catch(console.error);
