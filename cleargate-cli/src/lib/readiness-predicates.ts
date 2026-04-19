/**
 * STORY-008-02: Predicate evaluator for ClearGate readiness gates.
 * Supports exactly 6 closed-set predicate shapes. Any other shape throws.
 * Sandboxed: no shell-out, no network, read-only FS limited to projectRoot.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ParsedPredicate =
  | { kind: 'frontmatter'; ref: string; field: string; op: '==' | '!=' | '>=' | '<='; value: string | number | boolean }
  | { kind: 'body-contains'; needle: string; negated: boolean }
  | { kind: 'section'; index: number; count: { op: '>=' | '==' | '>'; n: number }; itemType: 'checked-checkbox' | 'unchecked-checkbox' | 'listed-item' }
  | { kind: 'file-exists'; path: string }
  | { kind: 'link-target-exists'; id: string }
  | { kind: 'status-of'; id: string; value: string };

export interface ParsedDoc {
  fm: Record<string, unknown>;
  body: string;
  absPath: string;
}

export interface EvalOptions {
  projectRoot?: string;
  wikiIndexPath?: string;
}

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parse a predicate string into a typed ParsedPredicate.
 * Throws with "unsupported predicate shape: <src>" on any unrecognized input.
 * Target: ≤150 LoC, hand-rolled tokenizer + switch on first token.
 */
