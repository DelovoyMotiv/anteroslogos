/**
 * Application Startup Validation
 * 
 * Validates environment and configuration before application starts.
 * Fails fast if critical configuration is missing.
 */

import { validateEnv, getEnv } from './envValidator';

/**
 * Run all startup validations
 * @throws {Error} If any validation fails
 */
export function runStartupValidation(): void {
  console.log('[Startup] Running environment validation...');
  
  try {
    // Validate environment variables
    const env = validateEnv();
    
    console.log('[Startup] ✓ Environment variables validated');
    console.log(`[Startup] ✓ Running in ${env.NODE_ENV} mode`);
    
    // Log configuration summary (without secrets)
    logConfigSummary(env);
    
    console.log('[Startup] ✓ All startup validations passed');
  } catch (error) {
    console.error('[Startup] ✗ Startup validation failed:');
    console.error(error);
    
    // Check if we're in Node.js environment
    const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
    const isProduction = typeof import.meta !== 'undefined' 
      ? import.meta.env?.MODE === 'production'
      : (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production');
    
    // In production Node.js, fail fast
    if (isNode && isProduction) {
      console.error('[Startup] Exiting due to configuration errors in production');
      process.exit(1);
    }
    
    // In development or browser, warn but continue
    console.warn('[Startup] Continuing in development mode despite errors');
    console.warn('[Startup] Please fix configuration issues before deploying to production');
  }
}

/**
 * Log configuration summary (without exposing secrets)
 */
function logConfigSummary(env: ReturnType<typeof getEnv>): void {
  const summary = {
    environment: env.NODE_ENV,
    supabase: !!env.VITE_SUPABASE_URL,
    platformWallet: !!env.PLATFORM_WALLET_ADDRESS,
    redis: !!env.REDIS_URL || !!env.VITE_REDIS_URL,
    upstash: !!env.UPSTASH_REDIS_REST_URL,
    stripe: !!env.STRIPE_SECRET_KEY,
    openrouter: !!env.VITE_OPENROUTER_API_KEY,
    agentAID: env.AGENT_AID || 'not configured',
  };
  
  console.log('[Startup] Configuration summary:', JSON.stringify(summary, null, 2));
}

/**
 * Validate that no secrets are hardcoded in the codebase
 * This is a development-time check
 */
export function validateNoHardcodedSecrets(): void {
  // This function is intentionally empty in runtime
  // The actual validation should be done via static analysis tools
  // like ESLint security plugins and Snyk
  
  // In CI/CD, run:
  // - npm audit
  // - snyk test
  // - eslint with security plugins
}
