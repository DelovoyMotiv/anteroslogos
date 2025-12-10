/**
 * Billing Audit Logger
 * Security audit logging for billing operations and unauthorized access attempts
 * 
 * Compliant with SOC 2, GDPR, and enterprise security requirements
 * Tracks all billing operations, access attempts, and security events
 * 
 * **Validates: Requirements 8.4, 8.5**
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type BillingEventType =
  | 'balance_check'
  | 'balance_check_unauthorized'
  | 'credit_charge_attempt'
  | 'credit_charge_success'
  | 'credit_charge_failure'
  | 'credit_deposit'
  | 'transaction_history_access'
  | 'transaction_history_unauthorized'
  | 'ledger_access_unauthorized'
  | 'ledger_insert_attempt'
  | 'ledger_insert_unauthorized'
  | 'ledger_modify_attempt'
  | 'ledger_delete_attempt'
  | 'insufficient_funds'
  | 'billing_transaction_error'
  | 'migration_credit_granted'
  | 'package_purchase_initiated'
  | 'package_purchase_completed'
  | 'webhook_received'
  | 'webhook_processed'
  | 'webhook_failed';

interface BillingAuditLogEntry {
  user_id: string | null;
  action: string;
  resource_type: 'billing' | 'ledger' | 'balance' | 'transaction' | 'webhook';
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
}

/**
 * Billing Audit Logger class
 * Handles all audit logging for billing operations
 */
export class BillingAuditLogger {
  private supabase: SupabaseClient;

