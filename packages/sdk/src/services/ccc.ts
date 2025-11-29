import { HTTPClient } from '../transport/http.js';
import { RetryStrategy } from '../resilience/retry.js';
import { CircuitBreaker } from '../resilience/circuit-breaker.js';
import { IdempotencyManager } from '../resilience/idempotency.js';
import {
  CCCBalance,
  CCCHistory,
  CCCTransferRequest,
  CCCStakeRequest,
  CCCBalanceSchema,
  CCCHistorySchema,
  CCCTransferRequestSchema,
  CCCStakeRequestSchema,
} from '../types/ccc.js';

export class CCCService {
  constructor(
    private readonly http: HTTPClient,
    private readonly retry: RetryStrategy,
    private readonly circuit: CircuitBreaker,
    private readonly idempotency: IdempotencyManager
  ) {}

  /**
   * Get CCC balance
   */
  async getBalance(): Promise<CCCBalance> {
    return this.circuit.execute(() =>
      this.retry.execute(async () => {
        const response = await this.http.request({
          method: 'GET',
          path: '/api/ccc/balance',
        });
        return CCCBalanceSchema.parse(response);
      })
    );
  }

  /**
   * Get CCC transaction history
   */
  async getHistory(options?: { page?: number; pageSize?: number }): Promise<CCCHistory> {
    return this.circuit.execute(() =>
      this.retry.execute(async () => {
        const response = await this.http.request({
          method: 'GET',
          path: '/api/ccc/history',
          query: {
            page: options?.page ?? 1,
            pageSize: options?.pageSize ?? 50,
          },
        });
        return CCCHistorySchema.parse(response);
      })
    );
  }

  /**
   * Transfer CCC to another agent
   */
  async transfer(request: CCCTransferRequest): Promise<void> {
    const validated = CCCTransferRequestSchema.parse(request);
    const key = await this.idempotency.generateKey('ccc.transfer', validated);

    return this.idempotency.execute(key, () =>
      this.circuit.execute(() =>
        this.retry.execute(async () => {
          await this.http.request({
            method: 'POST',
            path: '/api/ccc/transfer',
            body: validated,
          });
        })
      )
    );
  }

  /**
   * Stake CCC for trust weight
   */
  async stake(request: CCCStakeRequest): Promise<void> {
    const validated = CCCStakeRequestSchema.parse(request);
    const key = await this.idempotency.generateKey('ccc.stake', validated);

    return this.idempotency.execute(key, () =>
      this.circuit.execute(() =>
        this.retry.execute(async () => {
          await this.http.request({
            method: 'POST',
            path: '/api/ccc/stake',
            body: validated,
          });
        })
      )
    );
  }

  /**
   * Unstake CCC
   */
  async unstake(amount: number): Promise<void> {
    const key = await this.idempotency.generateKey('ccc.unstake', { amount });

    return this.idempotency.execute(key, () =>
      this.circuit.execute(() =>
        this.retry.execute(async () => {
          await this.http.request({
            method: 'POST',
            path: '/api/ccc/unstake',
            body: { amount },
          });
        })
      )
    );
  }
}
