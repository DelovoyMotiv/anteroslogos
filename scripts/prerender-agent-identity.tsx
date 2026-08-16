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
// Assign a global resiliently: some globals (e.g. `navigator` on Node 21+) are
// read-only getters and a plain assignment throws. Fall back to
// defineProperty, and if even that is not allowed, skip it (Node's built-in is
// good enough — renderToString does not run effects/handlers anyway).
function setGlobal(key: string, value: unknown) {
  try {
    g[key] = value;
    return;
  } catch {
    /* read-only; try defineProperty */
  }
  try {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  } catch {
    /* leave the runtime's built-in in place */
  }
}

setGlobal('window', jsdom.window as unknown);
setGlobal('document', jsdom.window.document);
setGlobal('navigator', jsdom.window.navigator);
setGlobal('HTMLElement', jsdom.window.HTMLElement);
setGlobal('Node', jsdom.window.Node);
setGlobal('customElements', jsdom.window.customElements);
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

// Rewrite social / OpenGraph metadata so structured-data-first agents and LLM
// crawlers see the AGENT page, not the homepage's boutique-studio framing.
html = html.replace(/(<meta\s+property="og:title"\s+content=")[^"]*(">)/, `$1${TITLE}$2`);
html = html.replace(/(<meta\s+property="og:description"\s+content=")[^"]*(">)/, `$1${DESCRIPTION}$2`);
html = html.replace(/(<meta\s+property="og:url"\s+content=")[^"]*(">)/, `$1${CANONICAL}$2`);
html = html.replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(">)/, `$1${TITLE}$2`);
html = html.replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(">)/, `$1${DESCRIPTION}$2`);

// Replace the homepage JSON-LD @graph (Organization/FAQPage/etc.) with an
// agent-appropriate TechArticle so structured-data parsers describe this page
// correctly. Only the first inline ld+json (the homepage @graph) is replaced.
const AGENT_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'AI Agent Integration Specification',
  name: 'Anóteros Lógos Agent API Specification',
  url: CANONICAL,
  description: DESCRIPTION,
  inLanguage: 'en',
  about: ['UAP v1.0', 'A2A Protocol', 'MCP', 'AIP', 'Ed25519', 'JSON-RPC 2.0'],
  keywords:
    'UAP, Universal Agent Protocol, A2A, MCP, AIP, Ed25519, agent API, JSON-RPC 2.0, agent discovery, autonomous agents',
  isPartOf: { '@type': 'WebSite', name: 'Anóteros Lógos', url: 'https://anoteroslogos.com' },
};
html = html.replace(
  /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
  `<script type="application/ld+json">${JSON.stringify(AGENT_JSONLD)}</script>`
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
