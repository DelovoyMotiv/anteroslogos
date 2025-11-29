import { HTTPClient } from '../transport/http.js';
import { RetryStrategy } from '../resilience/retry.js';
import { CircuitBreaker } from '../resilience/circuit-breaker.js';
import { IdempotencyManager } from '../resilience/idempotency.js';
import {
  KnowledgeGraphRequest,
  KnowledgeGraphResult,
  KnowledgeGraphRequestSchema,
  KnowledgeGraphResultSchema,
} from '../types/knowledge-graph.js';

export class KnowledgeGraphService {
  constructor(
    private readonly http: HTTPClient,
    private readonly retry: RetryStrategy,
    private readonly circuit: CircuitBreaker,
    private readonly idempotency: IdempotencyManager
  ) {}

  /**
   * Extract knowledge graph from URL
   */
  async extract(request: KnowledgeGraphRequest): Promise<KnowledgeGraphResult> {
    const validated = KnowledgeGraphRequestSchema.parse(request);
    const key = await this.idempotency.generateKey('knowledge-graph.extract', validated);

    return this.idempotency.execute(key, () =>
      this.circuit.execute(() =>
        this.retry.execute(async () => {
          const response = await this.http.request({
            method: 'POST',
            path: '/api/knowledge-graph/extract',
            body: validated,
          });
          return KnowledgeGraphResultSchema.parse(response);
        })
      )
    );
  }
}
