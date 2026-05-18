/**
 * setup-node-test.mjs — STORY-028-07
 *
 * Bootstrap for node:test runs in admin/.
 * Loaded via `--import ./tests/setup-node-test.mjs` in package.json test script.
 *
 * Responsibilities:
 *   1. Set up jsdom as a global DOM environment (window, document, navigator, HTMLElement, etc.)
 *   2. Register module hooks (via register()) that map SvelteKit virtual paths and compile .svelte files.
 *
 * Must be loaded BEFORE tsx so our hooks have priority in the chain.
 * Package.json test script: --import ./tests/setup-node-test.mjs --import tsx
 */

import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as path from 'node:path';
import { createRequire } from 'node:module';

// Set NODE_ENV=test so module-level checks (like env.ts) skip early validation
if (!process.env['NODE_ENV']) {
  process.env['NODE_ENV'] = 'test';
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// 1. jsdom global bootstrap
// ---------------------------------------------------------------------------
const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
  runScripts: 'dangerously',
});

const g = globalThis;
g.window = dom.window;
g.document = dom.window.document;

// navigator is getter-only on globalThis in newer Node; use Object.defineProperty
Object.defineProperty(g, 'navigator', {
  value: dom.window.navigator,
  writable: true,
  configurable: true,
});

g.HTMLElement = dom.window.HTMLElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.NodeList = dom.window.NodeList;
g.Text = dom.window.Text;
g.Comment = dom.window.Comment;
g.DocumentFragment = dom.window.DocumentFragment;
g.Event = dom.window.Event;
g.MouseEvent = dom.window.MouseEvent;
g.KeyboardEvent = dom.window.KeyboardEvent;
g.CustomEvent = dom.window.CustomEvent;
g.MutationObserver = dom.window.MutationObserver;
g.HTMLMediaElement = dom.window.HTMLMediaElement;
g.HTMLInputElement = dom.window.HTMLInputElement;
g.HTMLButtonElement = dom.window.HTMLButtonElement;
g.HTMLSelectElement = dom.window.HTMLSelectElement;
g.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
g.HTMLDivElement = dom.window.HTMLDivElement;
g.HTMLSpanElement = dom.window.HTMLSpanElement;
g.HTMLAnchorElement = dom.window.HTMLAnchorElement;
g.SVGElement = dom.window.SVGElement ?? class SVGElement extends dom.window.Element {};
g.SVGSVGElement = dom.window.SVGSVGElement ?? class SVGSVGElement extends dom.window.Element {};
g.Range = dom.window.Range;
g.TreeWalker = dom.window.TreeWalker;
g.NodeFilter = dom.window.NodeFilter;
g.ResizeObserver = dom.window.ResizeObserver ?? class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
g.IntersectionObserver = dom.window.IntersectionObserver ?? class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  root = null;
  rootMargin = '';
  thresholds = [];
};
g.requestAnimationFrame = (cb) => setTimeout(cb, 0);
g.cancelAnimationFrame = clearTimeout;

// Storage stubs (jsdom may already provide these but ensure they exist)
if (!g.localStorage) {
  g.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] ?? null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; },
    get length() { return Object.keys(this._data).length; },
    key(i) { return Object.keys(this._data)[i] ?? null; },
  };
}
if (!g.sessionStorage) {
  g.sessionStorage = {
    _data: {},
    getItem(k) { return this._data[k] ?? null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; },
    get length() { return Object.keys(this._data).length; },
    key(i) { return Object.keys(this._data)[i] ?? null; },
  };
}

// getComputedStyle
if (!g.getComputedStyle) {
  g.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
}

// Cleanup on process exit
process.on('exit', () => {
  try { dom.window.close(); } catch { /* ignore */ }
});

// ---------------------------------------------------------------------------
// 3. Expose node:test lifecycle hooks as globals
// ---------------------------------------------------------------------------
// @testing-library/svelte checks `typeof beforeEach === 'function'` to wire up
// automatic cleanup. In node:test these are NOT global by default — expose them.
// This must run before @testing-library/svelte is imported (which happens when
// component test files load @testing-library/svelte in their imports).
import * as nodeTest from 'node:test';
g.beforeEach = nodeTest.beforeEach;
g.afterEach = nodeTest.afterEach;
g.before = nodeTest.before;
g.after = nodeTest.after;
g.describe = nodeTest.describe;
g.test = nodeTest.test;



// ---------------------------------------------------------------------------
// 2. Register SvelteKit virtual-module + .svelte compiler hooks
// ---------------------------------------------------------------------------
// These hooks MUST run before tsx handles the specifier, so we register them first.
// The hooks file handles:
//   - $env/dynamic/public, $app/navigation, $app/stores, etc.
//   - $lib/* → admin/src/lib/*
//   - .svelte files → compiled via svelte/compiler
//   - .svelte.js / .svelte.ts files → compiled via svelte/compiler (module mode)

register(
  pathToFileURL(path.join(__dirname, 'setup-node-test-hooks.mjs')).href,
  import.meta.url,
);