  constructor(supabaseUrl?: string, supabaseServiceKey?: string) {
    const url = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = supabaseServiceKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        'Missing Supabase configuration for audit logger. Provide credentials or set environment variables.'
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
   * Log a billing event to the audit log
   */
  async logEvent(
    eventType: BillingEventType,
    userId: string | null,
    additionalMetadata: Record<string, unknown> = {},
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<void> {
    try {
      const resourceType = this.determineResourceType(eventType);
      const metadata = this.sanitizeMetadata({
        event_type: eventType,
        timestamp: new Date().toISOString(),
        ...additionalMetadata,
      });

      const logEntry: BillingAuditLogEntry = {
        user_id: userId,
        action: this.mapEventToAction(eventType),
        resource_type: resourceType,
        resource_id: additionalMetadata.transaction_id as string | null || null,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        metadata,
      };

      const { error } = await this.supabase
        .from('audit_log')
        .insert(logEntry as never);

      if (error) {
        console.error('Failed to log billing event:', error);
        // Don't throw - audit logging should never break billing flow
      }
    } catch (error) {
      console.error('Billing audit logging error:', error);
      // Silent fail - audit logging is non-critical for billing flow
    }
  }

  /**
   * Log unauthorized access attempt
   * Critical security event that should be monitored
   */
  async logUnauthorizedAccess(
    eventType: BillingEventType,
    attemptedUserId: string | null,
    actualUserId: string | null,
    resource: string,
    additionalMetadata: Record<string, unknown> = {},
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<void> {
    await this.logEvent(
      eventType,
      actualUserId,
      {
        attempted_user_id: attemptedUserId,
        resource,
        severity: 'high',
        security_event: true,
        ...additionalMetadata,
      },
      ipAddress,
      userAgent
    );

    // Log to console for immediate visibility
    console.warn(
      `🚨 SECURITY: Unauthorized billing access attempt - User ${actualUserId} attempted to access ${resource} for user ${attemptedUserId}`
    );
  }

  /**
   * Log insufficient funds event
   */
  async logInsufficientFunds(
    userId: string,
    operation: string,
    required: number,
    available: number,
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<void> {
    await this.logEvent(
      'insufficient_funds',
      userId,
      {
        operation,
        required_amount: required,
        available_balance: available,
        shortfall: required - available,
      },
      ipAddress,
      userAgent
    );
  }

  /**
   * Log billing transaction error
   */
  async logTransactionError(
    userId: string,
    operation: string,
    errorMessage: string,
    additionalMetadata: Record<string, unknown> = {},
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<void> {
    await this.logEvent(
      'billing_transaction_error',
      userId,
      {
        operation,
        error_message: errorMessage,
        severity: 'medium',
        ...additionalMetadata,
      },
      ipAddress,
      userAgent
    );
  }

  /**
   * Batch log multiple events (for performance)
   */
  async logEventsBatch(
    events: Array<{
      eventType: BillingEventType;
      userId: string | null;
      metadata?: Record<string, unknown>;
      ipAddress?: string | null;
      userAgent?: string | null;
    }>
  ): Promise<void> {
    try {
      if (events.length === 0) return;

      const logEntries = events.map(({ eventType, userId, metadata = {}, ipAddress, userAgent }) => ({
        user_id: userId,
        action: this.mapEventToAction(eventType),
        resource_type: this.determineResourceType(eventType),
        resource_id: metadata.transaction_id as string | null || null,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        metadata: this.sanitizeMetadata({
          event_type: eventType,
          timestamp: new Date().toISOString(),
          ...metadata,
        }),
      }));

      const { error } = await this.supabase
        .from('audit_log')
        .insert(logEntries as never);

      if (error) {
        console.error('Failed to batch log billing events:', error);
      }
    } catch (error) {
      console.error('Billing audit logging batch error:', error);
    }
  }

  /**
   * Query audit logs for a user (for security dashboard)
   */
  async getUserAuditLogs(
    userId: string,
    limit: number = 50,
    resourceType?: 'billing' | 'ledger' | 'balance' | 'transaction' | 'webhook'
  ): Promise<Array<{
    action: string;
    timestamp: string;
    ip_address: string | null;
    user_agent: string | null;
    metadata: Record<string, unknown>;
  }>> {
    try {
      let query = this.supabase
        .from('audit_log')
        .select('action, timestamp, ip_address, user_agent, metadata')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (resourceType) {
        query = query.eq('resource_type', resourceType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch billing audit logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching billing audit logs:', error);
      return [];
    }
  }

  /**
   * Check for suspicious billing activity
   * Multiple failed transactions, unauthorized access attempts, etc.
   */
  async checkSuspiciousActivity(
    userId: string,
    timeWindowMinutes: number = 15
  ): Promise<{
    suspicious: boolean;
    failedTransactions: number;
    unauthorizedAttempts: number;
    insufficientFundsCount: number;
  }> {
    try {
      const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000).toISOString();

      // Check failed transactions
      const { data: failedData } = await this.supabase
        .from('audit_log')
        .select('id')
        .eq('user_id', userId)
        .eq('action', 'billing.transaction.error')
        .gte('timestamp', cutoffTime);

      // Check unauthorized attempts
      const { data: unauthorizedData } = await this.supabase
        .from('audit_log')
        .select('id')
        .eq('user_id', userId)
        .like('action', '%unauthorized%')
        .gte('timestamp', cutoffTime);

      // Check insufficient funds
      const { data: insufficientData } = await this.supabase
        .from('audit_log')
        .select('id')
        .eq('user_id', userId)
        .eq('action', 'billing.insufficient_funds')
        .gte('timestamp', cutoffTime);

      const failedTransactions = failedData?.length || 0;
      const unauthorizedAttempts = unauthorizedData?.length || 0;
      const insufficientFundsCount = insufficientData?.length || 0;

      // Suspicious if: 5+ failed transactions OR any unauthorized attempts OR 10+ insufficient funds
      const suspicious =
        failedTransactions >= 5 ||
        unauthorizedAttempts > 0 ||
        insufficientFundsCount >= 10;

      return {
        suspicious,
        failedTransactions,
        unauthorizedAttempts,
        insufficientFundsCount,
      };
    } catch (error) {
      console.error('Error checking suspicious billing activity:', error);
      return {
        suspicious: false,
        failedTransactions: 0,
        unauthorizedAttempts: 0,
        insufficientFundsCount: 0,
      };
    }
  }

  /**
   * Determine resource type from event type
   */
  private determineResourceType(
    eventType: BillingEventType
  ): BillingAuditLogEntry['resource_type'] {
    if (eventType.includes('webhook')) return 'webhook';
    if (eventType.includes('ledger')) return 'ledger';
    if (eventType.includes('balance')) return 'balance';
    if (eventType.includes('transaction')) return 'transaction';
    return 'billing';
  }

  /**
   * Map event type to action string
   */
  private mapEventToAction(eventType: BillingEventType): string {
    const actionMap: Record<BillingEventType, string> = {
      balance_check: 'billing.balance.check',
      balance_check_unauthorized: 'billing.balance.check.unauthorized',
      credit_charge_attempt: 'billing.credit.charge.attempt',
      credit_charge_success: 'billing.credit.charge.success',
      credit_charge_failure: 'billing.credit.charge.failure',
      credit_deposit: 'billing.credit.deposit',
      transaction_history_access: 'billing.transaction.history.access',
      transaction_history_unauthorized: 'billing.transaction.history.unauthorized',
      ledger_access_unauthorized: 'billing.ledger.access.unauthorized',
      ledger_insert_attempt: 'billing.ledger.insert.attempt',
      ledger_insert_unauthorized: 'billing.ledger.insert.unauthorized',
      ledger_modify_attempt: 'billing.ledger.modify.attempt',
      ledger_delete_attempt: 'billing.ledger.delete.attempt',
      insufficient_funds: 'billing.insufficient_funds',
      billing_transaction_error: 'billing.transaction.error',
      migration_credit_granted: 'billing.migration.credit.granted',
      package_purchase_initiated: 'billing.package.purchase.initiated',
      package_purchase_completed: 'billing.package.purchase.completed',
      webhook_received: 'billing.webhook.received',
      webhook_processed: 'billing.webhook.processed',
      webhook_failed: 'billing.webhook.failed',
    };

    return actionMap[eventType];
  }

  /**
   * Sanitize metadata to remove sensitive information
   */
  private sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...metadata };

    // Remove sensitive fields
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'key',
      'credential',
      'stripe_secret',
      'api_key',
      'private_key',
    ];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}

// Export singleton instance for convenience
let billingAuditLoggerInstance: BillingAuditLogger | null = null;

export function getBillingAuditLogger(): BillingAuditLogger {
  if (!billingAuditLoggerInstance) {
    billingAuditLoggerInstance = new BillingAuditLogger();
  }
  return billingAuditLoggerInstance;
}
