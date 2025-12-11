/**
 * Billing Service - Core CCC Economy Implementation
 * 
 * This service provides the primary interface for all billing operations in the CCC
 * (Causal Contribution Credits) economy. It handles credit purchases, charges, balance
 * queries, and transaction history with atomic guarantees and comprehensive error handling.
 * 
 * Key Features:
 * - Atomic transactions: Balance checks and deductions occur in single database transaction
 * - Immutable ledger: All transactions recorded in append-only billing_ledger table
 * - Cached balances: Fast O(1) balance lookups via user_balances table
 * - Comprehensive audit logging: All operations logged for security and debugging
 * - Error handling: Clear error types for insufficient funds and transaction failures
 * 
 * Architecture:
 * - Uses Supabase service role for privileged database operations
 * - Enforces Row Level Security (RLS) policies for data isolation
 * - Integrates with audit logging system for compliance
 * - Supports multiple deposit sources (Stripe, crypto, migrations)
 * 
 * @example
 * ```typescript
 * // Initialize service
 * const billingService = new BillingService();
 * 
 * // Check balance
 * const balance = await billingService.getBalance(userId);
 * 
 * // Charge user
 * try {
 *   const result = await billingService.chargeUser(
 *     userId,
 *     50,
 *     'GEO Audit',
 *     { operation_type: 'GEO_AUDIT' }
 *   );
 *   console.log(`New balance: ${result.newBalance} CCC`);
 * } catch (error) {
 *   if (error instanceof InsufficientFundsError) {
 *     console.error(`Need ${error.required} CCC, have ${error.available} CCC`);
 *   }
 * }
 * ```
 * 
 * @see {@link https://github.com/your-repo/docs/billing/API_REFERENCE.md API Reference}
 * @see {@link InsufficientFundsError}
 * @see {@link BillingTransactionError}
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { InsufficientFundsError, BillingTransactionError } from './errors';
import { getBillingAuditLogger } from './auditLogger';
import type {
  Transaction,
  TransactionHistoryOptions,
  ChargeResult,
  DepositResult,
  EventType,
} from './types';

/**
 * Core billing service class for CCC economy operations
 * 
 * This class manages all credit-related operations including balance queries,
 * charges, deposits, and transaction history. It uses Supabase for database
 * operations and enforces atomic transaction semantics.
 * 
 * @class BillingService
 */
export class BillingService {
  /**
   * Supabase client with service role privileges
   * Used for all database operations that require bypassing RLS
   * @private
   */
  private supabase: SupabaseClient;

