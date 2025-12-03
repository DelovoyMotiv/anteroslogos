// @ts-nocheck - Example code with intentional type flexibility
/**
 * Integration Example: Using Reliability Module in Production
 * 
 * This example shows how to integrate the reliability module
 * into the Anóteros Lógos platform.
 */

import { createClient } from '@supabase/supabase-js';
import type { MinimalSupabaseClient } from '../../../types/lib.types';
import {
  // Error classes
  DatabaseError,
  ExternalServiceError,
  ValidationError,
  
  // Retry logic
  withRetry,
  API_RETRY_CONFIG,
  DATABASE_RETRY_CONFIG,
  
  // Circuit breaker
  globalCircuitBreakerRegistry,
  
  // Health checks
  globalHealthCheckManager,
  createDatabaseHealthCheck,
  createHttpHealthCheck,
  
  // Graceful shutdown
  globalShutdownManager,
  createDatabaseCleanup,
  
  // Concurrency
  withOptimisticLock,
} from '../index';

// ============================================================================
// 1. Initialize Supabase with reliability
// ============================================================================

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// 2. Setup Health Checks
// ============================================================================

function setupHealthChecks() {
  // Database health check
  globalHealthCheckManager.register(
    'database',
    createDatabaseHealthCheck(supabase, 'supabase')
  );
  
  // External service health checks
  if (process.env.STRIPE_API_KEY) {
    globalHealthCheckManager.register(
      'stripe',
      createHttpHealthCheck('https://api.stripe.com/v1/charges', 'stripe')
    );
  }
  
  console.log('[Reliability] Health checks configured');
}

// ============================================================================
// 3. Setup Circuit Breakers
// ============================================================================

function setupCircuitBreakers() {
  // Stripe API circuit breaker
  globalCircuitBreakerRegistry.getOrCreate('stripe', {
    failureThreshold: 5,
    timeout: 60000,
    successThreshold: 2,
    onOpen: () => console.error('[CircuitBreaker] Stripe circuit OPEN'),
    onClose: () => console.log('[CircuitBreaker] Stripe circuit CLOSED'),
  });
  
  // OpenAI API circuit breaker
  globalCircuitBreakerRegistry.getOrCreate('openai', {
    failureThreshold: 5,
    timeout: 60000,
    successThreshold: 2,
    onOpen: () => console.error('[CircuitBreaker] OpenAI circuit OPEN'),
    onClose: () => console.log('[CircuitBreaker] OpenAI circuit CLOSED'),
  });
  
  console.log('[Reliability] Circuit breakers configured');
}

// ============================================================================
// 4. Setup Graceful Shutdown
// ============================================================================

function setupGracefulShutdown() {
  // Register database cleanup
  globalShutdownManager.registerCleanup(
    'database',
    createDatabaseCleanup(supabase as MinimalSupabaseClient)
  );
  
  // Register custom cleanup
  globalShutdownManager.registerCleanup('custom', async () => {
    console.log('[Shutdown] Cleaning up custom resources...');
    // Add any custom cleanup logic here
  });
  
  // Start listening for shutdown signals
  globalShutdownManager.listen();
  
  console.log('[Reliability] Graceful shutdown configured');
}

// ============================================================================
// 5. Example: Resilient Database Operation
// ============================================================================

async function getUserWithRetry(userId: string) {
  return await withRetry(
    async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        throw new DatabaseError(
          `Failed to fetch user ${userId}`,
          undefined,
          error
        );
      }
      
      return data;
    },
    DATABASE_RETRY_CONFIG
  );
}

// ============================================================================
// 6. Example: Resilient External API Call with Circuit Breaker
// ============================================================================

async function chargeStripeWithResilience(amount: number, token: string) {
  const breaker = globalCircuitBreakerRegistry.get('stripe')!;
  
  return await breaker.execute(async () => {
    return await withRetry(
      async () => {
        const response = await fetch('https://api.stripe.com/v1/charges', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.STRIPE_API_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            amount: amount.toString(),
            currency: 'usd',
            source: token,
          }),
        });
        
        if (!response.ok) {
          throw new ExternalServiceError(
            'Stripe charge failed',
            undefined,
            'stripe',
            response.status >= 500 // Retry on 5xx errors
          );
        }
        
        return response.json();
      },
      API_RETRY_CONFIG
    );
  });
}

// ============================================================================
// 7. Example: Safe Concurrent Balance Update
// ============================================================================

async function deductBalanceWithLocking(userId: string, amount: number) {
  const result = await withOptimisticLock(
    supabase,
    'profiles',
    userId,
    async (profile) => {
      // Validate balance
      if (profile.credits_remaining < amount) {
        throw new ValidationError('Insufficient balance');
      }
      
      // Return update
      return {
        credits_remaining: profile.credits_remaining - amount,
      };
    },
    3 // Max retries on conflict
  );
  
  if (!result.success) {
    throw new DatabaseError('Failed to update balance due to concurrent modification');
  }
  
  return result.data;
}

// ============================================================================
// 8. Example: Complete Application Initialization
// ============================================================================

export async function initializeReliability() {
  console.log('[Reliability] Initializing reliability module...');
  
  // Setup all reliability features
  setupHealthChecks();
  setupCircuitBreakers();
  setupGracefulShutdown();
  
  console.log('[Reliability] Initialization complete');
  
  // Return utility functions
  return {
    getUserWithRetry,
    chargeStripeWithResilience,
    deductBalanceWithLocking,
  };
}

// ============================================================================
// 9. Example: Error Handling Middleware
// ============================================================================

export function createErrorHandler() {
  return (error: unknown) => {
    // Log error with correlation ID
    if (error instanceof DatabaseError) {
      console.error('[Database Error]', {
        correlationId: error.correlationId,
        message: error.message,
        originalError: error.originalError?.message,
      });
      
      return {
        statusCode: error.statusCode,
        body: error.toAPIResponse(),
      };
    }
    
    if (error instanceof ExternalServiceError) {
      console.error('[External Service Error]', {
        correlationId: error.correlationId,
        service: error.service,
        retryable: error.retryable,
      });
      
      return {
        statusCode: error.statusCode,
        body: error.toAPIResponse(),
      };
    }
    
    if (error instanceof ValidationError) {
      return {
        statusCode: error.statusCode,
        body: error.toAPIResponse(),
      };
    }
    
    // Unknown error
    console.error('[Unknown Error]', error);
    return {
      statusCode: 500,
      body: {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      },
    };
  };
}

// ============================================================================
// 10. Example: Usage in API Endpoint
// ============================================================================

export async function handleAPIRequest(userId: string, amount: number) {
  const errorHandler = createErrorHandler();
  
  try {
    // Get user with retry
    const user = await getUserWithRetry(userId);
    
    // Deduct balance with locking
    const updatedProfile = await deductBalanceWithLocking(userId, amount);
    
    // Charge Stripe with circuit breaker
    const charge = await chargeStripeWithResilience(amount * 100, user.stripe_token);
    
    return {
      statusCode: 200,
      body: {
        success: true,
        charge,
        newBalance: updatedProfile.credits_remaining,
      },
    };
  } catch (error) {
    return errorHandler(error);
  }
}

// ============================================================================
// Example: Start the application
// ============================================================================

if (require.main === module) {
  initializeReliability()
    .then(() => {
      console.log('[App] Application started with reliability features');
    })
    .catch((error) => {
      console.error('[App] Failed to initialize:', error);
      process.exit(1);
    });
}
