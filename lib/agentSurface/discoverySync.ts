/**
 * Discovery + JS-free mirror generation and validation for the agent surface.
 *
 * This module is Component 9 of the agent-surface-truth design (AD2). It has
 * two responsibilities, both driven by the single source of truth in
 * `capabilityRegistry.ts`:
 *
 *   1. GENERATION — produce the endpoint/capability/subsystem "sections" that
 *      the static discovery files (`agent.json`, `agent-card.json`,
 *      `capabilities.json`, `mcp-manifest.json`) and the JS-free mirror
 *      (`llms.txt`, `llms-full.txt`) must agree with. Tasks 13.2/13.3 consume
 *      these sections to rewrite the actual artifacts.
 *
 *   2. VALIDATION — given the *parsed* contents of those artifacts, assert the
 *      truthfulness invariants and return a structured pass/fail result with
 *      human-readable reasons:
 *        - the advertised-endpoint set in the discovery files equals the set in
 *          the JS-free mirror (Requirements 1.4, 8.5);
 *        - every advertised endpoint appears in `advertisedEndpoints()` and maps
 *          to a deployed file under `api/**` (Requirement 1.1);
 *        - every subsystem carries an identical `Capability_Status` across the
 *          discovery files and the mirror (Requirement 8.4);
 *        - canonical identity references use the `aip://` scheme and the
 *          resolving identity endpoint (`/api/auth`), never the legacy
 *          `/api/public-aid` / `/api/challenge` aliases as the canonical path
 *          (Requirements 5.1, 5.3, 8.3).
 *
 * The functions here are intentionally PURE: generators take the registry and
 * return plain data; validators take already-parsed inputs and return results.
 * Filesystem access (reading discovery files, listing `api/**`) is the caller's
 * job so this module stays deterministic and unit-testable.
 *
 * Feature: agent-surface-truth
 * Requirements: 1.4, 8.5 (plus 1.1, 5.1, 5.3, 8.3, 8.4 exercised by validators)
 */

import {
  CAPABILITY_REGISTRY,
  advertisedEndpoints,
  liveMethods,
  type CapabilityEntry,
  type CapabilityRegistry,
  type CapabilityStatus,
} from './capabilityRegistry';

// =====================================================
// CONSTANTS
// =====================================================

/** The canonical AIP identity URI scheme (Requirements 5.1, 8.3). */
export const AIP_SCHEME = 'aip://';

/** The legacy AID scheme, permitted only on explicitly labeled aliases. */
export const AID_SCHEME = 'aid://';

/**
 * The canonical, resolving identity endpoint. Discovery/mirror artifacts must
 * point their canonical identity references here, NOT at the legacy aliases
 * (Requirement 5.3).
 */
export const CANONICAL_IDENTITY_ENDPOINT = '/api/auth';

/**
 * Legacy AID alias endpoints. They resolve (as delegating aliases) but must not
 * be advertised as the canonical identity path (Requirement 5.3).
 */
export const LEGACY_IDENTITY_ALIASES = ['/api/public-aid', '/api/challenge'];

/** The stable ids of the four named subsystems (design subsystem matrix). */
export const SUBSYSTEM_IDS = ['mesh', 'pbft', 'ccc', 'watermark'] as const;

export type SubsystemId = (typeof SUBSYSTEM_IDS)[number];

// =====================================================
// GENERATION TYPES
// =====================================================

/** A single capability row emitted for the discovery/mirror artifacts. */
export interface CapabilitySectionEntry {
  id: string;
  description: string;
  status: CapabilityStatus;
  endpoint?: string;
  method?: string;
  note?: string;
}

/** A subsystem row emitted for the discovery/mirror artifacts. */
export interface SubsystemSectionEntry {
  name: string;
  status: CapabilityStatus;
  note?: string;
}

/**
 * The generated sections that every discovery file and the JS-free mirror must
 * agree with. This is the shape tasks 13.2/13.3 project into each concrete
 * artifact format.
 */
export interface DiscoverySections {
  version: string;
  /** Sorted, de-duplicated set of endpoint paths that MUST resolve. */
  endpoints: string[];
  /** JSON-RPC / tool method names that route to a working implementation. */
  liveMethods: string[];
  /** Full capability list (LIVE and DESIGN) with status labels. */
  capabilities: CapabilitySectionEntry[];
  /** The four named subsystems with their statuses. */
  subsystems: SubsystemSectionEntry[];
  /** Canonical identity reference every artifact must use. */
  canonicalIdentity: {
    scheme: typeof AIP_SCHEME;
    endpoint: string;
    legacyAliases: string[];
  };
}

