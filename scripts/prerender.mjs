/**
 * Runner for the /agent-identity pre-render.
 *
 * The page's transitive imports use Vite-only globals (e.g. `import.meta.env`),
 * which do not exist under plain Node/tsx. So instead of running the .tsx
 * directly, we esbuild-bundle it with `define` for those globals (local code
 * inlined; node_modules kept external and resolved at runtime), then execute
 * the bundle. This keeps the render environment faithful without hacking any
 * source module.
 */
import { build } from 'esbuild';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const entry = path.resolve('scripts/prerender-agent-identity.tsx');
const outfile = path.resolve('dist/.prerender-agent.mjs');

// Ensure dist/ exists (esbuild outfile dir).
fs.mkdirSync(path.dirname(outfile), { recursive: true });

await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  // Keep all node_modules external (react, react-dom, react-router, jsdom,
  // lucide-react, etc. resolve at runtime); only local source is bundled so the
  // `define` below rewrites Vite globals inside our own modules.
  packages: 'external',
  define: {
    // MODE=development so guarded "production requires config" modules (e.g.
    // lib/supabase.ts) degrade gracefully instead of throwing at import; the
    // rendered content is identical either way.
    'import.meta.env': JSON.stringify({
      MODE: 'development',
      PROD: false,
      DEV: true,
      SSR: true,
      VITE_APP_VERSION: '',
    }),
    // development so guarded "production requires config" modules don't throw at
    // import when Supabase env is absent during the build-time render.
    'process.env.NODE_ENV': JSON.stringify('development'),
  },
  logLevel: 'silent',
});

// Execute the bundled pre-render.
await import(pathToFileURL(outfile).href);

// Clean up the temp bundle.
try {
  fs.unlinkSync(outfile);
} catch {
  // ignore
}

// Force a clean exit: the rendered module graph may leave module-load timers
// (e.g. non-unref'd intervals) alive that would otherwise block the build step.
process.exit(0);