export function parsePredicate(src: string): ParsedPredicate {
  const s = src.trim();

  // 1. frontmatter(<ref>).<field> <op> <value>
  const fmMatch = s.match(
    /^frontmatter\(([^)]*)\)\.(\w+)\s*(==|!=|>=|<=)\s*(.+)$/
  );
  if (fmMatch) {
    const ref = fmMatch[1]!.trim();
    if (ref === '') throw new Error(`unsupported predicate shape: ${src}`);
    const field = fmMatch[2]!;
    const op = fmMatch[3] as '==' | '!=' | '>=' | '<=';
    const rawVal = fmMatch[4]!.trim();
    const value = parseValue(rawVal);
    return { kind: 'frontmatter', ref, field, op, value };
  }

  // 2a. body does not contain '<needle>'
  const bodyNotMatch = s.match(/^body does not contain ['"](.+)['"]$/);
  if (bodyNotMatch) {
    return { kind: 'body-contains', needle: bodyNotMatch[1]!, negated: true };
  }

  // 2b. body contains '<needle>'
  const bodyMatch = s.match(/^body contains ['"](.+)['"]$/);
  if (bodyMatch) {
    return { kind: 'body-contains', needle: bodyMatch[1]!, negated: false };
  }

  // 3. section(<N>) has <count> <item-type>
  const sectionMatch = s.match(
    /^section\((\d+)\) has (≥|>=|==|>)(\d+) (checked-checkbox|unchecked-checkbox|listed-item)$/
  );
  if (sectionMatch) {
    const index = parseInt(sectionMatch[1]!, 10);
    const opChar = sectionMatch[2]!;
    const n = parseInt(sectionMatch[3]!, 10);
    const itemType = sectionMatch[4] as 'checked-checkbox' | 'unchecked-checkbox' | 'listed-item';
    let countOp: '>=' | '==' | '>';
    if (opChar === '≥' || opChar === '>=') countOp = '>=';
    else if (opChar === '>') countOp = '>';
    else countOp = '==';
    return { kind: 'section', index, count: { op: countOp, n }, itemType };
  }

  // 4. file-exists(<path>)
  const fileExistsMatch = s.match(/^file-exists\((.+)\)$/);
  if (fileExistsMatch) {
    const filePath = fileExistsMatch[1]!.trim().replace(/^['"]|['"]$/g, '');
    return { kind: 'file-exists', path: filePath };
  }

  // 5. link-target-exists([[ID]])
  const linkMatch = s.match(/^link-target-exists\(\[\[([A-Z0-9\-]+)\]\]\)$/);
  if (linkMatch) {
    return { kind: 'link-target-exists', id: linkMatch[1]! };
  }

  // 6. status-of([[ID]]) == <value>
  const statusMatch = s.match(/^status-of\(\[\[([A-Z0-9\-]+)\]\]\)\s*==\s*(.+)$/);
  if (statusMatch) {
    const id = statusMatch[1]!;
    const value = statusMatch[2]!.trim().replace(/^['"]|['"]$/g, '');
    return { kind: 'status-of', id, value };
  }

  throw new Error(`unsupported predicate shape: ${src}`);
}

/** Parse a YAML scalar value string to string | number | boolean. */
function parseValue(raw: string): string | number | boolean {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'null') return 'null'; // treat null as string "null" for comparison
  const num = Number(raw);
  if (!isNaN(num) && raw !== '') return num;
  // Strip quotes
  return raw.replace(/^['"]|['"]$/g, '');
}

// ─── Evaluator ────────────────────────────────────────────────────────────────

/**
 * Evaluate a predicate string against a document. Returns {pass, detail}.
 * Throws on malformed predicate (delegate to parsePredicate).
 */
export function evaluate(
  predicate: string,
  doc: ParsedDoc,
  opts?: EvalOptions
): { pass: boolean; detail: string } {
  const parsed = parsePredicate(predicate);
  const projectRoot = opts?.projectRoot ?? process.cwd();

  switch (parsed.kind) {
    case 'frontmatter':
      return evalFrontmatter(parsed, doc, projectRoot);
    case 'body-contains':
      return evalBodyContains(parsed, doc);
    case 'section':
      return evalSection(parsed, doc);
    case 'file-exists':
      return evalFileExists(parsed, projectRoot);
    case 'link-target-exists':
      return evalLinkTargetExists(parsed, opts);
    case 'status-of':
      return evalStatusOf(parsed, opts, projectRoot);
  }
}

// ─── Frontmatter evaluator ────────────────────────────────────────────────────

function evalFrontmatter(
  parsed: Extract<ParsedPredicate, { kind: 'frontmatter' }>,
  doc: ParsedDoc,
  projectRoot: string
): { pass: boolean; detail: string } {
  let fm: Record<string, unknown>;

  if (parsed.ref === '.') {
    fm = doc.fm;
  } else {
    // ref is a frontmatter key whose value is a path to another document
    const refVal = doc.fm[parsed.ref];
    if (refVal === undefined || refVal === null) {
      return {
        pass: false,
        detail: `frontmatter key '${parsed.ref}' is missing or null in ${doc.absPath}`,
      };
    }
    // Resolve the path
    const linkedPath = resolveLinkedPath(String(refVal), doc.absPath, projectRoot);
    if (!linkedPath) {
      return {
        pass: false,
        detail: `linked file not found: ${refVal}`,
      };
    }
    fm = readFrontmatterFromFile(linkedPath);
  }

  const actual = fm[parsed.field];

  // Compare
  const pass = compareValues(actual, parsed.op, parsed.value);
  const detail = pass
    ? `frontmatter(${parsed.ref}).${parsed.field} ${parsed.op} ${JSON.stringify(parsed.value)} → actual: ${JSON.stringify(actual)}`
    : `expected ${parsed.field} ${parsed.op} ${JSON.stringify(parsed.value)}, got ${JSON.stringify(actual)}`;

  return { pass, detail };
}

function compareValues(
  actual: unknown,
  op: '==' | '!=' | '>=' | '<=',
  expected: string | number | boolean
): boolean {
  // null check for != null
  if (expected === 'null') {
    const isNull = actual === null || actual === undefined || actual === '' || actual === 'null';
    return op === '==' ? isNull : !isNull;
  }
  // Normalize actual: strip quotes
  let a: unknown = actual;
  if (typeof a === 'string') {
    a = a.replace(/^["']|["']$/g, '');
    // Try to coerce to bool/number for comparison
    if (a === 'true') a = true;
    else if (a === 'false') a = false;
    else {
      const n = Number(a);
      if (!isNaN(n) && (a as string) !== '') a = n;
    }
  }

  switch (op) {
    case '==': return a === expected || String(a) === String(expected);
    case '!=': return a !== expected && String(a) !== String(expected);
    case '>=': return Number(a) >= Number(expected);
    case '<=': return Number(a) <= Number(expected);
  }
}

/** Resolve a path reference relative to the document or project root. */
function resolveLinkedPath(
  ref: string,
  docAbsPath: string,
  projectRoot: string
): string | null {
  // Try relative to doc first, then relative to projectRoot
  const candidates = [
    path.resolve(path.dirname(docAbsPath), ref),
    path.resolve(projectRoot, ref),
  ];
  for (const candidate of candidates) {
    // Sandbox check
    if (!candidate.startsWith(projectRoot)) continue;
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/** Read frontmatter from a file as a plain Record. Does not throw on body. */
function readFrontmatterFromFile(absPath: string): Record<string, unknown> {
  try {
    const raw = fs.readFileSync(absPath, 'utf8');
    const lines = raw.split('\n');
    if (lines[0] !== '---') return {};
    let closeIdx = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '---') { closeIdx = i; break; }
    }
    if (closeIdx === -1) return {};
    const fmLines = lines.slice(1, closeIdx);
    const fm: Record<string, unknown> = {};
    for (const line of fmLines) {
      if (line.trim() === '' || line.trim().startsWith('#')) continue;
      const colon = line.indexOf(':');
      if (colon === -1) continue;
      const key = line.slice(0, colon).trim();
      const val = line.slice(colon + 1).trim();
      if (val === '' || val === '[]') { fm[key] = []; continue; }
      if (val.startsWith('{')) { fm[key] = val; continue; }
      if (val.startsWith('[') && val.endsWith(']')) {
        const inner = val.slice(1, -1).trim();
        fm[key] = inner === '' ? [] : inner.split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
        continue;
      }
      fm[key] = val.replace(/^["']|["']$/g, '');
    }
    return fm;
  } catch {
    return {};
  }
}

// ─── Body-contains evaluator ──────────────────────────────────────────────────

function evalBodyContains(
  parsed: Extract<ParsedPredicate, { kind: 'body-contains' }>,
  doc: ParsedDoc
): { pass: boolean; detail: string } {
  const body = doc.body;
  const needle = parsed.needle;

  // Count occurrences and find section context
  let count = 0;
  let pos = 0;
  const sections: number[] = []; // 1-indexed section numbers for each occurrence
  const bodySections = body.split(/^## /m);

  // Simple occurrence count
  while ((pos = body.indexOf(needle, pos)) !== -1) {
    count++;
    // Find which section this occurrence is in
    const before = body.slice(0, pos);
    const sectionCount = (before.match(/^## /gm) || []).length;
    sections.push(sectionCount + 1); // 1-indexed
    pos += needle.length;
  }

  const present = count > 0;
  void bodySections; // suppress unused warning

  if (parsed.negated) {
    // "body does not contain" → pass when absent
    if (present) {
      const sectionList = [...new Set(sections)].map((s) => `§${s}`).join(', ');
      return {
        pass: false,
        detail: `${count} occurrence${count === 1 ? '' : 's'} at ${sectionList}`,
      };
    }
    return { pass: true, detail: `'${needle}' not found in body` };
  } else {
    // "body contains" → pass when present
    if (present) {
      return { pass: true, detail: `'${needle}' found ${count} time${count === 1 ? '' : 's'}` };
    }
    return { pass: false, detail: `'${needle}' not found in body` };
  }
}

// ─── Section evaluator ────────────────────────────────────────────────────────

function evalSection(
  parsed: Extract<ParsedPredicate, { kind: 'section' }>,
  doc: ParsedDoc
): { pass: boolean; detail: string } {
  // Split body on ## headings (1-indexed).
  // Use lookahead so each part starts with "## " (or is preamble if body doesn't start with ##).
  const body = doc.body;

  const rawParts = body.split(/^(?=## )/m);
  // If body starts with "## ", rawParts[0] = "## Section 1\n...", rawParts[1] = "## Section 2\n...", etc.
  // Section N is rawParts[N-1] (0-based array, 1-indexed sections).
  // If body has preamble before first ##, rawParts[0] = preamble (section 0), rawParts[1] = section 1, etc.

  // Detect if there is a preamble (content before first ##)
  const hasPreamble = rawParts.length > 0 && !rawParts[0]!.startsWith('## ');
  // Section N → rawParts index: with preamble, index = N; without, index = N - 1
  const arrayIndex = hasPreamble ? parsed.index : parsed.index - 1;
  const sectionContent = rawParts[arrayIndex];
  const totalSections = hasPreamble ? rawParts.length - 1 : rawParts.length;

  if (!sectionContent) {
    return {
      pass: false,
      detail: `section ${parsed.index} not found (body has ${totalSections} sections)`,
    };
  }

  let actualCount: number;
  switch (parsed.itemType) {
    case 'checked-checkbox':
      actualCount = (sectionContent.match(/^\s*- \[x\]/gim) || []).length;
      break;
    case 'unchecked-checkbox':
      actualCount = (sectionContent.match(/^\s*- \[ \]/gim) || []).length;
      break;
    case 'listed-item':
      actualCount = (sectionContent.match(/^\s*- /gm) || []).length;
      break;
  }

  const pass = applyCountOp(actualCount, parsed.count.op, parsed.count.n);
  const opStr = parsed.count.op === '>=' ? '≥' : parsed.count.op;
  const detail = pass
    ? `section ${parsed.index} has ${actualCount} ${parsed.itemType} (${opStr}${parsed.count.n} required)`
    : `section ${parsed.index} has ${actualCount} ${parsed.itemType} (${opStr}${parsed.count.n} required)`;

  return { pass, detail };
}

function applyCountOp(actual: number, op: '>=' | '==' | '>', n: number): boolean {
  switch (op) {
    case '>=': return actual >= n;
    case '==': return actual === n;
    case '>': return actual > n;
  }
}

// ─── File-exists evaluator ────────────────────────────────────────────────────

function evalFileExists(
  parsed: Extract<ParsedPredicate, { kind: 'file-exists' }>,
  projectRoot: string
): { pass: boolean; detail: string } {
  const resolved = path.resolve(projectRoot, parsed.path);

  // Sandbox check: must be inside projectRoot
  if (!resolved.startsWith(projectRoot + path.sep) && resolved !== projectRoot) {
    return {
      pass: false,
      detail: `path '${parsed.path}' resolves outside project root (sandbox violation)`,
    };
  }

  const exists = fs.existsSync(resolved);
  return {
    pass: exists,
    detail: exists ? `${parsed.path} exists` : `${parsed.path} not found`,
  };
}

// ─── Link-target-exists evaluator ────────────────────────────────────────────

function evalLinkTargetExists(
  parsed: Extract<ParsedPredicate, { kind: 'link-target-exists' }>,
  opts?: EvalOptions
): { pass: boolean; detail: string } {
  const projectRoot = opts?.projectRoot ?? process.cwd();
  const wikiIndexPath =
    opts?.wikiIndexPath ?? path.join(projectRoot, '.cleargate', 'wiki', 'index.md');

  // Sandbox check
  if (!wikiIndexPath.startsWith(projectRoot)) {
    return { pass: false, detail: 'wikiIndexPath resolves outside project root' };
  }

  let indexContent: string;
  try {
    indexContent = fs.readFileSync(wikiIndexPath, 'utf8');
  } catch {
    return { pass: false, detail: `wiki index not found at ${wikiIndexPath}` };
  }

  const found = indexContent.includes(`[[${parsed.id}]]`);
  return {
    pass: found,
    detail: found
      ? `[[${parsed.id}]] found in wiki index`
      : `[[${parsed.id}]] not found in wiki index`,
  };
}

// ─── Status-of evaluator ─────────────────────────────────────────────────────

function evalStatusOf(
  parsed: Extract<ParsedPredicate, { kind: 'status-of' }>,
  opts: EvalOptions | undefined,
  projectRoot: string
): { pass: boolean; detail: string } {
  const wikiIndexPath =
    opts?.wikiIndexPath ?? path.join(projectRoot, '.cleargate', 'wiki', 'index.md');

  // Sandbox check
  if (!wikiIndexPath.startsWith(projectRoot)) {
    return { pass: false, detail: 'wikiIndexPath resolves outside project root' };
  }

  let indexContent: string;
  try {
    indexContent = fs.readFileSync(wikiIndexPath, 'utf8');
  } catch {
    return { pass: false, detail: `wiki index not found at ${wikiIndexPath}` };
  }

  // Find the raw path for this ID in the wiki index
  // Wiki index format: | [[STORY-003-13]] | story | Draft | .cleargate/delivery/... |
  const rowMatch = indexContent.match(
    new RegExp(`\\[\\[${parsed.id}\\]\\]\\s*\\|[^|]+\\|[^|]+\\|\\s*([^|\\n]+)`)
  );
  if (!rowMatch) {
    return { pass: false, detail: `[[${parsed.id}]] not found in wiki index` };
  }

  const rawPath = rowMatch[1]!.trim();
  const fullPath = path.resolve(projectRoot, rawPath);

  // Sandbox check
  if (!fullPath.startsWith(projectRoot)) {
    return { pass: false, detail: `wiki path for ${parsed.id} resolves outside project root` };
  }

  const linkedFm = readFrontmatterFromFile(fullPath);
  const status = linkedFm['status'];
  if (status === undefined) {
    return { pass: false, detail: `[[${parsed.id}]] has no status field` };
  }

  const pass = String(status).replace(/^["']|["']$/g, '') === parsed.value;
  return {
    pass,
    detail: pass
      ? `status-of([[${parsed.id}]]) == ${parsed.value}`
      : `status-of([[${parsed.id}]]) is '${status}', expected '${parsed.value}'`,
  };
}
