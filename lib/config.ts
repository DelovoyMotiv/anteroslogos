/**
 * Centralized Environment Configuration
 * Production-safe validation with fail-fast for missing critical variables
 */

/**
 * Get required environment variable
 * Throws in production if not set
 */
function getRequiredEnv(key: string, description?: string): string {
  // Try both import.meta.env and process.env for compatibility
  const value = (typeof import.meta !== 'undefined' && import.meta.env?.[key]) || 
                (typeof process !== 'undefined' && process.env?.[key]);
  
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `Required environment variable ${key} not set in production.` +
        (description ? ` ${description}` : '')
      );
    }
    console.warn(`⚠️  Missing environment variable: ${key}${description ? ` (${description})` : ''}`);
  }
  
  return value || '';
}

/**
 * Get optional environment variable
 * Returns undefined if not set
 */
function getOptionalEnv(key: string): string | undefined {
  return (typeof import.meta !== 'undefined' && import.meta.env?.[key]) || 
         (typeof process !== 'undefined' && process.env?.[key]);
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
}

// =====================================================
// CONFIGURATION OBJECT
// =====================================================

export const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  isProduction: isProduction(),
  isDevelopment: isDevelopment(),
  
  // Application
  app: {
    url: getOptionalEnv('VITE_APP_URL') || 'https://geoaudit.org',
    name: 'Anoteros Logos GEO Audit',
    version: '2.7.0',
  },
  
  // Supabase (Required in production)
  supabase: {
    url: getRequiredEnv('VITE_SUPABASE_URL', 'Supabase project URL'),
    anonKey: getRequiredEnv('VITE_SUPABASE_ANON_KEY', 'Supabase anonymous key'),
  },
  
  // Redis (Optional, uses in-memory fallback in development)
  redis: {
    url: getOptionalEnv('REDIS_URL'),
  },
  
  // UCPT (Universal Causal Provenance Token)
  ucpt: {
    enabled: getOptionalEnv('UCPT_ENABLED') !== 'false', // Default enabled
    issuerAid: getOptionalEnv('UCPT_ISSUER_AID') || 'aid://geoaudit.org/agent/geo-audit-platform',
    privateKey: getOptionalEnv('UCPT_PRIVATE_KEY'), // Base64-encoded Ed25519 private key (32 bytes)
    publicKey: getOptionalEnv('UCPT_PUBLIC_KEY'), // Base64-encoded Ed25519 public key (32 bytes)
    ttlSeconds: parseInt(getOptionalEnv('UCPT_TTL_SECONDS') || '3600', 10),
    cacheEnabled: getOptionalEnv('UCPT_CACHE_ENABLED') !== 'false', // Default enabled
  },
  
  // OpenAI (Optional for AI-enhanced features)
  openai: {
    apiKey: getOptionalEnv('VITE_OPENAI_API_KEY'),
  },
  
  // Anthropic Claude (Optional)
  anthropic: {
    apiKey: getOptionalEnv('VITE_ANTHROPIC_API_KEY'),
  },
  
  // Perplexity (Optional)
  perplexity: {
    apiKey: getOptionalEnv('VITE_PERPLEXITY_API_KEY'),
  },
  
  // Google Gemini (Optional)
  google: {
    apiKey: getOptionalEnv('VITE_GOOGLE_API_KEY'),
  },
  
  // Contact Form Services (Optional, at least one recommended)
  contact: {
    customEndpoint: getOptionalEnv('VITE_CONTACT_FORM_ENDPOINT'),
    formspreeId: getOptionalEnv('VITE_FORMSPREE_ID'),
    web3formsKey: getOptionalEnv('VITE_WEB3FORMS_KEY'),
  },
  
  // Feature Flags
  features: {
    aiEnhancedAudit: !!getOptionalEnv('VITE_OPENAI_API_KEY'),
    aiSyndication: !!(
      getOptionalEnv('VITE_OPENAI_API_KEY') || 
      getOptionalEnv('VITE_ANTHROPIC_API_KEY')
    ),
    citationTracking: true,
    knowledgeGraph: true,
    competitiveIntelligence: true,
    ucptProvenance: getOptionalEnv('UCPT_ENABLED') !== 'false',
  },
};

// =====================================================
// VALIDATION
// =====================================================

/**
 * Validate configuration on startup
 * Logs warnings for optional features that are disabled
 */
export function validateConfig(): void {
  console.log('🔧 Environment Configuration:');
  console.log(`   Environment: ${config.env}`);
  console.log(`   Supabase: ${config.supabase.url ? '✅' : '❌'}`);
  console.log(`   Redis: ${config.redis.url ? '✅' : '⚠️  In-memory fallback'}`);
  console.log(`   OpenAI: ${config.openai.apiKey ? '✅' : '⚠️  AI features disabled'}`);
  console.log(`   UCPT Provenance: ${config.ucpt.enabled ? '✅' : '⚠️  Disabled'}`);
  console.log(`   UCPT Keys: ${config.ucpt.privateKey && config.ucpt.publicKey ? '✅' : '⚠️  Not configured'}`);
  console.log(`   Contact Form: ${
    config.contact.customEndpoint || config.contact.formspreeId || config.contact.web3formsKey 
      ? '✅' 
      : '⚠️  Not configured'
  }`);
  
  // Production-specific warnings
  if (isProduction()) {
    if (!config.redis.url) {
      console.warn('⚠️  WARNING: Redis not configured in production. Using in-memory storage (not recommended).');
    }
    
    if (!config.contact.customEndpoint && !config.contact.formspreeId && !config.contact.web3formsKey) {
      console.warn('⚠️  WARNING: No contact form service configured in production.');
    }
    
    if (!config.openai.apiKey) {
      console.warn('ℹ️  INFO: AI-enhanced audit features disabled (no OpenAI API key).');
    }
  }
}

/**
 * Export individual getters for backward compatibility
 */
export { getRequiredEnv, getOptionalEnv };
