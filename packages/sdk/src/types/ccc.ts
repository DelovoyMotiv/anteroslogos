import { z } from 'zod';

/**
 * CCC transaction type
 */
export const TransactionTypeSchema = z.enum(['earn', 'spend', 'stake', 'unstake', 'transfer']);
export type TransactionType = z.infer<typeof TransactionTypeSchema>;

/**
 * CCC balance query result
 */
export const CCCBalanceSchema = z.object({
  userId: z.string(),
  balance: z.number(),
  staked: z.number(),
  available: z.number(),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
}).strict();
export type CCCBalance = z.infer<typeof CCCBalanceSchema>;

/**
 * CCC transaction record
 */
export const CCCTransactionSchema = z.object({
  id: z.string(),
  type: TransactionTypeSchema,
  amount: z.number(),
  balance: z.number(),
  timestamp: z.number(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict();
export type CCCTransaction = z.infer<typeof CCCTransactionSchema>;

/**
 * CCC transaction history result
 */
export const CCCHistorySchema = z.object({
  transactions: z.array(CCCTransactionSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
}).strict();
export type CCCHistory = z.infer<typeof CCCHistorySchema>;

/**
 * CCC transfer request
 */
export const CCCTransferRequestSchema = z.object({
  recipient: z.string(),
  amount: z.number().positive(),
  memo: z.string().optional(),
}).strict();
export type CCCTransferRequest = z.infer<typeof CCCTransferRequestSchema>;

/**
 * CCC stake request
 */
export const CCCStakeRequestSchema = z.object({
  amount: z.number().positive(),
  duration: z.number().positive().optional(),
}).strict();
export type CCCStakeRequest = z.infer<typeof CCCStakeRequestSchema>;
