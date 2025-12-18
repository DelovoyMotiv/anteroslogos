/**
 * Environment Variable Validation Module
 * 
 * Validates all required environment variables at application startup
 * to fail-fast if configuration is incomplete.
 * 
 * **Property 54: Environment Variable Validation**
 * **Validates: Requirements 2.1, 10.1**
 */

import { z } from 'zod';

// Define schema for all environment variables
const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Supabase Configuration (Required)
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL must be a valid URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'VITE_SUPABASE_ANON_KEY is required'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL').optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL').optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // Site Configuration
  VITE_SITE_URL: z.string().url('VITE_SITE_URL must be a valid URL').optional().default('https://anoteroslogos.com'),
  VITE_SITE_NAME: z.string().default('Anóteros Lógos'),
  VITE_SITE_DESCRIPTION: z.string().default('Generative Engine Optimization Agency'),
  VITE_AUTH_REDIRECT_URL: z.string().url('VITE_AUTH_REDIRECT_URL must be a valid URL').optional().default('https://anoteroslogos.com/auth/callback'),

  // Platform Wallet (Required for payments)
  PLATFORM_WALLET_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'PLATFORM_WALLET_ADDRESS must be a valid Ethereum address').optional(),

  // Blockchain RPC URLs
  BASE_RPC_URL: z.string().url().default('https://mainnet.base.org'),
  BASE_RPC_URL_BACKUP: z.string().url().optional(),
  BASE_SEPOLIA_RPC_URL: z.string().url().optional(),
  ALCHEMY_BASE_URL: z.string().url().optional(),
  INFURA_BASE_URL: z.string().url().optional(),
  QUICKNODE_BASE_URL: z.string().url().optional(),

  // USDC Token Addresses (with defaults)
  USDC_BASE_MAINNET: z.string().regex(/^0x[a-fA-F0-9]{40}$/).default('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'),
  USDC_BASE_SEPOLIA: z.string().regex(/^0x[a-fA-F0-9]{40}$/).default('0x036CbD53842c5426634e7929541eC2318f3dCF7e'),

  // Blockchain Deployment
  DEPLOYER_PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  BASESCAN_API_KEY: z.string().optional(),
  REPUTATION_SLASHING_ADDRESS_SEPOLIA: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  REPUTATION_SLASHING_ADDRESS_MAINNET: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),

  // Consensus Configuration
  HOTSTUFF_VIEW_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).default('30000'),
  HOTSTUFF_F: z.string().regex(/^\d+$/).transform(Number).default('2'),
  MIN_STAKE: z.string().regex(/^\d+$/).transform(Number).default('100'),
  SLASH_PERCENTAGE: z.string().regex(/^\d+$/).transform(Number).default('50'),

  // Stripe Configuration (Optional - for Pro/Agency plans)
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
  STRIPE_PRICE_PRO: z.string().startsWith('price_').optional(),
  STRIPE_PRICE_AGENCY: z.string().startsWith('price_').optional(),
  VITE_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_').optional(),

  // Webhook Configuration (Optional - for webhook receivers)
  WEBHOOK_SECRET: z.string().min(16, 'WEBHOOK_SECRET must be at least 16 characters').optional(),

  // Redis Configuration (Optional - falls back to in-memory)
  REDIS_URL: z.string().url().optional(),
  VITE_REDIS_URL: z.string().url().optional(),

  // Upstash Redis (Required for Provenance Cascade)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Agent Identity
  AGENT_AID: z.string().regex(/^aid:\/\/[a-zA-Z0-9.-]+\/[a-zA-Z0-9-]+$/).optional(),

  // AI Configuration
  VITE_OPENROUTER_API_KEY: z.string().optional().refine(
    (val) => !val || val.startsWith('sk-or-'),
    { message: 'VITE_OPENROUTER_API_KEY must start with "sk-or-" if provided' }
  ),
  VITE_OPENROUTER_MODEL: z.string().default('meta-llama/llama-3.2-3b-instruct:free'),

  // Multi-Model Configuration for Citation Intelligence
  VITE_OPENROUTER_MODEL_CONTENT_OPT: z.string().default('anthropic/claude-sonnet-4.5'),
  VITE_OPENROUTER_MODEL_FACT_CHECK: z.string().default('openai/gpt-5.1'),
  VITE_OPENROUTER_MODEL_SCHEMA: z.string().default('google/gemini-3-pro-preview'),
  VITE_OPENROUTER_MODEL_ANALYSIS: z.string().default('x-ai/grok-4'),
  VITE_OPENROUTER_RATE_LIMIT_RPM: z.string().regex(/^\d+$/, 'VITE_OPENROUTER_RATE_LIMIT_RPM must be a positive integer').transform(Number).default('10'),
  VITE_OPENROUTER_BUDGET_LIMIT: z.string().regex(/^\d+(\.\d+)?$/, 'VITE_OPENROUTER_BUDGET_LIMIT must be a positive number').transform(Number).default('100'),
  VITE_OPENROUTER_ALERT_THRESHOLD: z.string().regex(/^\d+(\.\d+)?$/, 'VITE_OPENROUTER_ALERT_THRESHOLD must be a number between 0 and 100').transform(Number).refine(
    (val) => val >= 0 && val <= 100,
    { message: 'VITE_OPENROUTER_ALERT_THRESHOLD must be between 0 and 100' }
  ).default('80'),

  // Contact Form (Optional)
  VITE_CONTACT_FORM_ENDPOINT: z.string().url().optional(),
  VITE_FORMSPREE_ID: z.string().optional(),
  VITE_WEB3FORMS_KEY: z.string().optional(),

  // Analytics (Optional)
  VITE_GA_TRACKING_ID: z.string().optional(),
  VITE_GTM_ID: z.string().optional(),

  // Feature Flags (Optional)
  VITE_ENABLE_ANALYTICS: z.string().transform(val => val === 'true').optional(),
  VITE_MAINTENANCE_MODE: z.string().transform(val => val === 'true').optional(),

  // CRON Configuration
  CRON_SECRET: z.string().min(32, 'CRON_SECRET must be at least 32 characters').optional(),

  // Wallet Encryption
  WALLET_ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/, 'WALLET_ENCRYPTION_KEY must be 32-byte hex').optional(),

  // UAP Configuration
  UAP_HTTP2_PORT: z.string().regex(/^\d+$/).transform(Number).optional(),
  UAP_WS_PORT: z.string().regex(/^\d+$/).transform(Number).optional(),
  UAP_ENABLE: z.string().transform(val => val !== 'false').optional(),
  UAP_SERVER_DID: z.string().optional(),

  // Gas Reporting
  REPORT_GAS: z.string().transform(val => val === 'true').optional(),
  COINMARKETCAP_API_KEY: z.string().optional(),
});

