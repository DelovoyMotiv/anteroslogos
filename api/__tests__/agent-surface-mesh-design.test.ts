/**
 * Agent Surface — Mesh DESIGN Statement Test (Task 14.2)
 *
 * Asserts that the Mesh subsystem is declared `DESIGN` — with an explicit
 * "cannot run on serverless / needs a persistent host" note — everywhere it is
 * surfaced to an agent:
 *   1. The Capability Registry (single source of truth).
 *   2. The served descriptor at `/api/capabilities`.
 *   3. The static discovery files (`agent.json`, `capabilities.json`).
 *   4. The JS-free mirror (`llms.txt`, `llms-full.txt`).
 *
 * This encodes Requirement 7.2: the Mesh subsystem is DESIGN in its entirety
 * and the surface states that a running swarm requires a separate persistent
 * host and does not run on the serverless production environment.
 *
 * **Validates: Requirements 7.2**
 *
 * @vitest-environment node
 */

import './setup';
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createMockRequest, createMockResponse } from './helpers';
import { CAPABILITY_REGISTRY } from '../../lib/agentSurface/capabilityRegistry';
import capabilitiesHandler from '../capabilities';

const ROOT = process.cwd();

/** Read a repo-relative UTF-8 file. */
function readRepoFile(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), 'utf-8');
}

/**
 * A note counts as a "serverless-cannot-run" statement when it mentions both
 * the serverless constraint and the need for a separate persistent host/swarm.
 */
function statesServerlessCannotRun(note: string): boolean {
  const lower = note.toLowerCase();
  const mentionsServerless = lower.includes('serverless');
  const mentionsPersistentSwarm =
    lower.includes('persistent') || lower.includes('swarm') || lower.includes('long-lived');
  return mentionsServerless && mentionsPersistentSwarm;
}

describe('Agent Surface — Mesh subsystem is DESIGN with a serverless note (Requirement 7.2)', () => {
  describe('Capability Registry (source of truth)', () => {
    it('declares mesh as DESIGN with a serverless-cannot-run note and no resolving endpoint', () => {
      const mesh = CAPABILITY_REGISTRY.capabilities.find((c) => c.id === 'mesh');
      expect(mesh).toBeDefined();
      expect(mesh!.status).toBe('DESIGN');
      expect(mesh!.endpoint).toBeUndefined();
      expect(mesh!.note).toBeTruthy();
      expect(statesServerlessCannotRun(mesh!.note as string)).toBe(true);
    });
  });

  describe('Served descriptor (/api/capabilities)', () => {
    let body: any;

    beforeAll(async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      await capabilitiesHandler(req, res);
      expect(res.statusCode).toBe(200);
      body = res.jsonData;
    });

    it('lists mesh in the subsystem matrix as DESIGN with a serverless-cannot-run note', () => {
      expect(body).toBeDefined();
      expect(Array.isArray(body.subsystems)).toBe(true);
      const mesh = body.subsystems.find((s: any) => s.name === 'mesh');
      expect(mesh).toBeDefined();
      expect(mesh.status).toBe('DESIGN');
      expect(mesh.note).toBeTruthy();
      expect(statesServerlessCannotRun(mesh.note)).toBe(true);
      // A DESIGN subsystem exposes no live operations.
      expect(mesh.liveOperations).toBeUndefined();
    });
  });

  describe('Discovery files', () => {
    it.each(['public/.well-known/agent.json', 'public/.well-known/capabilities.json'])(
      '%s declares mesh as DESIGN with a serverless-cannot-run note',
      (relPath) => {
        const parsed = JSON.parse(readRepoFile(relPath));
        expect(Array.isArray(parsed.subsystems)).toBe(true);
        const mesh = parsed.subsystems.find((s: any) => s.name === 'mesh');
        expect(mesh).toBeDefined();
        expect(mesh.status).toBe('DESIGN');
        expect(mesh.note).toBeTruthy();
        expect(statesServerlessCannotRun(mesh.note)).toBe(true);
      }
    );
  });

  describe('JS-free mirror', () => {
    it.each(['public/llms.txt', 'public/llms-full.txt'])(
      '%s states mesh Capability_Status = DESIGN and cannot run on serverless',
      (relPath) => {
        const text = readRepoFile(relPath).toLowerCase();
        // The mirror declares the mesh status inline, e.g.
        // "Capability_Status mesh = DESIGN — ... cannot run on stateless serverless".
        expect(text).toMatch(/mesh\s*=\s*design/);
        expect(text).toContain('serverless');
        // And states a persistent host / swarm is required.
        expect(text).toMatch(/persistent|swarm|long-lived/);
      }
    );
  });
});
