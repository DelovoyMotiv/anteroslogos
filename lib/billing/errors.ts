/**
 * Billing Service Error Classes
 * Custom error types for CCC billing operations
 */

export class InsufficientFundsError extends Error {
  constructor(
    public required: number,
    public available: number,
    public operation: string
  ) {
    super(
      `Insufficient funds: ${operation} requires ${required} CCC, but only ${available} CCC available`
    );
    this.name = 'InsufficientFundsError';
  }
}

export class BillingTransactionError extends Error {
  constructor(
    public userId: string,
    public operation: string,
    public cause: Error
  ) {
    super(
      `Billing transaction failed for user ${userId} during ${operation}: ${cause.message}`
    );
    this.name = 'BillingTransactionError';
  }
}

export class MigrationError extends Error {
  constructor(
    public userId: string,
    public reason: string
  ) {
    super(`Subscription migration failed for user ${userId}: ${reason}`);
    this.name = 'MigrationError';
  }
}
