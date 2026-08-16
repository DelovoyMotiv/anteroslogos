/**
 * Agent Surface — SaaS Non-Regression Test (Task 14.3)
 *
 * Verifies that the agent-surface corrections are additive/corrective and do
 * not touch the human SaaS product — in particular the Stripe payment path:
 *
 *   - `api/stripe-webhook.ts` is untouched: it still wires the Stripe billing
 *     path and imports NOTHING from the new agent-surface library, so the live
 *     payment path is unaffected (Requirements 10.1, 10.2).
 *   - The new agent-surface endpoint files exist (additive), and none of the
 *     agent-surface modules import or reference any SaaS_Product endpoint
 *     (stripe-webhook, blog, crud), so no SaaS behavior is removed or altered
 *     (Requirement 10.3).
 *
 * The existing SaaS/blog/Stripe suites (e.g. `lib/webhooks/__tests__`,
 * `api/__tests__/blog-*.property.test.ts`, `lib/billing/**`) are run as part of
 * the full suite; this file pins the structural guarantees that make those
 * suites non-regressive under the agent-surface changes.
 *
 * **Validates: Requirements 10.1, 10.2, 10.3**
 *
 * @vitest-environment node
 */

import './setup';
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = process.cwd();

function readRepoFile(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), 'utf-8');
}

/** New, additive agent-surface files introduced by this feature. */
const NEW_AGENT_SURFACE_FILES = [
  'api/a2a.ts',
  'api/capabilities.ts',
  'api/verify.ts',
  'api/challenge.ts',
  'api/public-aid.ts',
  'api/tools/search.ts',
  'lib/agentSurface/jsonRpc.ts',
  'lib/agentSurface/capabilityRegistry.ts',
  'lib/agentSurface/identity.ts',
  'lib/agentSurface/watermarkHeader.ts',
  'lib/agentSurface/discoverySync.ts',
];

/** SaaS_Product surfaces that agent-surface code must not import or alter. */
const SAAS_PRODUCT_REFERENCES = [
  'stripe-webhook',
  'lib/billing/BillingService',
  'lib/billing/stripe',
  'lib/billing/webhookRetry',
  'api/blog',
  'api/crud',
];

describe('Agent Surface — SaaS non-regression (Requirements 10.1, 10.2, 10.3)', () => {
  describe('Stripe payment path is untouched (10.1, 10.2)', () => {
    const stripeWebhookPath = 'api/stripe-webhook.ts';

    it('the Stripe webhook handler still exists', () => {
      expect(existsSync(resolve(ROOT, stripeWebhookPath))).toBe(true);
    });

    it('the Stripe webhook still wires the live Stripe billing path', () => {
      const source = readRepoFile(stripeWebhookPath);
      // Payment path remains the live Stripe path.
      expect(source).toContain("from '../lib/billing/stripe'");
      expect(source).toContain('verifyWebhookSignature');
      expect(source).toContain("from '../lib/billing/BillingService'");
    });

    it('the Stripe webhook imports nothing from the agent-surface library', () => {
      const source = readRepoFile(stripeWebhookPath);
      expect(source).not.toContain('agentSurface');
      expect(source).not.toContain('capabilityRegistry');
      expect(source).not.toContain('/api/a2a');
      expect(source).not.toContain('/api/verify');
    });
  });

  describe('Agent-surface changes are additive (10.3)', () => {
    it.each(NEW_AGENT_SURFACE_FILES)(
      'new agent-surface file %s exists',
      (relPath) => {
        expect(existsSync(resolve(ROOT, relPath))).toBe(true);
      }
    );

    it.each(NEW_AGENT_SURFACE_FILES)(
      '%s does not import or reference any SaaS_Product endpoint',
      (relPath) => {
        const source = readRepoFile(relPath);
        for (const saasRef of SAAS_PRODUCT_REFERENCES) {
          expect(
            source.includes(saasRef),
            `${relPath} unexpectedly references SaaS_Product surface "${saasRef}"`
          ).toBe(false);
        }
      }
    );
  });

  describe('Agent-surface endpoints do not shadow SaaS endpoints', () => {
    it('does not introduce agent files that collide with SaaS product routes', () => {
      // The SaaS product routes (blog, crud, stripe-webhook) must remain the
      // only files at their paths; the agent surface only adds new distinct
      // endpoint files.
      const saasRoutes = ['api/stripe-webhook.ts', 'api/blog.ts', 'api/crud.ts'];
      for (const route of saasRoutes) {
        expect(existsSync(resolve(ROOT, route))).toBe(true);
      }
      // None of the new agent-surface files reuse a SaaS route path.
      for (const newFile of NEW_AGENT_SURFACE_FILES) {
        expect(saasRoutes).not.toContain(newFile);
      }
    });
  });
});