// =====================================================
// VALIDATION TYPES
// =====================================================

/** A single validation failure with a stable code and a readable reason. */
export interface ValidationIssue {
  /** Stable machine-readable code, e.g. "endpoint_parity_mismatch". */
  code: string;
  /** Human/agent-readable explanation of what is wrong. */
  message: string;
}

/** The result of a validation check: pass/fail plus the reasons for failure. */
export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

/** A subsystem status as parsed out of a discovery file or the mirror. */
export interface ParsedSubsystemStatus {
  name: string;
  status: CapabilityStatus;
}

/** A canonical/identity reference parsed out of an artifact. */
export interface IdentityReference {
  /** Where the reference came from, for diagnostics (e.g. "agent.json:identity.generateEndpoint"). */
  source: string;
  /** True when this reference is explicitly a legacy transition alias. */
  legacy?: boolean;
  /** A URI value, when the reference is a scheme URI (e.g. "aip://acme/ab12"). */
  uri?: string;
  /** An endpoint path, when the reference names an identity endpoint. */
  endpoint?: string;
}

/**
 * The parsed inputs a caller feeds to {@link validateDiscoverySync}. Callers
 * (tests / a build script) are responsible for reading and parsing the concrete
 * artifacts into these normalized shapes.
 */
export interface ParsedArtifacts {
  /** Endpoint paths advertised across the discovery files. */
  discoveryEndpoints: string[];
  /** Endpoint paths referenced in the JS-free mirror. */
  mirrorEndpoints: string[];
  /** Subsystem statuses declared in the discovery files. */
  discoverySubsystems: ParsedSubsystemStatus[];
  /** Subsystem statuses declared in the JS-free mirror. */
  mirrorSubsystems: ParsedSubsystemStatus[];
  /** Canonical/identity references found across all artifacts. */
  identityReferences: IdentityReference[];
}

/** Options controlling how endpoint resolution is checked. */
export interface ValidateOptions {
  /**
   * The set of endpoints the registry says MUST resolve. Defaults to
   * `advertisedEndpoints()`.
   */
  registryEndpoints?: string[];
  /**
   * Repository-relative paths of deployed serverless files (e.g.
   * "api/a2a.ts", "api/mcp/index.ts"). When provided, each advertised endpoint
   * must map to one of these files. When omitted, the file-mapping check is
   * skipped and only registry membership is verified.
   */
  availableApiFiles?: string[];
}

// =====================================================
// GENERATION
// =====================================================

/** Map a registry entry to the section shape emitted for artifacts. */
function toSectionEntry(entry: CapabilityEntry): CapabilitySectionEntry {
  const section: CapabilitySectionEntry = {
    id: entry.id,
    description: entry.description,
    status: entry.status,
  };
  if (entry.endpoint !== undefined) section.endpoint = entry.endpoint;
  if (entry.method !== undefined) section.method = entry.method;
  if (entry.note !== undefined) section.note = entry.note;
  return section;
}

/**
 * Produce the full capability section (LIVE + DESIGN) from the registry, in a
 * stable, artifact-ready shape.
 */
export function generateCapabilitySection(
  registry: CapabilityRegistry = CAPABILITY_REGISTRY
): CapabilitySectionEntry[] {
  return registry.capabilities.map(toSectionEntry);
}

/**
 * Produce the subsystem section — the four named subsystems (mesh, pbft, ccc,
 * watermark) with their declared statuses — from the registry. Emitted in the
 * canonical {@link SUBSYSTEM_IDS} order so every artifact declares them
 * identically (Requirement 8.4).
 */
export function generateSubsystemSection(
  registry: CapabilityRegistry = CAPABILITY_REGISTRY
): SubsystemSectionEntry[] {
  const byId = new Map(registry.capabilities.map((c) => [c.id, c]));
  const sections: SubsystemSectionEntry[] = [];
  for (const id of SUBSYSTEM_IDS) {
    const entry = byId.get(id);
    if (!entry) {
      throw new Error(
        `discoverySync: registry is missing required subsystem "${id}".`
      );
    }
    const section: SubsystemSectionEntry = {
      name: entry.id,
      status: entry.status,
    };
    if (entry.note !== undefined) section.note = entry.note;
    sections.push(section);
  }
  return sections;
}

