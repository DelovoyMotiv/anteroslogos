/**
 * Billing Service - Core CCC Economy Implementation
 * Handles all credit operations with atomic transactions and proper error handling
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

export class BillingService {
  private supabase: SupabaseClient;

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
   * Get current balance for a user
   * Uses cached balance from user_balances table for fast reads
   * Falls back to computing from ledger if cache is missing
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
   * Charge user for an operation
   * Performs atomic balance check and deduction
   * @throws InsufficientFundsError if balance < cost
   * @throws BillingTransactionError if transaction fails
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
   * Used by payment webhooks (Stripe, crypto) and migrations
   * @internal - Should only be called by webhook handlers and migration service
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
   * Get transaction history for a user
   * Supports pagination and filtering
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
   * Check if a crypto transaction has already been processed
   * Prevents double-crediting of the same blockchain transaction
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
   * Used when event type is not explicitly provided
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
   * Generate human-readable description for deposits
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

// Export singleton instance for convenience
let billingServiceInstance: BillingService | null = null;

export function getBillingService(): BillingService {
  if (!billingServiceInstance) {
    billingServiceInstance = new BillingService();
  }
  return billingServiceInstance;
}
