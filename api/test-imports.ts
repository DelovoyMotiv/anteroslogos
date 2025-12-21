/**
 * Test imports endpoint
 * Tests if our modules can be imported in serverless environment
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    console.log('[test-imports] Starting import tests');
    
    res.setHeader('Content-Type', 'application/json');
    
    const results: any = {
      success: true,
      imports: {},
    };

    // Test 1: Import openRouterClient
    try {
      const { createSimpleOpenRouterClient } = await import('../lib/agentManifest/openRouterClient');
      results.imports.openRouterClient = 'OK';
      console.log('[test-imports] openRouterClient imported');
    } catch (error) {
      results.imports.openRouterClient = error instanceof Error ? error.message : String(error);
      results.success = false;
    }

    // Test 2: Import prompts
    try {
      const { buildSystemPrompt } = await import('../lib/agentManifest/prompts');
      results.imports.prompts = 'OK';
      console.log('[test-imports] prompts imported');
    } catch (error) {
      results.imports.prompts = error instanceof Error ? error.message : String(error);
      results.success = false;
    }

    // Test 3: Import validator
    try {
      const { validateManifest } = await import('../lib/agentManifest/validator');
      results.imports.validator = 'OK';
      console.log('[test-imports] validator imported');
    } catch (error) {
      results.imports.validator = error instanceof Error ? error.message : String(error);
      results.success = false;
    }

    // Test 4: Import urlUtils
    try {
      const { validateManifestUrl } = await import('../lib/agentManifest/urlUtils');
      results.imports.urlUtils = 'OK';
      console.log('[test-imports] urlUtils imported');
    } catch (error) {
      results.imports.urlUtils = error instanceof Error ? error.message : String(error);
      results.success = false;
    }

    // Test 5: Import generator
    try {
      const { generateManifest } = await import('../lib/agentManifest/generator');
      results.imports.generator = 'OK';
      console.log('[test-imports] generator imported');
    } catch (error) {
      results.imports.generator = error instanceof Error ? error.message : String(error);
      results.success = false;
    }

    res.status(200).json(results);

  } catch (error) {
    console.error('[test-imports] Fatal error:', error);
    res.status(500).json({
      success: false,
      error: 'Fatal error during import tests',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