/**
 * Generate every section the discovery files and the JS-free mirror must agree
 * with, from the Capability Registry. This is the single generator that tasks
 * 13.2/13.3 project into each concrete artifact so all artifacts stay in sync
 * by construction.
 */
export function generateDiscoverySections(
  registry: CapabilityRegistry = CAPABILITY_REGISTRY
): DiscoverySections {
  return {
    version: registry.version,
    endpoints: sortedUnique(advertisedEndpointsFrom(registry)),
    liveMethods: liveMethodsFrom(registry),
    capabilities: generateCapabilitySection(registry),
    subsystems: generateSubsystemSection(registry),
    canonicalIdentity: {
      scheme: AIP_SCHEME,
      endpoint: CANONICAL_IDENTITY_ENDPOINT,
      legacyAliases: [...LEGACY_IDENTITY_ALIASES],
    },
  };
}

// Registry-scoped variants so the generator can operate on a supplied registry
// (useful for tests) while defaulting to the shared public helpers.
function advertisedEndpointsFrom(registry: CapabilityRegistry): string[] {
  if (registry === CAPABILITY_REGISTRY) return advertisedEndpoints();
  const set = new Set<string>();
  for (const entry of registry.capabilities) {
    if (entry.status === 'LIVE' && typeof entry.endpoint === 'string') {
      set.add(entry.endpoint);
    }
  }
  return [...set];
}

function liveMethodsFrom(registry: CapabilityRegistry): string[] {
  if (registry === CAPABILITY_REGISTRY) return liveMethods();
  const methods: string[] = [];
  for (const entry of registry.capabilities) {
    if (entry.status === 'LIVE' && typeof entry.method === 'string') {
      methods.push(entry.method);
    }
  }
  return methods;
}

// =====================================================
// NORMALIZATION HELPERS
// =====================================================

/**
 * Normalize an advertised endpoint reference to a comparable path.
 *
 * Accepts absolute URLs (`https://host/api/a2a`), path-only references
 * (`/api/a2a`), and bare paths (`api/a2a`); strips any query string and
 * fragment and any trailing slash. Returns a leading-slash path, e.g.
 * `/api/a2a`. Returns `''` for empty input.
 */
