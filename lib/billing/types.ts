/**
 * Billing Service Type Definitions
 */

export type EventType =
  | 'DEPOSIT_STRIPE'
  | 'DEPOSIT_CRYPTO'
  | 'MIGRATION_CREDIT'
  | 'SPEND_API'
  | 'SPEND_AUDIT'
  | 'SPEND_CONSENSUS'
  | 'REWARD_CONTRIBUTION';

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  event_type: EventType;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface TransactionHistoryOptions {
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
  eventType?: EventType;
}

export interface ChargeResult {
  success: true;
  newBalance: number;
  transactionId: string;
}

export interface DepositResult {
  success: true;
  newBalance: number;
  transactionId: string;
}