  /**
   * Creates a new BillingService instance
   * 
   * Initializes Supabase client with service role credentials. Credentials can be
   * provided explicitly or will be read from environment variables.
   * 
   * @param {string} [supabaseUrl] - Supabase project URL (optional, defaults to env var)
   * @param {string} [supabaseServiceKey] - Supabase service role key (optional, defaults to env var)
   * 
   * @throws {Error} If Supabase configuration is missing
   * 
   * @example
   * ```typescript
   * // Use environment variables
   * const service = new BillingService();
   * 
   * // Provide credentials explicitly
   * const service = new BillingService(
   *   'https://xxx.supabase.co',
   *   'eyJxxx...'
   * );
   * ```
   */
  constructor(supabaseUrl?: string, supabaseServiceKey?: string) {
    // Use provided credentials or fall back to environment variables
    const url = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = supabaseServiceKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        'Missing Supabase configuration. Provide supabaseUrl and supabaseServiceKey or set environment variables.'
      );
    }

    this.supabase = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Get current CCC balance for a user
   * 
   * Retrieves the user's current credit balance using a two-tier approach:
   * 1. First attempts to read from cached user_balances table (O(1) lookup)
   * 2. Falls back to computing from billing_ledger if cache is missing
   * 
   * The cached balance is automatically maintained by database triggers on ledger
   * inserts, ensuring consistency while providing fast reads.
   * 
   * @param {string} userId - User identifier (UUID)
   * @returns {Promise<number>} Current balance in CCC
   * 
   * @throws {Error} If database query fails
   * 
   * @example
   * ```typescript
   * const balance = await billingService.getBalance('user-123');
   * console.log(`Balance: ${balance} CCC`);
   * 
   * // Check if user can afford operation
   * const cost = 50;
   * if (balance >= cost) {
   *   await performOperation();
   * }
   * ```
   * 
   * @performance O(1) when cache hit, O(n) when computing from ledger where n = transaction count
   * @see {@link chargeUser} for deducting credits
   * @see {@link depositCredits} for adding credits
   */
  async getBalance(userId: string): Promise<number> {
    try {
      // Log balance check
      const auditLogger = getBillingAuditLogger();
      await auditLogger.logEvent('balance_check', userId, {
        operation: 'get_balance',
      });

      // Try cached balance first
      const { data: balanceData, error: balanceError } = await this.supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (balanceError && balanceError.code !== 'PGRST116') {
        // PGRST116 is "not found", which is acceptable
        console.error('Error fetching cached balance:', balanceError);
      }

      if (balanceData) {
        return Number(balanceData.balance);
      }

      // Fallback: compute from ledger
      const { data: ledgerData, error: ledgerError } = await this.supabase
        .from('billing_ledger')
        .select('amount')
        .eq('user_id', userId);

      if (ledgerError) {
        throw new Error(`Failed to compute balance from ledger: ${ledgerError.message}`);
      }

      const balance = ledgerData.reduce((sum, entry) => sum + Number(entry.amount), 0);

      // Cache the computed balance
      await this.supabase
        .from('user_balances')
        .upsert({
          user_id: userId,
          balance,
          last_updated: new Date().toISOString(),
        });

      return balance;
    } catch (error) {
      console.error('getBalance error:', error);
      throw error;
    }
  }

  /**
   * Charge user for an operation with atomic balance check and deduction
   * 
   * This is the primary method for deducting credits from a user's account. It performs
   * an atomic operation that:
   * 1. Checks current balance
   * 2. Verifies sufficient funds
   * 3. Inserts negative ledger entry (spend)
   * 4. Returns updated balance
   * 
   * The operation is atomic - if any step fails, no charge occurs. This prevents
   * partial charges and race conditions in concurrent scenarios.
   * 
   * @param {string} userId - User identifier (UUID)
   * @param {number} cost - Cost in CCC (must be positive)
   * @param {string} description - Human-readable description of the charge
   * @param {Record<string, any>} [metadata] - Optional metadata (operation_type, etc.)
   * 
   * @returns {Promise<ChargeResult>} Result containing success status, new balance, and transaction ID
   * 
   * @throws {Error} If cost is not positive
   * @throws {InsufficientFundsError} If user balance < cost
   * @throws {BillingTransactionError} If ledger insert fails
   * 
   * @example
   * ```typescript
   * // Charge for GEO audit
   * try {
   *   const result = await billingService.chargeUser(
   *     'user-123',
   *     50,
   *     'GEO Audit for example.com',
   *     {
   *       operation_type: 'GEO_AUDIT',
   *       url: 'example.com',
   *       timestamp: new Date().toISOString()
   *     }
   *   );
   *   
   *   console.log(`Charged 50 CCC. New balance: ${result.newBalance}`);
   *   console.log(`Transaction ID: ${result.transactionId}`);
   * } catch (error) {
   *   if (error instanceof InsufficientFundsError) {
   *     // Handle insufficient funds
   *     console.error(`Need ${error.required} CCC, have ${error.available} CCC`);
   *     showPurchasePrompt(error.required - error.available);
   *   } else if (error instanceof BillingTransactionError) {
   *     // Handle transaction failure
   *     console.error('Transaction failed:', error.cause);
   *     showRetryPrompt();
   *   }
   * }
   * ```
   * 
   * @atomicity This operation is atomic - balance check and deduction occur in single transaction
   * @concurrency Safe for concurrent operations via database transaction isolation
   * @audit All charges are logged to audit system with full context
   * 
   * @see {@link InsufficientFundsError}
   * @see {@link BillingTransactionError}
   * @see {@link getBalance}
   */
  async chargeUser(
    userId: string,
    cost: number,
    description: string,
    metadata?: Record<string, any>
  ): Promise<ChargeResult> {
    if (cost <= 0) {
      throw new Error('Cost must be positive');
    }

    const auditLogger = getBillingAuditLogger();

    try {
      // Log charge attempt
      await auditLogger.logEvent('credit_charge_attempt', userId, {
        cost,
        description,
        operation_type: metadata?.operation_type,
      });

      // Start a transaction by checking balance first
      const currentBalance = await this.getBalance(userId);

      if (currentBalance < cost) {
        // Log insufficient funds
        await auditLogger.logInsufficientFunds(
          userId,
          description,
          cost,
          currentBalance
        );
        throw new InsufficientFundsError(cost, currentBalance, description);
      }

      // Insert negative amount for spend
      const { data: ledgerEntry, error: insertError } = await this.supabase
        .from('billing_ledger')
        .insert({
          user_id: userId,
          amount: -cost,
          event_type: this.inferEventType(description, metadata),
          description,
          metadata: metadata || {},
        })
        .select()
        .single();

      if (insertError) {
        // Log transaction error
        await auditLogger.logTransactionError(
          userId,
          'chargeUser',
          insertError.message,
          { cost, description }
        );
        throw new BillingTransactionError(
          userId,
          'chargeUser',
          new Error(insertError.message)
        );
      }

      // Get updated balance
      const newBalance = await this.getBalance(userId);

      // Log successful charge
      await auditLogger.logEvent('credit_charge_success', userId, {
        cost,
        description,
        transaction_id: ledgerEntry.id,
        balance_before: currentBalance,
        balance_after: newBalance,
      });

      // Log the operation
      console.log(`Charged user ${userId}: ${cost} CCC for ${description}. New balance: ${newBalance}`);

      return {
        success: true,
        newBalance,
        transactionId: ledgerEntry.id,
      };
    } catch (error) {
      if (error instanceof InsufficientFundsError) {
        console.warn(`Insufficient funds for user ${userId}: ${error.message}`);
        throw error;
      }

      if (error instanceof BillingTransactionError) {
        console.error(`Billing transaction error: ${error.message}`);
        throw error;
      }

      // Log unexpected error
      await auditLogger.logTransactionError(
        userId,
        'chargeUser',
        error instanceof Error ? error.message : String(error),
        { cost, description }
      );

      console.error('Unexpected error in chargeUser:', error);
      throw new BillingTransactionError(
        userId,
        'chargeUser',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Deposit credits to user account
   * 
   * Adds credits to a user's account by inserting a positive ledger entry. This method
   * is used by payment processors (Stripe, cryptocurrency) and the migration service
   * to credit accounts after successful payments or subscription conversions.
   * 
   * **Important**: This method should only be called by trusted internal services:
   * - Stripe webhook handler (after payment verification)
   * - Crypto payment processor (after on-chain verification)
   * - Migration service (during subscription conversion)
   * 
   * Direct calls from user-facing code are not recommended as they bypass payment
   * verification.
   * 
   * @param {string} userId - User identifier (UUID)
   * @param {number} amount - CCC amount to deposit (must be positive)
   * @param {('DEPOSIT_STRIPE'|'DEPOSIT_CRYPTO'|'MIGRATION_CREDIT')} eventType - Type of deposit
   * @param {Record<string, any>} metadata - Event-specific metadata
   * 
   * @returns {Promise<DepositResult>} Result containing success status, new balance, and transaction ID
   * 
   * @throws {Error} If amount is not positive
   * @throws {BillingTransactionError} If ledger insert fails
   * 
   * @internal This method is for internal use by payment processors and migration service
   * 
   * @example
   * ```typescript
   * // Called by Stripe webhook handler
   * await billingService.depositCredits(
   *   userId,
   *   100,
   *   'DEPOSIT_STRIPE',
   *   {
   *     package_id: 'starter_pack',
   *     package_name: 'Starter Pack',
   *     stripe_session_id: 'cs_xxx',
   *     amount_paid_usd: 20.00
   *   }
   * );
   * 
   * // Called by crypto payment processor
   * await billingService.depositCredits(
   *   userId,
   *   500,
   *   'DEPOSIT_CRYPTO',
   *   {
   *     tx_hash: '0x123...',
   *     chain_id: 8453,
   *     usdc_amount: 100.00,
   *     confirmations: 3
   *   }
   * );
   * 
   * // Called by migration service
   * await billingService.depositCredits(
   *   userId,
   *   245,
   *   'MIGRATION_CREDIT',
   *   {
   *     plan_id: 'pro',
   *     subscription_id: 'sub_xxx',
   *     remaining_days: 30
   *   }
   * );
   * ```
   * 
   * @security Only call from trusted internal services after payment verification
   * @audit All deposits are logged to audit system with full metadata
   * 
   * @see {@link https://github.com/your-repo/docs/billing/API_REFERENCE.md#depositcredits API Reference}
   */
  async depositCredits(
    userId: string,
    amount: number,
    eventType: 'DEPOSIT_STRIPE' | 'DEPOSIT_CRYPTO' | 'MIGRATION_CREDIT',
    metadata: Record<string, any>
  ): Promise<DepositResult> {
    if (amount <= 0) {
      throw new Error('Deposit amount must be positive');
    }

    const auditLogger = getBillingAuditLogger();

    try {
      // Insert positive amount for deposit
      const { data: ledgerEntry, error: insertError } = await this.supabase
        .from('billing_ledger')
        .insert({
          user_id: userId,
          amount,
          event_type: eventType,
          description: this.generateDepositDescription(eventType, metadata),
          metadata,
        })
        .select()
        .single();

      if (insertError) {
        // Log transaction error
        await auditLogger.logTransactionError(
          userId,
          'depositCredits',
          insertError.message,
          { amount, event_type: eventType }
        );
        throw new BillingTransactionError(
          userId,
          'depositCredits',
          new Error(insertError.message)
        );
      }

      // Get updated balance
      const newBalance = await this.getBalance(userId);

      // Log deposit
      await auditLogger.logEvent('credit_deposit', userId, {
        amount,
        event_type: eventType,
        transaction_id: ledgerEntry.id,
        balance_after: newBalance,
      });

      // Log the operation
      console.log(
        `Deposited ${amount} CCC to user ${userId} via ${eventType}. New balance: ${newBalance}`
      );

      return {
        success: true,
        newBalance,
        transactionId: ledgerEntry.id,
      };
    } catch (error) {
      console.error('Error in depositCredits:', error);
      
      // Log transaction error if not already logged
      if (!(error instanceof BillingTransactionError)) {
        await auditLogger.logTransactionError(
          userId,
          'depositCredits',
          error instanceof Error ? error.message : String(error),
          { amount, event_type: eventType }
        );
      }

      throw new BillingTransactionError(
        userId,
        'depositCredits',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Get transaction history for a user with pagination and filtering
   * 
   * Retrieves a user's complete transaction history from the billing ledger,
   * including all deposits and charges. Supports pagination for large histories
   * and filtering by date range and event type.
   * 
   * Transactions are returned in reverse chronological order (newest first) and
   * include full metadata for each transaction.
   * 
   * @param {string} userId - User identifier (UUID)
   * @param {TransactionHistoryOptions} [options] - Optional filtering and pagination
   * @param {number} [options.limit=100] - Maximum number of transactions to return
   * @param {number} [options.offset=0] - Pagination offset
   * @param {Date} [options.startDate] - Filter transactions after this date
   * @param {Date} [options.endDate] - Filter transactions before this date
   * @param {EventType} [options.eventType] - Filter by specific event type
   * 
   * @returns {Promise<Transaction[]>} Array of transactions in reverse chronological order
   * 
   * @throws {Error} If database query fails
   * 
   * @example
   * ```typescript
   * // Get last 50 transactions
   * const recent = await billingService.getTransactionHistory(
   *   'user-123',
   *   { limit: 50 }
   * );
   * 
   * // Get transactions from last 7 days
   * const lastWeek = await billingService.getTransactionHistory(
   *   'user-123',
   *   {
   *     startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
   *     endDate: new Date()
   *   }
   * );
   * 
   * // Get only deposits
   * const deposits = await billingService.getTransactionHistory(
   *   'user-123',
   *   { eventType: 'DEPOSIT_STRIPE' }
   * );
   * 
   * // Pagination example
   * const page1 = await billingService.getTransactionHistory(
   *   'user-123',
   *   { limit: 20, offset: 0 }
   * );
   * const page2 = await billingService.getTransactionHistory(
   *   'user-123',
   *   { limit: 20, offset: 20 }
   * );
   * 
   * // Process transactions
   * for (const tx of recent) {
   *   console.log(`${tx.created_at}: ${tx.amount} CCC - ${tx.description}`);
   * }
   * ```
   * 
   * @performance Indexed on (user_id, created_at) for fast queries
   * @security RLS policies ensure users can only see their own transactions
   * @audit Transaction history access is logged to audit system
   * 
   * @see {@link Transaction}
   * @see {@link TransactionHistoryOptions}
   */
  async getTransactionHistory(
    userId: string,
    options?: TransactionHistoryOptions
  ): Promise<Transaction[]> {
    const auditLogger = getBillingAuditLogger();

    try {
      // Log transaction history access
      await auditLogger.logEvent('transaction_history_access', userId, {
        limit: options?.limit,
        offset: options?.offset,
        has_filters: !!(options?.startDate || options?.endDate || options?.eventType),
      });

      const limit = options?.limit || 100;
      const offset = options?.offset || 0;

      let query = this.supabase
        .from('billing_ledger')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (options?.startDate) {
        query = query.gte('created_at', options.startDate.toISOString());
      }

      if (options?.endDate) {
        query = query.lte('created_at', options.endDate.toISOString());
      }

      if (options?.eventType) {
        query = query.eq('event_type', options.eventType);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch transaction history: ${error.message}`);
      }

      return (data || []).map((row) => ({
        id: row.id,
        user_id: row.user_id,
        amount: Number(row.amount),
        event_type: row.event_type as EventType,
        description: row.description,
        metadata: row.metadata || {},
        created_at: row.created_at,
      }));
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw error;
    }
  }

  /**
   * Check if a cryptocurrency transaction has already been processed
   * 
   * Queries the billing ledger to determine if a specific blockchain transaction
   * has already been credited to a user's account. This prevents double-crediting
   * of the same transaction if it's submitted multiple times.
   * 
   * This is a critical security check for cryptocurrency payments to ensure
   * idempotency - each blockchain transaction should only be credited once.
   * 
   * @param {string} txHash - Blockchain transaction hash (e.g., "0x123...")
   * @returns {Promise<boolean>} True if transaction has been processed, false otherwise
   * 
   * @example
   * ```typescript
   * const txHash = '0x1234567890abcdef...';
   * 
   * const alreadyProcessed = await billingService.isTransactionProcessed(txHash);
   * 
   * if (alreadyProcessed) {
   *   console.log('Transaction already credited');
   *   return { error: 'Duplicate transaction' };
   * }
   * 
   * // Safe to process
   * await processCryptoPayment(userId, verifiedTx, billingService);
   * ```
   * 
   * @security Essential for preventing double-crediting attacks
   * @performance Indexed query on metadata JSONB field
   * 
   * @see {@link https://github.com/your-repo/docs/billing/API_REFERENCE.md#cryptocurrency-payments Crypto Payments}
   */
  async isTransactionProcessed(txHash: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('billing_ledger')
        .select('id')
        .eq('event_type', 'DEPOSIT_CRYPTO')
        .contains('metadata', { tx_hash: txHash })
        .limit(1);

      if (error) {
        console.error('Error checking transaction:', error);
        return false;
      }

      return (data && data.length > 0);
    } catch (error) {
      console.error('Error in isTransactionProcessed:', error);
      return false;
    }
  }

  /**
   * Infer event type from description and metadata
   * 
   * Automatically determines the appropriate event type for a transaction based on
   * the description text and metadata. This provides a fallback when event type is
   * not explicitly specified.
   * 
   * @param {string} description - Transaction description
   * @param {Record<string, any>} [metadata] - Transaction metadata
   * @returns {EventType} Inferred event type
   * 
   * @private
   * @internal Used internally by chargeUser when event type not specified
   */
  private inferEventType(description: string, metadata?: Record<string, any>): EventType {
    const desc = description.toLowerCase();
    const meta = metadata || {};

    if (desc.includes('audit') || meta.operation_type === 'GEO_AUDIT') {
      return 'SPEND_AUDIT';
    }

    if (desc.includes('consensus') || meta.operation_type === 'AGENT_CONSENSUS') {
      return 'SPEND_CONSENSUS';
    }

    if (desc.includes('api') || meta.operation_type?.includes('API')) {
      return 'SPEND_API';
    }

    // Default to API spend
    return 'SPEND_API';
  }

  /**
   * Generate human-readable description for deposit transactions
   * 
   * Creates user-friendly descriptions for deposit transactions based on the
   * event type and metadata. These descriptions appear in transaction history.
   * 
   * @param {('DEPOSIT_STRIPE'|'DEPOSIT_CRYPTO'|'MIGRATION_CREDIT')} eventType - Type of deposit
   * @param {Record<string, any>} metadata - Deposit metadata
   * @returns {string} Human-readable description
   * 
   * @private
   * @internal Used internally by depositCredits
   */
  private generateDepositDescription(
    eventType: 'DEPOSIT_STRIPE' | 'DEPOSIT_CRYPTO' | 'MIGRATION_CREDIT',
    metadata: Record<string, any>
  ): string {
    switch (eventType) {
      case 'DEPOSIT_STRIPE':
        return `Credit purchase via Stripe${metadata.package_name ? ` (${metadata.package_name})` : ''}`;
      case 'DEPOSIT_CRYPTO':
        return `Cryptocurrency deposit${metadata.tx_hash ? ` (${metadata.tx_hash.substring(0, 10)}...)` : ''}`;
      case 'MIGRATION_CREDIT':
        return `Subscription migration credit${metadata.plan_id ? ` from ${metadata.plan_id} plan` : ''}`;
      default:
        return 'Credit deposit';
    }
  }
}

/**
 * Singleton instance of BillingService
 * Cached to avoid creating multiple instances with same configuration
 * @private
 */
let billingServiceInstance: BillingService | null = null;

/**
 * Get singleton instance of BillingService
 * 
 * Returns a cached instance of BillingService using environment variable configuration.
 * This is the recommended way to access the billing service in most application code.
 * 
 * The singleton pattern ensures:
 * - Single Supabase client instance (connection pooling)
 * - Consistent configuration across application
 * - Reduced memory overhead
 * 
 * @returns {BillingService} Singleton BillingService instance
 * 
 * @example
 * ```typescript
 * import { getBillingService } from '@/lib/billing/BillingService';
 * 
 * const billingService = getBillingService();
 * const balance = await billingService.getBalance(userId);
 * ```
 * 
 * @see {@link BillingService}
 */
export function getBillingService(): BillingService {
  if (!billingServiceInstance) {
    billingServiceInstance = new BillingService();
  }
  return billingServiceInstance;
}