export function normalizeEndpointPath(reference: string): string {
  if (typeof reference !== 'string' || reference.length === 0) return '';

  let path = reference.trim();

  // Extract the path component from an absolute URL.
  const schemeMatch = /^[a-z][a-z0-9+.-]*:\/\//i.exec(path);
  if (schemeMatch) {
    const afterScheme = path.slice(schemeMatch[0].length);
    const slashIdx = afterScheme.indexOf('/');
    path = slashIdx === -1 ? '' : afterScheme.slice(slashIdx);
  }

  // Drop query string and fragment.
  path = path.split('?')[0].split('#')[0];

  // Trim a trailing slash (but keep a lone "/").
  if (path.length > 1) path = path.replace(/\/+$/, '');

  if (path.length === 0) return '';

  // Ensure a single leading slash.
  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * Map an advertised endpoint path to the candidate deployed serverless file
 * paths that could back it under `api/**`.
 *
 * On Vercel, `/api/foo` resolves from either `api/foo.ts` or
 * `api/foo/index.ts`. Returns candidates in that priority order. Endpoints not
 * under `/api/` yield no candidates (they cannot be backed by a serverless
 * function).
 */
export function endpointToApiFileCandidates(endpoint: string): string[] {
  const path = normalizeEndpointPath(endpoint).replace(/^\/+/, '');
  if (!path.startsWith('api/')) return [];
  return [`${path}.ts`, `${path}/index.ts`];
}

/** Sort and de-duplicate a list of strings. */
function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

/** Normalize + de-duplicate + sort a list of endpoint references. */
function toEndpointSet(refs: string[]): string[] {
  const set = new Set<string>();
  for (const ref of refs) {
    const path = normalizeEndpointPath(ref);
    if (path.length > 0) set.add(path);
  }
  return [...set].sort();
}

/** Normalize deployed api file paths for comparison (forward slashes, no leading `./`). */
function normalizeApiFilePath(filePath: string): string {
  return filePath
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
}

// =====================================================
// VALIDATORS
// =====================================================

/**
 * Assert that the set of advertised endpoints in the discovery files equals the
 * set referenced in the JS-free mirror (Requirements 1.4, 8.5).
 */
export function validateEndpointParity(
  discoveryEndpoints: string[],
  mirrorEndpoints: string[]
): ValidationResult {
  const discovery = toEndpointSet(discoveryEndpoints);
  const mirror = toEndpointSet(mirrorEndpoints);
  const discoverySet = new Set(discovery);
  const mirrorSet = new Set(mirror);

  const issues: ValidationIssue[] = [];

  const onlyInDiscovery = discovery.filter((e) => !mirrorSet.has(e));
  const onlyInMirror = mirror.filter((e) => !discoverySet.has(e));

  if (onlyInDiscovery.length > 0) {
    issues.push({
      code: 'endpoint_parity_mismatch',
      message: `Endpoints advertised in discovery files but missing from the JS-free mirror: ${onlyInDiscovery.join(
        ', '
      )}`,
    });
  }
  if (onlyInMirror.length > 0) {
    issues.push({
      code: 'endpoint_parity_mismatch',
      message: `Endpoints referenced in the JS-free mirror but missing from the discovery files: ${onlyInMirror.join(
        ', '
      )}`,
    });
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Assert that every advertised endpoint (1) appears in the registry's
 * `advertisedEndpoints()` set and (2) maps to a deployed file under `api/**`
 * (Requirement 1.1).
 *
 * The file-mapping check runs only when `availableApiFiles` is supplied;
 * otherwise just registry membership is verified.
 */
export function validateEndpointsResolve(
  advertised: string[],
  options: ValidateOptions = {}
): ValidationResult {
  const registryEndpoints = toEndpointSet(
    options.registryEndpoints ?? advertisedEndpoints()
  );
  const registrySet = new Set(registryEndpoints);
  const issues: ValidationIssue[] = [];

  const apiFileSet =
    options.availableApiFiles !== undefined
      ? new Set(options.availableApiFiles.map(normalizeApiFilePath))
      : undefined;

  for (const endpoint of toEndpointSet(advertised)) {
    if (!registrySet.has(endpoint)) {
      issues.push({
        code: 'endpoint_not_in_registry',
        message: `Advertised endpoint "${endpoint}" is not present in the Capability Registry's advertisedEndpoints().`,
      });
    }

    if (apiFileSet) {
      const candidates = endpointToApiFileCandidates(endpoint);
      const resolved = candidates.some((c) =>
        apiFileSet.has(normalizeApiFilePath(c))
      );
      if (!resolved) {
        issues.push({
          code: 'endpoint_unbacked',
          message:
            candidates.length === 0
              ? `Advertised endpoint "${endpoint}" is not under /api/ and cannot map to a deployed serverless file.`
              : `Advertised endpoint "${endpoint}" does not map to any deployed api/** file (expected one of: ${candidates.join(
                  ', '
                )}).`,
        });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Assert that every named subsystem carries an identical `Capability_Status`
 * across the discovery files and the JS-free mirror (Requirement 8.4). Also
 * flags subsystems that are missing from either artifact or carry an invalid
 * status label.
 */
export function validateSubsystemParity(
  discoverySubsystems: ParsedSubsystemStatus[],
  mirrorSubsystems: ParsedSubsystemStatus[]
): ValidationResult {
  const discovery = indexSubsystems(discoverySubsystems);
  const mirror = indexSubsystems(mirrorSubsystems);
  const issues: ValidationIssue[] = [];

  for (const id of SUBSYSTEM_IDS) {
    const d = discovery.get(id);
    const m = mirror.get(id);

    if (d === undefined) {
      issues.push({
        code: 'subsystem_missing',
        message: `Subsystem "${id}" is missing from the discovery files.`,
      });
    } else if (!isValidStatus(d)) {
      issues.push({
        code: 'subsystem_invalid_status',
        message: `Subsystem "${id}" has an invalid status "${String(
          d
        )}" in the discovery files; must be 'LIVE' or 'DESIGN'.`,
      });
    }

    if (m === undefined) {
      issues.push({
        code: 'subsystem_missing',
        message: `Subsystem "${id}" is missing from the JS-free mirror.`,
      });
    } else if (!isValidStatus(m)) {
      issues.push({
        code: 'subsystem_invalid_status',
        message: `Subsystem "${id}" has an invalid status "${String(
          m
        )}" in the JS-free mirror; must be 'LIVE' or 'DESIGN'.`,
      });
    }

    if (d !== undefined && m !== undefined && d !== m) {
      issues.push({
        code: 'subsystem_status_mismatch',
        message: `Subsystem "${id}" status differs: discovery="${d}", mirror="${m}".`,
      });
    }
  }

  return { valid: issues.length === 0, issues };
}

function indexSubsystems(
  subsystems: ParsedSubsystemStatus[]
): Map<string, CapabilityStatus> {
  const map = new Map<string, CapabilityStatus>();
  for (const s of subsystems) {
    map.set(s.name, s.status);
  }
  return map;
}

function isValidStatus(status: unknown): status is CapabilityStatus {
  return status === 'LIVE' || status === 'DESIGN';
}

/**
 * Assert that canonical identity references use the `aip://` scheme and the
 * resolving identity endpoint (`/api/auth`), and never advertise the legacy
 * `/api/public-aid` / `/api/challenge` aliases as the canonical path
 * (Requirements 5.1, 5.3, 8.3).
 *
 * References explicitly marked `legacy: true` are exempt — legacy AID paths and
 * `aid://` URIs are allowed to appear as clearly labeled transition aliases.
 */
export function validateCanonicalIdentity(
  references: IdentityReference[]
): ValidationResult {
  const issues: ValidationIssue[] = [];

  for (const ref of references) {
    if (ref.legacy) continue;

    if (typeof ref.uri === 'string' && ref.uri.length > 0) {
      if (ref.uri.startsWith(AID_SCHEME)) {
        issues.push({
          code: 'identity_non_aip_scheme',
          message: `Canonical identity reference at ${ref.source} uses the legacy "${AID_SCHEME}" scheme; canonical references must use "${AIP_SCHEME}".`,
        });
      } else if (!ref.uri.startsWith(AIP_SCHEME)) {
        issues.push({
          code: 'identity_non_aip_scheme',
          message: `Canonical identity reference at ${ref.source} ("${ref.uri}") does not use the "${AIP_SCHEME}" scheme.`,
        });
      }
    }

    if (typeof ref.endpoint === 'string' && ref.endpoint.length > 0) {
      const path = normalizeEndpointPath(ref.endpoint);
      if (LEGACY_IDENTITY_ALIASES.includes(path)) {
        issues.push({
          code: 'identity_legacy_endpoint_as_canonical',
          message: `Canonical identity reference at ${ref.source} points at legacy alias "${path}"; the canonical identity endpoint is "${CANONICAL_IDENTITY_ENDPOINT}".`,
        });
      } else if (path !== CANONICAL_IDENTITY_ENDPOINT) {
        issues.push({
          code: 'identity_non_canonical_endpoint',
          message: `Canonical identity reference at ${ref.source} points at "${path}" rather than the canonical identity endpoint "${CANONICAL_IDENTITY_ENDPOINT}".`,
        });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Run every discovery/mirror invariant against parsed artifacts and return one
 * combined result. `valid` is true only when all sub-checks pass; `issues`
 * aggregates every failure so a caller (test or build gate) can report them all
 * at once.
 *
 * Validates: Requirements 1.4, 8.5 (endpoint parity) plus 1.1, 8.4, 5.1, 5.3,
 * 8.3 via the composed checks.
 */
export function validateDiscoverySync(
  parsed: ParsedArtifacts,
  options: ValidateOptions = {}
): ValidationResult {
  const results = [
    validateEndpointParity(parsed.discoveryEndpoints, parsed.mirrorEndpoints),
    validateEndpointsResolve(parsed.discoveryEndpoints, options),
    validateEndpointsResolve(parsed.mirrorEndpoints, options),
    validateSubsystemParity(
      parsed.discoverySubsystems,
      parsed.mirrorSubsystems
    ),
    validateCanonicalIdentity(parsed.identityReferences),
  ];

  const issues = results.flatMap((r) => r.issues);
  return { valid: issues.length === 0, issues };
}
