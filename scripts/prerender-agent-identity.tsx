/**
 * Pre-render (SSG) the /agent-identity route into a static HTML file.
 *
 * Why: /agent-identity is a client-rendered SPA route. The server returns the
 * same index.html shell for every non-API path, so a non-JS agent/LLM fetching
 * the page HTML sees only the empty shell with the homepage <title> — none of
 * the actual agent documentation. This script renders the React page to static
 * HTML at build time so the served HTML contains the full content and the
 * correct <head> (title / description / canonical). The same client bundle
 * still loads, so humans get the interactive page (React re-renders on the
 * client); agents get readable content without executing JavaScript.
 *
 * Runs from the Vercel buildCommand after `vite build` (needs dist/index.html
 * as the asset template). A jsdom global environment is installed first so any
 * component that touches window/document during render works under Node.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

// ---- DOM environment (must be set up BEFORE importing React components) ----
const jsdom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
  url: 'https://anoteroslogos.com/agent-identity',
});
const g = globalThis as unknown as Record<string, unknown>;
g.window = jsdom.window as unknown;
g.document = jsdom.window.document;
g.navigator = jsdom.window.navigator;
g.HTMLElement = jsdom.window.HTMLElement;
g.Node = jsdom.window.Node;
g.customElements = jsdom.window.customElements;
// AnimatedSection uses IntersectionObserver; provide a no-op shim.
class IONoop {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
g.IntersectionObserver = IONoop;
(jsdom.window as unknown as Record<string, unknown>).IntersectionObserver = IONoop;
if (!jsdom.window.matchMedia) {
  (jsdom.window as unknown as Record<string, unknown>).matchMedia = () => ({
    matches: false,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  });
}

// ---- Render ----
const React = (await import('react')).default;
const { renderToString } = await import('react-dom/server');
const { MemoryRouter } = await import('react-router-dom');
const AgentIdentityPage = (await import('../pages/AgentIdentityPage')).default;

const element = React.createElement(
  MemoryRouter,
  { initialEntries: ['/agent-identity'] },
  React.createElement(AgentIdentityPage)
);

let body: string;
try {
  body = renderToString(element);
} catch (err) {
  console.error('[prerender] renderToString failed:', err);
  process.exit(1);
}

if (!body || body.length < 500) {
  console.error(`[prerender] Rendered output suspiciously small (${body?.length ?? 0} chars); aborting.`);
  process.exit(1);
}

// ---- Assemble output from the built index.html template ----
const distDir = path.resolve('dist');
const templatePath = path.join(distDir, 'index.html');
if (!fs.existsSync(templatePath)) {
  console.error(`[prerender] Missing ${templatePath}; run vite build first.`);
  process.exit(1);
}
const template = fs.readFileSync(templatePath, 'utf8');

const TITLE =
  'AI Agent Integration Specification | UAP, A2A, MCP Protocols | Anóteros Lógos';
const DESCRIPTION =
  'Enterprise-grade protocol documentation for autonomous agent integration: UAP v1.0 (Universal Agent Protocol), A2A (JSON-RPC 2.0), MCP (Model Context Protocol), and AIP (Ed25519) identity with complete schemas, error handling, and TypeScript/Python code samples.';
const CANONICAL = 'https://anoteroslogos.com/agent-identity';

let html = template;
html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${TITLE}</title>`);
html = html.replace(
  /(<meta\s+name="description"\s+content=")[\s\S]*?(">)/,
  `$1${DESCRIPTION}$2`
);
html = html.replace(
  /(<link\s+rel="canonical"\s+href=")[^"]*(">)/,
  `$1${CANONICAL}$2`
);
// Inject the rendered content into the SPA mount point.
if (!html.includes('<div id="root"></div>')) {
  console.error('[prerender] Could not find <div id="root"></div> in template.');
  process.exit(1);
}
html = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);

const outPath = path.join(distDir, 'agent-identity.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log(
  `[prerender] Wrote dist/agent-identity.html (${body.length} chars of pre-rendered content).`
);
