import { HTTPClient } from '../transport/http.js';
import { RetryStrategy } from '../resilience/retry.js';
import { CircuitBreaker } from '../resilience/circuit-breaker.js';
import { IdempotencyManager } from '../resilience/idempotency.js';
import {
  CitationRequest,
  CitationResult,
  CitationRequestSchema,
  CitationResultSchema,
} from '../types/citation.js';

export class CitationService {
  constructor(
    private readonly http: HTTPClient,
    private readonly retry: RetryStrategy,
    private readonly circuit: CircuitBreaker,
    private readonly idempotency: IdempotencyManager
  ) {}

  /**
   * Predict citation probability for URL
   */
  async predict(request: CitationRequest): Promise<CitationResult> {
    const validated = CitationRequestSchema.parse(request);
    const key = await this.idempotency.generateKey('citation.predict', validated);

    return this.idempotency.execute(key, () =>
      this.circuit.execute(() =>
        this.retry.execute(async () => {
          const response = await this.http.request({
            method: 'POST',
            path: '/api/citation/predict',
            body: validated,
          });
          return CitationResultSchema.parse(response);
        })
      )
    );
  }
}
