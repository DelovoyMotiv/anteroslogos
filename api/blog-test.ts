/**
 * Simple test endpoint to debug blog API issues
 * GET /api/blog-test
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[blog-test] Handler called');
  
  try {
    // Test 1: Basic response
    console.log('[blog-test] Test 1: Basic response');
    
    // Test 2: Check env vars
    console.log('[blog-test] Test 2: Checking env vars');
    const hasSupabaseUrl = !!process.env.SUPABASE_URL;
    const hasSupabaseKey = !!process.env.SUPABASE_ANON_KEY || !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Test 3: Try to import Supabase
    console.log('[blog-test] Test 3: Importing Supabase');
    const { createClient } = await import('@supabase/supabase-js');
    
    // Test 4: Try to create client
    console.log('[blog-test] Test 4: Creating Supabase client');
    if (hasSupabaseUrl && hasSupabaseKey) {
      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
      
      const supabase = createClient(supabaseUrl, supabaseKey);
      console.log('[blog-test] ✅ Client created');
      
      // Test 5: Try simple query
      console.log('[blog-test] Test 5: Querying categories');
      const { data, error } = await supabase
        .from('blog_categories')
        .select('id, name')
        .limit(1);
      
      if (error) {
        console.error('[blog-test] ❌ Query error:', error);
        return res.status(500).json({
          success: false,
          error: 'Query failed',
          details: error
        });
      }
      
      console.log('[blog-test] ✅ Query successful');
      
      return res.status(200).json({
        success: true,
        message: 'All tests passed!',
        tests: {
          basicResponse: true,
          envVars: { hasSupabaseUrl, hasSupabaseKey },
          supabaseImport: true,
          clientCreation: true,
          queryExecution: true,
          dataReturned: data?.length || 0
        },
        data
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Missing env vars',
        envVars: { hasSupabaseUrl, hasSupabaseKey }
      });
    }
  } catch (error) {
    console.error('[blog-test] ❌ Exception:', error);
    return res.status(500).json({
      success: false,
      error: 'Exception occurred',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
