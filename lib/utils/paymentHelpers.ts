/**
 * Common Payment Helper Utilities
 * Extracted from duplicated patterns across payment operations
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Transaction types
 */
export enum TransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
  REFUND = 'refund',
  TRANSFER = 'transfer',
}

/**
 * Transaction status
 */
export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Transaction record
 */
export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  description?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Balance record
 */
export interface Balance {
  user_id: string;
  amount: number;
  currency: string;
  updated_at: string;
}

/**
 * Record transaction in database
 */
export async function recordTransaction(
  client: SupabaseClient,
  transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>
): Promise<{ transaction: Transaction | null; error: Error | null }> {
  try {
    const { data, error } = await client
      .from('transactions')
      .insert(transaction)
      .select()
      .single();

    if (error) throw error;
    return { transaction: data as Transaction, error: null };
  } catch (error) {
    return { transaction: null, error: error as Error };
  }
}

/**
 * Update user balance atomically
 */
export async function updateBalance(
  client: SupabaseClient,
  userId: string,
  amount: number,
  currency: string = 'USD'
): Promise<{ balance: Balance | null; error: Error | null }> {
  try {
    // Use database function for atomic update
    const { data, error } = await client.rpc('update_user_balance', {
      p_user_id: userId,
      p_amount: amount,
      p_currency: currency,
    });

    if (error) throw error;
    return { balance: data as Balance, error: null };
  } catch (error) {
    return { balance: null, error: error as Error };
  }
}

/**
 * Get user balance
 */
export async function getUserBalance(
  client: SupabaseClient,
  userId: string,
  currency: string = 'USD'
): Promise<{ balance: number; error: Error | null }> {
  try {
    const { data, error } = await client
      .from('balances')
      .select('amount')
      .eq('user_id', userId)
      .eq('currency', currency)
      .single();

    if (error) throw error;
    return { balance: data?.amount || 0, error: null };
  } catch (error) {
    return { balance: 0, error: error as Error };
  }
}

/**
 * Check if user has sufficient balance
 */
export async function hasSufficientBalance(
  client: SupabaseClient,
  userId: string,
  requiredAmount: number,
  currency: string = 'USD'
): Promise<boolean> {
  const { balance } = await getUserBalance(client, userId, currency);
  return balance >= requiredAmount;
}

/**
 * Process payment transaction
 */
export async function processPayment(
  client: SupabaseClient,
  userId: string,
  amount: number,
  description: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; transaction: Transaction | null; error: Error | null }> {
  try {
    // Check balance
    const hasBalance = await hasSufficientBalance(client, userId, amount);
    if (!hasBalance) {
      throw new Error('Insufficient balance');
    }

    // Record transaction
    const { transaction, error: txError } = await recordTransaction(client, {
      user_id: userId,
      type: TransactionType.DEBIT,
      amount,
      currency: 'USD',
      status: TransactionStatus.PENDING,
      description,
      metadata,
    });

    if (txError || !transaction) {
      throw txError || new Error('Failed to record transaction');
    }

    // Update balance
    const { error: balanceError } = await updateBalance(client, userId, -amount);
    if (balanceError) {
      // Rollback transaction status
      await client
        .from('transactions')
        .update({ status: TransactionStatus.FAILED })
        .eq('id', transaction.id);
      throw balanceError;
    }

    // Mark transaction as completed
    await client
      .from('transactions')
      .update({ status: TransactionStatus.COMPLETED })
      .eq('id', transaction.id);

    return { success: true, transaction, error: null };
  } catch (error) {
    return { success: false, transaction: null, error: error as Error };
  }
}

/**
 * Process refund transaction
 */
export async function processRefund(
  client: SupabaseClient,
  originalTransactionId: string
): Promise<{ success: boolean; refundTransaction: Transaction | null; error: Error | null }> {
  try {
    // Get original transaction
    const { data: originalTx, error: fetchError } = await client
      .from('transactions')
      .select('*')
      .eq('id', originalTransactionId)
      .single();

    if (fetchError || !originalTx) {
      throw new Error('Original transaction not found');
    }

    // Record refund transaction
    const { transaction: refundTx, error: refundError } = await recordTransaction(client, {
      user_id: originalTx.user_id,
      type: TransactionType.REFUND,
      amount: originalTx.amount,
      currency: originalTx.currency,
      status: TransactionStatus.PENDING,
      description: `Refund for transaction ${originalTransactionId}`,
      metadata: { original_transaction_id: originalTransactionId },
    });

    if (refundError || !refundTx) {
      throw refundError || new Error('Failed to record refund');
    }

    // Update balance
    const { error: balanceError } = await updateBalance(
      client,
      originalTx.user_id,
      originalTx.amount
    );

    if (balanceError) {
      // Rollback refund transaction
      await client
        .from('transactions')
        .update({ status: TransactionStatus.FAILED })
        .eq('id', refundTx.id);
      throw balanceError;
    }

    // Mark refund as completed
    await client
      .from('transactions')
      .update({ status: TransactionStatus.COMPLETED })
      .eq('id', refundTx.id);

    return { success: true, refundTransaction: refundTx, error: null };
  } catch (error) {
    return { success: false, refundTransaction: null, error: error as Error };
  }
}

/**
 * Get transaction history for user
 */
export async function getTransactionHistory(
  client: SupabaseClient,
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    type?: TransactionType;
    status?: TransactionStatus;
  } = {}
): Promise<{ transactions: Transaction[]; total: number; error: Error | null }> {
  const { limit = 50, offset = 0, type, status } = options;

  try {
    let query = client
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (type) {
      query = query.eq('type', type);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, count, error } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      transactions: (data as Transaction[]) || [],
      total: count || 0,
      error: null,
    };
  } catch (error) {
    return { transactions: [], total: 0, error: error as Error };
  }
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Validate transaction amount
 */
export function validateTransactionAmount(amount: number): { valid: boolean; error?: string } {
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than zero' };
  }

  if (!Number.isFinite(amount)) {
    return { valid: false, error: 'Amount must be a valid number' };
  }

  // Check for reasonable precision (2 decimal places for USD)
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    return { valid: false, error: 'Amount cannot have more than 2 decimal places' };
  }

  return { valid: true };
}
