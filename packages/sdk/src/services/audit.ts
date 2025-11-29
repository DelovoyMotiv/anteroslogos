import { HTTPClient } from '../transport/http.js';
import { RetryStrategy } from '../resilience/retry.js';
import { CircuitBreaker } from '../resilience/circuit-breaker.js';
import { IdempotencyManager } from '../resilience/idempotency.js';
import {
  AuditRequest,
  AuditResult,
  BatchAuditRequest,
  BatchAuditResult,
  AuditRequestSchema,
  AuditResultSchema,
  BatchAuditRequestSchema,
  BatchAuditResultSchema,
} from '../types/audit.js';

export class AuditService {
  constructor(
    private readonly http: HTTPClient,
    private readonly retry: RetryStrategy,
    private readonly circuit: CircuitBreaker,
    private readonly idempotency: IdempotencyManager
  ) {}

  /**
   * Create a single GEO audit
   */
  async create(request: AuditRequest): Promise<AuditResult> {
    const validated = AuditRequestSchema.parse(request);
    const key = await this.idempotency.generateKey('audit.create', validated);

    return this.idempotency.execute(key, () =>
      this.circuit.execute(() =>
        this.retry.execute(async () => {
          const response = await this.http.request({
            method: 'POST',
            path: '/api/audit',
            body: validated,
          });
          return AuditResultSchema.parse(response);
        })
      )
    );
  }

  /**
   * Get audit by ID
   */
  async get(id: string): Promise<AuditResult> {
    return this.circuit.execute(() =>
      this.retry.execute(async () => {
        const response = await this.http.request({
          method: 'GET',
          path: `/api/audit/${encodeURIComponent(id)}`,
        });
        return AuditResultSchema.parse(response);
      })
    );
  }

  /**
   * Create batch audit (max 100 URLs)
   */
  async batch(request: BatchAuditRequest): Promise<BatchAuditResult> {
    const validated = BatchAuditRequestSchema.parse(request);
    const key = await this.idempotency.generateKey('audit.batch', validated);

    return this.idempotency.execute(key, () =>
      this.circuit.execute(() =>
        this.retry.execute(async () => {
          const response = await this.http.request({
            method: 'POST',
            path: '/api/audit/batch',
            body: validated,
          });
          return BatchAuditResultSchema.parse(response);
        })
      )
    );
  }

  /**
   * Get batch audit status by ID
   */
  async getBatch(batchId: string): Promise<BatchAuditResult> {
    return this.circuit.execute(() =>
      this.retry.execute(async () => {
        const response = await this.http.request({
          method: 'GET',
          path: `/api/audit/batch/${encodeURIComponent(batchId)}`,
        });
        return BatchAuditResultSchema.parse(response);
      })
    );
  }
}
