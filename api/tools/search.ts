/**
 * Tool Search Endpoint (`/api/tools/search`)
 *
 * A thin transport adapter (design AD1 — no business logic reimplemented) that
 * exposes the semantic tool-search library over HTTP as a deployed Vercel
 * serverless function. Only files under `api/` (matching the deployed
 * serverless glob in `vercel.json`) are deployed, so the search logic that
 * previously lived at the
 * non-deployed `app/api/tools/search/route.ts` is surfaced here by delegating
 * to its exported `searchTools` implementation. Nothing is reimplemented — this
 * file only adapts the Vercel `(req, res)` request/response contract onto the
 * existing library function.
 *
 * `GET /api/tools/search?query=<search>&limit=<n>` performs a BM25-like
 * semantic search (Fuse.js) over the aggregated OpenAI/Claude/Grok tool
 * schemas and returns the ranked results.
 *
 * Feature: agent-surface-truth
 * Requirements: 1.1, 1.2
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../../lib/validation/middleware';
import { searchTools } from '../../app/api/tools/search/route';

// Bound the caller-supplied limit to the same window the library enforces.
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

/** Parse a single query-string value that may arrive as string | string[]. */
function firstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** Resolve the `limit` query param to a bounded positive integer. */
function parseLimit(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_LIMIT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Tool search is a read; only GET is accepted.
  if (req.method !== 'GET') {
    res.status(405).json({
      error: 'Method not allowed',
      allowed: ['GET'],
      received: req.method,
    });
    return;
  }

  // Accept both `query` (canonical, per discovery/docs) and the shorthand `q`.
  const query = firstValue(req.query.query as string | string[] | undefined)
    ?? firstValue(req.query.q as string | string[] | undefined)
    ?? '';
  const limit = parseLimit(firstValue(req.query.limit as string | string[] | undefined));

  if (!query || query.trim().length < 2) {
    res.status(400).json({
      error: 'Query parameter "query" is required and must be at least 2 characters.',
    });
    return;
  }

  res.status(200).json(searchTools(query, limit));
}

// Apply CORS (side-effect-free); GET/OPTIONS are handled by the middleware.
export default withCors(handler);
