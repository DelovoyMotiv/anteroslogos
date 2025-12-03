/**
 * Test Setup for API Integration Tests
 * Loads environment variables and provides test utilities
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local or .env
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

// Ensure required environment variables are set for tests
if (!process.env.SUPABASE_URL) {
  console.warn('Warning: SUPABASE_URL not set. Some tests may be skipped.');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Warning: SUPABASE_SERVICE_ROLE_KEY not set. Some tests may be skipped.');
}

export const hasSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
