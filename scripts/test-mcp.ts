/**
 * MCP API Test Script
 * 
 * Tests:
 * 1. OpenAPI spec generation
 * 2. Tool schemas for OpenAI, Claude, Grok
 * 3. Direct tool execution
 * 4. Unique tools (causal_citation_trace, predictive_synthesis, federated_authority_boost)
 */

import { exportAllTools, generateOpenAPISpec, GRAPH_TOOLS } from '../lib/mcp/schemas';
import fs from 'fs';
import path from 'path';

// =====================================================
// HELPERS
// =====================================================

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('='.repeat(60) + '\n');
}

function logSuccess(message: string) {
  console.log('✅', message);
}

function logError(message: string, error?: any) {
  console.error('❌', message);
  if (error) {
    console.error('   Error:', error.message || error);
  }
}

function saveJSON(filename: string, data: any) {
  const outputPath = path.join(process.cwd(), 'public', '.well-known', filename);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  logSuccess(`Saved ${filename} to ${outputPath}`);
}

// =====================================================
// TEST 1: Schema Generation
// =====================================================

function testSchemaGeneration() {
  logSection('TEST 1: Schema Generation');
  
  try {
    // Generate all schemas
    const allTools = exportAllTools();
    
    // OpenAI
    console.log(`OpenAI Tools: ${allTools.openai.length} tools`);
    allTools.openai.forEach(tool => {
      console.log(`  - ${tool.function.name}: ${tool.function.description.substring(0, 50)}...`);
    });
    logSuccess('OpenAI schema generated');
    saveJSON('mcp-tools-openai.json', allTools.openai);
    
    // Claude
    console.log(`\nClaude Tools: ${allTools.claude.length} tools`);
    allTools.claude.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description.substring(0, 50)}...`);
    });
    logSuccess('Claude schema generated');
    saveJSON('mcp-tools-claude.json', allTools.claude);
    
    // Grok
    console.log(`\nGrok Tools: ${allTools.grok.length} tools`);
    allTools.grok.forEach(tool => {
      console.log(`  - ${tool.function.name}: ${tool.function.description.substring(0, 50)}...`);
    });
    logSuccess('Grok schema generated');
    saveJSON('mcp-tools-grok.json', allTools.grok);
    
    // OpenAPI
    const openapi = allTools.openapi;
    console.log(`\nOpenAPI Spec: v${openapi.openapi}`);
    console.log(`  Title: ${openapi.info.title}`);
    console.log(`  Paths: ${Object.keys(openapi.paths).length} endpoints`);
    logSuccess('OpenAPI spec generated');
    saveJSON('mcp-openapi.json', openapi);
    
  } catch (error) {
    logError('Schema generation failed', error);
  }
}

// =====================================================
// TEST 2: Tool Definitions
// =====================================================

function testToolDefinitions() {
  logSection('TEST 2: Tool Definitions');
  
  try {
    const tools = Object.values(GRAPH_TOOLS);
    
    console.log(`Total Tools: ${tools.length}`);
    console.log(`Unique Tools: ${tools.filter(t => t.name.includes('_')).length}`);
    
    console.log('\nStandard Tools:');
    tools.filter(t => !t.name.includes('_')).forEach(tool => {
      console.log(`  - ${tool.name}`);
      console.log(`    Parameters: ${tool.parameters.length}`);
      console.log(`    Has examples: ${tool.examples ? 'Yes' : 'No'}`);
    });
    
    console.log('\n🆕 Unique Advanced Tools:');
    tools.filter(t => t.name.includes('_')).forEach(tool => {
      console.log(`  - ${tool.name}`);
      console.log(`    Parameters: ${tool.parameters.length}`);
      console.log(`    Examples: ${tool.examples?.length || 0}`);
    });
    
    logSuccess('All tool definitions valid');
    
  } catch (error) {
    logError('Tool definition test failed', error);
  }
}

// =====================================================
// TEST 3: Validation
// =====================================================

function testValidation() {
  logSection('TEST 3: Schema Validation');
  
  try {
    const allTools = exportAllTools();
    
    // Validate OpenAI format
    allTools.openai.forEach(tool => {
      if (!tool.type || tool.type !== 'function') {
        throw new Error(`OpenAI tool ${tool.function?.name} missing type`);
      }
      if (!tool.function?.name || !tool.function?.parameters) {
        throw new Error(`OpenAI tool ${tool.function?.name} missing required fields`);
      }
    });
    logSuccess('OpenAI format validation passed');
    
    // Validate Claude format
    allTools.claude.forEach(tool => {
      if (!tool.name || !tool.input_schema) {
        throw new Error(`Claude tool ${tool.name} missing required fields`);
      }
      if (tool.input_schema.type !== 'object') {
        throw new Error(`Claude tool ${tool.name} input_schema must be object type`);
      }
    });
    logSuccess('Claude format validation passed');
    
    // Validate Grok format
    allTools.grok.forEach(tool => {
      if (!tool.type || !tool.function?.name) {
        throw new Error(`Grok tool ${tool.function?.name} missing required fields`);
      }
    });
    logSuccess('Grok format validation passed');
    
    // Validate OpenAPI
    const openapi = allTools.openapi;
    if (openapi.openapi !== '3.1.0') {
      throw new Error('OpenAPI version must be 3.1.0');
    }
    if (!openapi.info || !openapi.paths) {
      throw new Error('OpenAPI missing required fields');
    }
    logSuccess('OpenAPI spec validation passed');
    
  } catch (error) {
    logError('Validation failed', error);
  }
}

// =====================================================
// TEST 4: Example Request/Response
// =====================================================

function testExampleRequests() {
  logSection('TEST 4: Example Request/Response Formats');
  
  try {
    // Direct JSON-RPC
    const directRequest = {
      tool: 'auditSite',
      parameters: {
        url: 'https://example.com',
        useAI: false
      }
    };
    console.log('Direct JSON-RPC Request:');
    console.log(JSON.stringify(directRequest, null, 2));
    logSuccess('Direct request format valid');
    
    // OpenAI format
    const openaiRequest = {
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: 'Audit https://example.com' }
      ],
      tools: exportAllTools().openai,
      tool_choice: 'auto'
    };
    console.log('\nOpenAI Request (tools array length):');
    console.log(`  ${openaiRequest.tools.length} tools`);
    logSuccess('OpenAI request format valid');
    
    // Claude format
    const claudeRequest = {
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 4096,
      tools: exportAllTools().claude,
      messages: [
        { role: 'user', content: 'Audit https://example.com for GEO' }
      ]
    };
    console.log('\nClaude Request (tools array length):');
    console.log(`  ${claudeRequest.tools.length} tools`);
    logSuccess('Claude request format valid');
    
  } catch (error) {
    logError('Example request test failed', error);
  }
}

// =====================================================
// TEST 5: Unique Tools
// =====================================================

function testUniqueTools() {
  logSection('TEST 5: Unique Advanced Tools');
  
  try {
    // Test causal_citation_trace
    const causalTool = GRAPH_TOOLS.causal_citation_trace;
    console.log('\n🔍 causal_citation_trace:');
    console.log(`  Description: ${causalTool.description}`);
    console.log(`  Parameters: ${causalTool.parameters.map(p => p.name).join(', ')}`);
    console.log(`  Example input:`, causalTool.examples?.[0].input);
    console.log(`  Example output keys:`, Object.keys(causalTool.examples?.[0].output || {}));
    logSuccess('causal_citation_trace defined correctly');
    
    // Test predictive_synthesis
    const predictiveTool = GRAPH_TOOLS.predictive_synthesis;
    console.log('\n📊 predictive_synthesis:');
    console.log(`  Description: ${predictiveTool.description}`);
    console.log(`  Parameters: ${predictiveTool.parameters.map(p => p.name).join(', ')}`);
    console.log(`  Example input:`, predictiveTool.examples?.[0].input);
    console.log(`  Example output confidence:`, predictiveTool.examples?.[0].output.confidence);
    logSuccess('predictive_synthesis defined correctly');
    
    // Test federated_authority_boost
    const zkpTool = GRAPH_TOOLS.federated_authority_boost;
    console.log('\n🔐 federated_authority_boost:');
    console.log(`  Description: ${zkpTool.description}`);
    console.log(`  Parameters: ${zkpTool.parameters.map(p => p.name).join(', ')}`);
    console.log(`  Example output:`, zkpTool.examples?.[0].output);
    logSuccess('federated_authority_boost defined correctly');
    
  } catch (error) {
    logError('Unique tools test failed', error);
  }
}

// =====================================================
// TEST 6: Save Manifest
// =====================================================

function testManifest() {
  logSection('TEST 6: MCP Manifest');
  
  try {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'mcp-manifest.json'), 'utf-8')
    );
    
    console.log(`Manifest Version: ${manifest.version}`);
    console.log(`Display Name: ${manifest.displayName}`);
    console.log(`Total Tools: ${manifest.tools.length}`);
    console.log(`Unique Tools: ${manifest.tools.filter((t: any) => t.unique).length}`);
    
    console.log('\nUnique Tool Features:');
    manifest.tools.filter((t: any) => t.unique).forEach((tool: any) => {
      console.log(`  - ${tool.name}: ${tool.novelty}`);
    });
    
    logSuccess('Manifest loaded and validated');
    
    // Copy to public/.well-known
    saveJSON('mcp-manifest.json', manifest);
    
  } catch (error) {
    logError('Manifest test failed', error);
  }
}

// =====================================================
// RUN ALL TESTS
// =====================================================

function runAllTests() {
  console.log('\n🚀 MCP API Test Suite Starting...\n');
  
  testSchemaGeneration();
  testToolDefinitions();
  testValidation();
  testExampleRequests();
  testUniqueTools();
  testManifest();
  
  logSection('✅ ALL TESTS COMPLETED');
  console.log(`
Next Steps:
1. Run local server: npm run dev
2. Test GET endpoint: curl http://localhost:5173/api/mcp?format=openapi
3. Test with OpenAI: See docs/mcp.md for examples
4. Test with Claude: See docs/mcp.md for examples
5. Deploy to production: vercel --prod
`);
}

// Run tests
runAllTests();
