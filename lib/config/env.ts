/**
 * Environment Configuration
 * Type-safe access to environment variables with validation
 * Supports development, staging, and production environments
 */

interface EnvConfig {
  // Supabase
  supabaseUrl: string;
  supabaseAnonKey: string;
  
  // Auth
  authRedirectUrl: string;
  siteUrl: string;
  
  // Environment
  isDevelopment: boolean;
  isProduction: boolean;
  isStaging: boolean;
  nodeEnv: string;
}

/**
 * Get environment variable with fallback
 */
function getEnv(key: string, fallback?: string): string {
  const value = import.meta.env[key];
  
  if (value === undefined || value === '') {
    if (fallback !== undefined) {
      return fallback;
    }
    console.warn(`Environment variable ${key} is not set`);
    return '';
  }
  
  return value;
}

/**
 * Get required environment variable (throws if not set)
 */
function getRequiredEnv(key: string): string {
  const value = import.meta.env[key];
  
  if (value === undefined || value === '') {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  
  return value;
}

/**
 * Detect current environment
 */
function detectEnvironment(): {
  isDevelopment: boolean;
  isProduction: boolean;
  isStaging: boolean;
  nodeEnv: string;
} {
  const mode = import.meta.env.MODE || 'development';
  const nodeEnv = import.meta.env.NODE_ENV || mode;
  const siteUrl = getEnv('VITE_SITE_URL', '');
  
  // Detect based on URL
  const isProduction = mode === 'production' || 
                      siteUrl.includes('anoteroslogos.com') && !siteUrl.includes('staging');
  const isStaging = siteUrl.includes('staging.anoteroslogos.com');
  const isDevelopment = !isProduction && !isStaging;
  
  return {
    isDevelopment,
    isProduction,
    isStaging,
    nodeEnv,
  };
}

/**
 * Get auth redirect URL based on environment
 */
function getAuthRedirectUrl(): string {
  // Try explicit config first
  const explicitUrl = getEnv('VITE_AUTH_REDIRECT_URL');
  if (explicitUrl) {
    return explicitUrl;
  }
  
  // Fallback: derive from site URL
  const siteUrl = getEnv('VITE_SITE_URL', '');
  if (siteUrl) {
    return `${siteUrl}/auth/callback`;
  }
  
  // Last resort: use current origin
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`;
  }
  
  // SSR fallback
  return 'http://localhost:5173/auth/callback';
}

/**
 * Get site URL based on environment
 */
function getSiteUrl(): string {
  const siteUrl = getEnv('VITE_SITE_URL');
  
  if (siteUrl) {
    return siteUrl;
  }
  
  // Fallback to current origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // SSR fallback
  return 'http://localhost:5173';
}

/**
 * Build and export environment configuration
 */
const env = detectEnvironment();

export const config: EnvConfig = {
  // Supabase (required in production)
  supabaseUrl: env.isProduction 
    ? getRequiredEnv('VITE_SUPABASE_URL')
    : getEnv('VITE_SUPABASE_URL', ''),
  supabaseAnonKey: env.isProduction
    ? getRequiredEnv('VITE_SUPABASE_ANON_KEY')
    : getEnv('VITE_SUPABASE_ANON_KEY', ''),
  
  // Auth
  authRedirectUrl: getAuthRedirectUrl(),
  siteUrl: getSiteUrl(),
  
  // Environment
  ...env,
};

/**
 * Validate configuration on startup
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Production checks
  if (config.isProduction) {
    if (!config.supabaseUrl) {
      errors.push('VITE_SUPABASE_URL is required in production');
    }
    if (!config.supabaseAnonKey) {
      errors.push('VITE_SUPABASE_ANON_KEY is required in production');
    }
    if (!config.siteUrl || config.siteUrl.includes('localhost')) {
      errors.push('VITE_SITE_URL must be production URL');
    }
    if (!config.authRedirectUrl || config.authRedirectUrl.includes('localhost')) {
      errors.push('VITE_AUTH_REDIRECT_URL must be production URL');
    }
  }
  
  // URL validation
  try {
    if (config.supabaseUrl) {
      new URL(config.supabaseUrl);
    }
    if (config.authRedirectUrl) {
      new URL(config.authRedirectUrl);
    }
    if (config.siteUrl) {
      new URL(config.siteUrl);
    }
  } catch (error) {
    errors.push('Invalid URL format in configuration');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Log configuration on startup (development only)
 */
export function logConfig(): void {
  if (!config.isDevelopment) {
    return;
  }
  
  console.group('🔧 Environment Configuration');
  console.log('Environment:', config.nodeEnv);
  console.log('Mode:', config.isProduction ? 'Production' : config.isStaging ? 'Staging' : 'Development');
  console.log('Site URL:', config.siteUrl);
  console.log('Auth Redirect:', config.authRedirectUrl);
  console.log('Supabase URL:', config.supabaseUrl || '(not configured)');
  
  const validation = validateConfig();
  if (!validation.valid) {
    console.warn('⚠️ Configuration warnings:', validation.errors);
  } else {
    console.log('✅ Configuration valid');
  }
  console.groupEnd();
}

/**
 * Get OAuth provider configuration
 */
export function getOAuthProviderConfig(provider: 'google' | 'github' | 'gitlab') {
  return {
    provider,
    redirectTo: config.authRedirectUrl,
    scopes: provider === 'google' 
      ? 'openid profile email'
      : provider === 'github'
      ? 'read:user user:email'
      : 'read_user',
  };
}

/**
 * Environment-specific feature flags
 */
export const features = {
  // Auth features
  emailPasswordAuth: true,
  magicLinkAuth: true,
  oauthGoogle: true,
  oauthGithub: false, // Enable when configured
  oauthGitlab: false, // Enable when configured
  
  // Security features
  rateLimiting: true,
  auditLogging: true,
  emailVerification: !config.isDevelopment, // Skip in dev
  
  // Development tools
  devTools: config.isDevelopment,
  debugMode: config.isDevelopment,
  mockData: false, // NEVER enable in production
};

export default config;
