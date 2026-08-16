#!/usr/bin/env node
/**
 * Pre-bundle Vercel serverless functions (fixes ERR_MODULE_NOT_FOUND).
 *
 * Root cause: the project is ESM ("type":"module"). Vercel's @vercel/node
 * transpiles each api/**\/*.ts file-by-file (it does NOT bundle) and traces
 * imports, but it keeps extensionless relative specifiers such as
 * `../lib/validation/middleware`. Under Node's ESM resolver those require an
 * explicit `.js` extension, so at runtime the function crashes with
 * `ERR_MODULE_NOT_FOUND: Cannot find module '/var/task/lib/...'` even though
 * the traced file is physically present.
 *
 * Fix: bundle each function entry with esbuild so ALL local imports
 * (`../lib`, `../src`, `../utils`, `../scripts`, `../types`, `../app`) are
 * inlined into a single self-contained file. `packages: 'external'` keeps every
 * bare/node_modules import external, so native and ESM-only dependencies
 * (isolated-vm, playwright, libp2p, @noble/curves, cbor-x, ...) are left for
 * Vercel to trace exactly as before. The emitted function therefore contains
 * zero relative imports and resolves cleanly on Node 22 ESM.
 *
 * The bundled output overwrites the source file in place (kept as `.ts`, which
 * @vercel/node transpiles unchanged). This runs only from the Vercel
 * buildCommand (after `npm run build`); a plain local `npm run build` never
 * invokes it, so local dev / tsc / vitest are unaffected.
 */
import { build } from 'esbuild';
import path from 'node:path';
import fs from 'node:fs/promises';

const API_DIR = path.resolve('api');

/** Files that must NOT be treated as deployable function entrypoints. */
function isExcluded(relPath) {
  const p = relPath.replace(/\\/g, '/');
  if (p.includes('/__tests__/') || p.startsWith('__tests__/')) return true;
  if (p.includes('/_lib/') || p.startsWith('_lib/')) return true;
  if (p.endsWith('.d.ts') || p.endsWith('.test.ts') || p.endsWith('.spec.ts')) return true;
  return false;
}

async function walk(dir) {
  const found = [];
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const full = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      found.push(...(await walk(full)));
    } else if (dirent.isFile() && dirent.name.endsWith('.ts')) {
      found.push(full);
    }
  }
  return found;
}

async function main() {
  let exists = true;
  try {
    await fs.access(API_DIR);
  } catch {
    exists = false;
  }
  if (!exists) {
    console.warn('[bundle-api] No api/ directory found; nothing to bundle.');
    return;
  }

  const all = await walk(API_DIR);
  const entries = all.filter((abs) => !isExcluded(path.relative(API_DIR, abs)));

  if (entries.length === 0) {
    console.warn('[bundle-api] No API entrypoints found; nothing to bundle.');
    return;
  }

  console.log(
    `[bundle-api] Bundling ${entries.length} serverless function(s) with esbuild (node_modules kept external)...`
  );

  let ok = 0;
  const failures = [];
  for (const abs of entries) {
    const rel = path.relative(API_DIR, abs);
    try {
      const result = await build({
        entryPoints: [abs],
        bundle: true,
        write: false,
        platform: 'node',
        format: 'esm',
        target: 'node22',
        // Keep all bare (node_modules + node: builtins) imports external so
        // Vercel's file tracing handles native / ESM-only deps unchanged.
        packages: 'external',
        logLevel: 'silent',
        sourcemap: false,
        legalComments: 'none',
      });
      await fs.writeFile(abs, result.outputFiles[0].text, 'utf8');
      ok++;
    } catch (err) {
      failures.push(rel);
      console.error(`[bundle-api] FAILED to bundle ${rel}: ${err && err.message ? err.message : err}`);
    }
  }

  console.log(`[bundle-api] Done: ${ok}/${entries.length} functions bundled.`);
  if (failures.length > 0) {
    console.error(`[bundle-api] ${failures.length} function(s) failed: ${failures.join(', ')}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[bundle-api] Fatal error:', err);
  process.exit(1);
});
