/**
 * Capabilities Descriptor Endpoint (`/api/capabilities`)
 *
 * A thin transport adapter (design AD1 — no business logic reimplemented) that
 * serves the machine-readable capability descriptor built from the Capability
 * Registry (`lib/agentSurface/capabilityRegistry.ts`), the single source of
 * truth for what the agent surface can do and whether each thing is `LIVE`
 * (callable now) or `DESIGN` (implemented/specified but not runnable in the
 * production serverless environment).
 *
 * Only a GET request returns HTTP 200 with the descriptor. Every advertised
 * `LIVE` entry carries a resolving endpoint and every `DESIGN` entry does not —
 * an invariant enforced by the registry itself at module load.
 *
 * The registry declares the subsystem status matrix (mesh, pbft, ccc,
 * watermark) as capability entries with stable ids; this endpoint splits those
 * out into a dedicated `subsystems` matrix so agents get both a flat capability
 * list and the honest LIVE/DESIGN state of each major subsystem.
 *
 * Feature: agent-surface-truth
 * Requirements: 3.1, 3.2, 3.3
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../lib/validation/middleware';
import {
  CAPABILITY_REGISTRY,
  type CapabilityEntry,
  type CapabilityStatus,
} from '../lib/agentSurface/capabilityRegistry';
import { A2A_VERSION } from '../lib/a2a/protocol';

// =====================================================
// TYPES
// =====================================================

/** Stable ids of the subsystem status-matrix entries in the registry. */
const SUBSYSTEM_NAMES = ['mesh', 'pbft', 'ccc', 'watermark'] as const;
type SubsystemName = (typeof SUBSYSTEM_NAMES)[number];

const SUBSYSTEM_NAME_SET: ReadonlySet<string> = new Set(SUBSYSTEM_NAMES);

interface CapabilityDescriptorEntry {
  id: string;
  description: string;
  status: CapabilityStatus;
  endpoint?: string;
  method?: string;
  note?: string;
}

interface SubsystemDescriptorEntry {
  name: SubsystemName;
  status: CapabilityStatus;
  liveOperations?: string[];
  note: string;
}

interface CapabilitiesResponse {
  version: string;
  protocol: string;
  capabilities: CapabilityDescriptorEntry[];
  subsystems: SubsystemDescriptorEntry[];
}

// =====================================================
// DESCRIPTOR BUILDER (registry-backed)
// =====================================================

/** Project a registry entry onto the served capability shape (omit blanks). */
function toCapabilityEntry(entry: CapabilityEntry): CapabilityDescriptorEntry {
  const projected: CapabilityDescriptorEntry = {
    id: entry.id,
    description: entry.description,
    status: entry.status,
  };
  if (typeof entry.endpoint === 'string' && entry.endpoint.length > 0) {
    projected.endpoint = entry.endpoint;
  }
  if (typeof entry.method === 'string' && entry.method.length > 0) {
    projected.method = entry.method;
  }
  if (typeof entry.note === 'string' && entry.note.length > 0) {
    projected.note = entry.note;
  }
  return projected;
}

/** Project a subsystem registry entry onto the served subsystem shape. */
function toSubsystemEntry(entry: CapabilityEntry): SubsystemDescriptorEntry {
  const subsystem: SubsystemDescriptorEntry = {
    name: entry.id as SubsystemName,
    status: entry.status,
    note: entry.note ?? entry.description,
  };
  // A LIVE subsystem resolves through a real endpoint; surface it as the
  // subsystem's live operation so agents know what actually works today.
  if (
    entry.status === 'LIVE' &&
    typeof entry.endpoint === 'string' &&
    entry.endpoint.length > 0
  ) {
    subsystem.liveOperations = [entry.endpoint];
  }
  return subsystem;
}

/**
 * Build the full capabilities descriptor from the registry. Subsystem entries
 * (mesh/pbft/ccc/watermark) are pulled into the dedicated `subsystems` matrix;
 * everything else is served as a flat capability.
 */
function buildCapabilitiesResponse(): CapabilitiesResponse {
  const capabilities: CapabilityDescriptorEntry[] = [];
  const subsystems: SubsystemDescriptorEntry[] = [];

  for (const entry of CAPABILITY_REGISTRY.capabilities) {
    if (SUBSYSTEM_NAME_SET.has(entry.id)) {
      subsystems.push(toSubsystemEntry(entry));
    } else {
      capabilities.push(toCapabilityEntry(entry));
    }
  }

  return {
    version: CAPABILITY_REGISTRY.version,
    protocol: `A2A ${A2A_VERSION}`,
    capabilities,
    subsystems,
  };
}

// =====================================================
// HANDLER
// =====================================================

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Only GET returns the descriptor; anything else is not allowed.
  if (req.method !== 'GET') {
    res.status(405).json({
      error: 'Method not allowed',
      allowed: ['GET'],
      received: req.method,
    });
    return;
  }

  res.status(200).json(buildCapabilitiesResponse());
}

// Apply CORS (side-effect-free); GET/OPTIONS are handled by the middleware.
export default withCors(handler);