export type ValidatedEnv = z.infer<typeof envSchema>;

/**
 * Get environment variables from both import.meta.env (Vite) and process.env (Node)
 */
function getEnvironment(): Record<string, string | undefined> {
  // In browser (Vite), use import.meta.env
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env as Record<string, string | undefined>;
  }
  
  // In Node.js, use process.env
  if (typeof process !== 'undefined' && process.env) {
    return process.env;
  }
  
  // Fallback to empty object
  return {};
}

/**
 * Validates environment variables at startup
 * @throws {Error} If required variables are missing or invalid
 */
export function validateEnv(): ValidatedEnv {
  try {
    const env = envSchema.parse(getEnvironment());
    
    // Additional validation for production environment
    if (env.NODE_ENV === 'production') {
      validateProductionEnv(env);
    }
    
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => {
        const path = err.path.join('.');
        return `  - ${path}: ${err.message}`;
      }).join('\n');
      
      throw new Error(
        `Environment variable validation failed:\n${missingVars}\n\n` +
        `Please check your .env file and ensure all required variables are set.`
      );
    }
    throw error;
  }
}

/**
 * Additional validation for production environment
 */
function validateProductionEnv(env: ValidatedEnv): void {
  const requiredInProduction = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'PLATFORM_WALLET_ADDRESS',
    'CRON_SECRET',
  ];

  const missing = requiredInProduction.filter(key => !env[key as keyof ValidatedEnv]);
  
  if (missing.length > 0) {
    throw new Error(
      `Production environment requires the following variables:\n` +
      missing.map(key => `  - ${key}`).join('\n') +
      `\n\nThese variables are critical for production operation.`
    );
  }

  // Validate that secrets are not using example/placeholder values
  const placeholderPatterns = [
    /your[-_]?.*[-_]?(key|secret|token|id)/i,
    /placeholder/i,
    /example/i,
    /test/i,
    /xxx/i,
  ];

  const secretKeys = [
    'VITE_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY',
    'VITE_OPENROUTER_API_KEY',
    'CRON_SECRET',
  ];

  for (const key of secretKeys) {
    const value = env[key as keyof ValidatedEnv];
    if (value && typeof value === 'string') {
      for (const pattern of placeholderPatterns) {
        if (pattern.test(value)) {
          throw new Error(
            `${key} appears to contain a placeholder value in production.\n` +
            `Please set a real value for this secret.`
          );
        }
      }
    }
  }
}

/**
 * Get validated environment variables
 * Caches the result after first validation
 */
let cachedEnv: ValidatedEnv | null = null;

export function getEnv(): ValidatedEnv {
  if (!cachedEnv) {
    cachedEnv = validateEnv();
  }
  return cachedEnv;
}

/**
 * Clear cached environment (for testing)
 */
export function clearEnvCache(): void {
  cachedEnv = null;
}

/**
 * Check if a specific environment variable is set
 */
export function hasEnv(key: keyof ValidatedEnv): boolean {
  const env = getEnv();
  return env[key] !== undefined && env[key] !== null && env[key] !== '';
}

/**
 * Get environment variable with type safety
 */
export function getEnvVar<K extends keyof ValidatedEnv>(
  key: K,
  defaultValue?: ValidatedEnv[K]
): ValidatedEnv[K] {
  const env = getEnv();
  const value = env[key];
  
  if (value === undefined || value === null || value === '') {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is not set and no default provided`);
  }
  
  return value;
}
