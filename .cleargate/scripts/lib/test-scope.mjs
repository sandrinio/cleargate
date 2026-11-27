/**
 * lib/test-scope.mjs — pick the test suites a change touches. Pure: Node built-ins only, no I/O.
 *
 * gate-checks.json `qa.test_scopes` is an ordered list of { name, paths, command }. A scope is selected
 * when one of its path globs matches a changed path. A changed path outside UNTESTED_PATTERNS that no
 * scope matches selects every scope; a change made only of untested paths selects none (`docs-only`);
 * an unreadable or empty diff selects every scope (fail toward testing). An absent, null or empty
 * `qa.test_scopes` means the feature is OFF and callers keep running `qa.test` unchanged.
 *
 * Used by merge_story.mjs, record_evidence.mjs and run_wave_suite.mjs.
 */

/** Paths no suite covers. A change made only of these runs no test. */
export const UNTESTED_PATTERNS = Object.freeze(['.cleargate/**', '*.md']);

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const nonEmpty = (v) => typeof v === 'string' && v.trim() !== '';

/**
 * @param {unknown} qa  the parsed gate-checks `qa` object
 * @returns {{ scopes: { name: string, paths: string[], command: string }[] } | { error: string }}
 */
export function parseTestScopes(qa) {
  const v = isObj(qa) ? qa.test_scopes : undefined;
  if (v === undefined || v === null) return { scopes: [] };
  if (!Array.isArray(v)) return { error: 'qa.test_scopes must be an array of { name, paths, command }' };
  const names = new Set();
  const scopes = [];
  for (let i = 0; i < v.length; i++) {
    const s = v[i];
    const key = `qa.test_scopes[${i}]`;
    if (!isObj(s)) return { error: `${key} must be an object { name, paths, command }` };
    if (!nonEmpty(s.name)) return { error: `${key}.name must be a non-empty string` };
    if (names.has(s.name)) return { error: `${key}.name "${s.name}" is a duplicate; scope names must be unique` };
    names.add(s.name);
    if (!Array.isArray(s.paths) || s.paths.length === 0 || !s.paths.every(nonEmpty)) {
      return { error: `${key}.paths must be a non-empty array of non-empty strings` };
    }
    if (!nonEmpty(s.command)) return { error: `${key}.command must be a non-empty string` };
    scopes.push({ name: s.name, paths: s.paths.slice(), command: s.command });
  }
  return { scopes };
}

function segmentRegex(seg) {
  let out = '';
  for (const ch of seg) {
    if (ch === '*') out += '[^/]*';
    else if (ch === '?') out += '[^/]';
    else out += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return out;
}

/**
 * `**` is zero or more segments; `*` and `?` stay inside one segment. A pattern with no `/` matches the
 * basename at any depth; one with a `/` is anchored at the repo root.
 */
export function matchGlob(pattern, p) {
  const target = String(p).replace(/\\/g, '/');
  const pat = String(pattern).replace(/\\/g, '/');
  if (!pat.includes('/')) {
    const base = target.slice(target.lastIndexOf('/') + 1);
    return new RegExp(`^${pat === '**' ? '.*' : segmentRegex(pat)}$`).test(base);
  }
  const segs = pat.split('/');
  const last = segs.length - 1;
  let re = '';
  segs.forEach((seg, i) => {
    if (seg === '**') re += i === last ? '.*' : '(?:[^/]+/)*';
    else re += segmentRegex(seg) + (i < last ? '/' : '');
  });
  return new RegExp(`^${re}$`).test(target);
}

const isUntested = (p) => UNTESTED_PATTERNS.some((g) => matchGlob(g, p));

/**
 * @param {string[] | null} paths  changed paths; null when the diff could not be read
 * @param {{ name: string, paths: string[], command: string }[]} scopes
 * @param {{ error?: unknown }} [opts]
 * @returns {{ scopes: object[], reason: 'matched'|'unmatched'|'docs-only'|'diff-error'|'empty-diff', untested: string[], unmatched: string[] }}
 */
export function selectScopes(paths, scopes, { error } = {}) {
  const all = Array.isArray(scopes) ? scopes : [];
  if (error || !Array.isArray(paths)) return { scopes: all, reason: 'diff-error', untested: [], unmatched: [] };
  const list = paths.map((p) => String(p).replace(/\\/g, '/')).filter((p) => p !== '');
  if (list.length === 0) return { scopes: all, reason: 'empty-diff', untested: [], unmatched: [] };
  const untested = list.filter(isUntested);
  const rest = list.filter((p) => !isUntested(p));
  if (rest.length === 0) return { scopes: [], reason: 'docs-only', untested, unmatched: [] };
  const unmatched = rest.filter((p) => !all.some((s) => s.paths.some((g) => matchGlob(g, p))));
  if (unmatched.length > 0) return { scopes: all, reason: 'unmatched', untested, unmatched };
  const picked = all.filter((s) => rest.some((p) => s.paths.some((g) => matchGlob(g, p))));
  return { scopes: picked, reason: 'matched', untested, unmatched: [] };
}

/** `test scopes: api, web (matched)` / `test scopes: none (docs-only)`. */
export function formatSelection(sel) {
  const names = sel.scopes.length ? sel.scopes.map((s) => s.name).join(', ') : 'none';
  return `test scopes: ${names} (${sel.reason})`;
}

/** `NOT TESTED: no suite touched (a, b, ..., +N more)`. */
export function notTestedLine(untested) {
  const list = Array.isArray(untested) ? untested : [];
  const shown = list.slice(0, 10).join(', ');
  const more = list.length > 10 ? `, +${list.length - 10} more` : '';
  return `NOT TESTED: no suite touched (${shown}${more})`;
}

/** One scope: its command verbatim. Several: each wrapped on its own lines so a trailing `#` cannot swallow the `)`. */
export function scopeCommand(scopes) {
  if (!Array.isArray(scopes) || scopes.length === 0) return '';
  if (scopes.length === 1) return scopes[0].command;
  return scopes.map((s) => `(\n${s.command}\n)`).join(' && ');
}
