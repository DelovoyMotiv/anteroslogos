/**
 * Agent Surface — Reachability Integration Test (Task 14.1)
 *
 * Iterates every endpoint the Capability Registry declares as LIVE
 * (`advertisedEndpoints()` from `lib/agentSurface/capabilityRegistry.ts`) and
 * asserts that a *documented* request to the deployed handler returns an HTTP
 * status other than 404. This is the runtime counterpart to the static
 * discovery/mirror validation: not only must every advertised endpoint map to
 * a deployed `api/**` file, invoking each one with a documented request must
 * actually resolve (never a 404).
 *
 * The endpoint → { handler, documented request } table is checked for
 * completeness against `advertisedEndpoints()` so that adding a new LIVE
 * endpoint to the registry without giving it reachability coverage fails this
 * test.
 *
 * **Validates: Requirements 1.2**
 *
 * @vitest-environment node
 */

import './setup';
import { describe, it, expect } from 'vitest';
import { createMockRequest, createMockResponse } from './helpers';
import { advertisedEndpoints } from '../../lib/agentSurface/capabilityRegistry';

// Deployed serverless handlers backing the advertised endpoints.
import a2aHandler from '../a2a';
import mcpHandler from '../mcp/index';
import capabilitiesHandler from '../capabilities';
import verifyHandler from '../verify';
import toolsSearchHandler from '../tools/search';
import authHandler from '../auth';
import challengeHandler from '../challenge';
import publicAidHandler from '../public-aid';
import systemHandler from '../system';

type Handler = (req: any, res: any) => Promise<unknown> | unknown;

interface EndpointCase {
  /** The deployed handler for the endpoint. */
  handler: Handler;
  /** A documented request that must resolve (never 404). */
  request: Parameters<typeof createMockRequest>[0];
  /** Optional description of the documented request. */
  doc: string;
}

/**
 * Map each advertised endpoint to its deployed handler plus a documented
 * request. Requests are chosen to be side-effect-free (no outbound network,
 * no database) so the test exercises reachability, not heavy work.
 */
const ENDPOINT_CASES: Record<string, EndpointCase> = {
  '/api/a2a': {
    handler: a2aHandler,
    request: { method: 'GET' },
    doc: 'GET returns the A2A discovery descriptor',
  },
  '/api/mcp': {
    handler: mcpHandler,
    request: { method: 'GET' },
    doc: 'GET returns the MCP server descriptor',
  },
  '/api/capabilities': {
    handler: capabilitiesHandler,
    request: { method: 'GET' },
    doc: 'GET returns the capability descriptor',
  },
  '/api/verify': {
    handler: verifyHandler,
    request: {
      method: 'POST',
      body: {
        mode: 'signature',
        message: 'hello',
        publicKey: '0'.repeat(64),
        signature: '0'.repeat(128),
      },
    },
    doc: 'POST signature-mode verification request',
  },
  '/api/tools/search': {
    handler: toolsSearchHandler,
    request: { method: 'GET', query: { query: 'audit' } },
    doc: 'GET tool search with a documented query',
  },
  '/api/auth': {
    handler: authHandler,
    request: { method: 'GET' },
    doc: 'GET returns the handshake documentation',
  },
  '/api/challenge': {
    handler: challengeHandler,
    request: { method: 'GET', query: { aip: 'aip://test-agent/abc123' } },
    doc: 'GET issues an Ed25519 challenge',
  },
  '/api/public-aid': {
    handler: publicAidHandler,
    request: { method: 'GET' },
    doc: 'GET generates an aip:// identity',
  },
  '/api/system': {
    handler: systemHandler,
    request: { method: 'GET', query: { action: 'health' } },
    doc: 'GET health check',
  },
};

describe('Agent Surface — advertised endpoint reachability (Requirement 1.2)', () => {
  const endpoints = advertisedEndpoints();

  it('has a documented reachability case for every advertised LIVE endpoint', () => {
    // If a new LIVE endpoint lands in the registry, it must gain coverage here.
    const covered = new Set(Object.keys(ENDPOINT_CASES));
    const uncovered = endpoints.filter((e) => !covered.has(e));
    expect(uncovered).toEqual([]);
  });

  it.each(endpoints)(
    'advertised endpoint %s responds with a status other than 404',
    async (endpoint) => {
      const testCase = ENDPOINT_CASES[endpoint];
      expect(
        testCase,
        `No documented request defined for advertised endpoint ${endpoint}`
      ).toBeDefined();

      const req = createMockRequest(testCase.request);
      const res = createMockResponse();

      await testCase.handler(req, res);

      // Requirement 1.2: a documented request must never yield a 404.
      expect(res.statusCode).toBeDefined();
      expect(res.statusCode).not.toBe(404);
      // A documented request resolves successfully (2xx) rather than erroring.
      expect(res.statusCode).toBeGreaterThanOrEqual(200);
      expect(res.statusCode).toBeLessThan(300);
      expect(res.ended).toBe(true);
    }
  );
});
