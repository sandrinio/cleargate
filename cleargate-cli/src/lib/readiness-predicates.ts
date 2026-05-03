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
  | { kind: 'marker-absence'; marker: 'TBD' | 'TODO' | 'FIXME' }
  | { kind: 'section'; index: number; count: { op: '>=' | '==' | '>'; n: number }; itemType: 'checked-checkbox' | 'unchecked-checkbox' | 'listed-item' | 'declared-item' }
  | { kind: 'file-exists'; path: string }
  | { kind: 'link-target-exists'; id: string }
  | { kind: 'status-of'; id: string; value: string }
  | { kind: 'existing-surfaces-verified' };

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

  // 2a. body does not contain marker '<id>' — new marker-absence shape
  const markerNotMatch = s.match(/^body does not contain marker ['"]([A-Z]+)['"]$/);
  if (markerNotMatch) {
    const marker = markerNotMatch[1]!;
    if (marker !== 'TBD' && marker !== 'TODO' && marker !== 'FIXME') {
      throw new Error(`unsupported predicate shape: ${src}`);
    }
    return { kind: 'marker-absence', marker };
  }

  // 2b. body does not contain '<needle>'
  const bodyNotMatch = s.match(/^body does not contain ['"](.+)['"]$/);
  if (bodyNotMatch) {
    return { kind: 'body-contains', needle: bodyNotMatch[1]!, negated: true };
  }

  // 2c. body contains '<needle>'
  const bodyMatch = s.match(/^body contains ['"](.+)['"]$/);
  if (bodyMatch) {
    return { kind: 'body-contains', needle: bodyMatch[1]!, negated: false };
  }

  // 3. section(<N>) has <count> <item-type>
  const sectionMatch = s.match(
    /^section\((\d+)\) has (≥|>=|==|>)(\d+) (checked-checkbox|unchecked-checkbox|listed-item|declared-item)$/
  );
  if (sectionMatch) {
    const index = parseInt(sectionMatch[1]!, 10);
    const opChar = sectionMatch[2]!;
    const n = parseInt(sectionMatch[3]!, 10);
    const itemType = sectionMatch[4] as 'checked-checkbox' | 'unchecked-checkbox' | 'listed-item' | 'declared-item';
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

  // 7. existing-surfaces-verified — closed-set shape, no parameters
  if (s === 'existing-surfaces-verified') {
    return { kind: 'existing-surfaces-verified' };
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
    case 'marker-absence':
      return evalMarkerAbsence(parsed, doc);
    case 'section':
      return evalSection(parsed, doc);
    case 'file-exists':
      return evalFileExists(parsed, projectRoot);
    case 'link-target-exists':
      return evalLinkTargetExists(parsed, opts);
    case 'status-of':
      return evalStatusOf(parsed, opts, projectRoot);
    case 'existing-surfaces-verified':
      return evalExistingSurfacesVerified(doc, projectRoot);
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

    // Sub-fix #1 (BUG-008): prose-vs-path heuristic.
    // If the value looks like prose (contains a space, em-dash, en-dash, colon, parens,
    // newline, or exceeds 200 chars), it is not a file path. In that case, pass the gate
    // only when the parent document declares an explicit proposal-gate waiver via any of:
    //   - proposal_gate_waiver: <truthy>  — explicit opt-in waiver field
    //   - approved_by: <non-empty> AND approved_at: <non-empty>  — existing approval fields
    // A plain path like "PROPOSAL-999.md" (no spaces, ≤200 chars, no special prose chars)
    // still falls through to the existing resolveLinkedPath logic — preserving the R-08
    // regression guarantee that broken file references still fail.
    const refStr = String(refVal);
    const looksLikeProse =
      refStr.length > 200 ||
      /[ —–:()\n]/.test(refStr); // space, em-dash, en-dash, colon, parens, newline
    if (looksLikeProse) {
      // Signal 1: explicit proposal_gate_waiver field
      const waiver = doc.fm['proposal_gate_waiver'];
      const hasExplicitWaiver =
        waiver !== null && waiver !== undefined && waiver !== false &&
        String(waiver).trim() !== '' && String(waiver).trim() !== 'false';
      // Signal 2: approved_by + approved_at both set (existing approval fields)
      const approvedBy = doc.fm['approved_by'];
      const approvedAt = doc.fm['approved_at'];
      const hasApprovalFields =
        approvedBy !== null && approvedBy !== undefined && String(approvedBy).trim() !== '' &&
        approvedAt !== null && approvedAt !== undefined && String(approvedAt).trim() !== '';
      const hasWaiver = hasExplicitWaiver || hasApprovalFields;
      if (hasWaiver) {
        return {
          pass: true,
          detail: `context_source is prose; proposal-gate waiver per frontmatter approved_by/approved_at`,
        };
      }
      return {
        pass: false,
        detail: `context_source is prose but no proposal_gate_waiver (approved_by + approved_at) found in frontmatter`,
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

/** Resolve a path reference relative to the document or project root.
 *  CR-031: also walks .cleargate/delivery/pending-sync/ and .cleargate/delivery/archive/
 *  so that bare filenames resolve even after triage moves the target to archive.
 *  Resolution order (stops at first match):
 *   1. Relative to the citer document's directory
 *   2. Relative to the project root
 *   3. .cleargate/delivery/pending-sync/<ref>
 *   4. .cleargate/delivery/archive/<ref>
 */
function resolveLinkedPath(
  ref: string,
  docAbsPath: string,
  projectRoot: string
): string | null {
  const candidates = [
    path.resolve(path.dirname(docAbsPath), ref),                                       // 1. relative to citer
    path.resolve(projectRoot, ref),                                                    // 2. project root
    path.resolve(projectRoot, '.cleargate', 'delivery', 'pending-sync', ref),         // 3. live
    path.resolve(projectRoot, '.cleargate', 'delivery', 'archive', ref),              // 4. archived
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

// ─── Marker-absence evaluator ─────────────────────────────────────────────────

/**
 * Sub-fix #2 (BUG-008): Evaluates "body does not contain marker '<id>'".
 * A marker is counted only when it appears in a syntactic role:
 *   1. Followed immediately by a colon: TBD: ...
 *   2. Wrapped in parens: (TBD) or square brackets: [TBD]
 *   3. The entire trimmed line equals the marker: bare TBD on its own line
 *   4. Preceded by a code-comment prefix: // TBD or # TBD
 *
 * NOT counted:
 *   - TBD as part of another word (TBDs, TBDish, TBD's)
 *   - TBD inside quotes in prose ("TBD resolution")
 *   - Template self-reference lines: "- [x] 0 "TBDs" exist" / "- [ ] 0 "TBDs" exist"
 */
function evalMarkerAbsence(
  parsed: Extract<ParsedPredicate, { kind: 'marker-absence' }>,
  doc: ParsedDoc
): { pass: boolean; detail: string } {
  const { marker } = parsed;
  const lines = doc.body.split('\n');

  // Template self-reference lines to exclude (BUG-008 spec: "- [x] 0 "TBDs" exist")
  const templateSelfRefRe = /^\s*-\s*\[[x ]\]\s*0\s*"TBDs?"\s*exist/i;

  // Regex: marker in a syntactic role.
  // Matches: (MARKER) | [MARKER] | MARKER: | // MARKER | # MARKER | bare MARKER line
  // The (?<!\w) and (?!\w) prevent matching inside longer words.
  const markerRe = new RegExp(
    `(?:^|(?<=\\())${marker}(?=:)|` +     // MARKER: (colon follows)
    `\\(${marker}\\)|` +                   // (MARKER) parens
    `\\[${marker}\\]|` +                   // [MARKER] square brackets
    `(?<=//\\s*)${marker}(?!\\w)|` +       // // MARKER (comment)
    `(?<=#\\s*)${marker}(?!\\w)`,          // # MARKER (comment)
    'g'
  );

  // Also check bare-line: entire trimmed line is just the marker
  const bareLineRe = new RegExp(`^${marker}$`);

  const violations: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    // Skip template self-reference boilerplate
    if (templateSelfRefRe.test(line)) continue;

    const trimmed = line.trim();

    // Check bare line
    if (bareLineRe.test(trimmed)) {
      violations.push(i + 1);
      continue;
    }

    // Check syntactic marker roles via regex
    markerRe.lastIndex = 0;
    if (markerRe.test(line)) {
      violations.push(i + 1);
    }
  }

  if (violations.length > 0) {
    return {
      pass: false,
      detail: `${violations.length} marker occurrence${violations.length === 1 ? '' : 's'} of '${marker}' at line${violations.length === 1 ? '' : 's'} ${violations.join(', ')}`,
    };
  }
  return { pass: true, detail: `no '${marker}' markers found in body` };
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
    case 'declared-item':
      actualCount = countDeclaredItems(sectionContent);
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

/**
 * Count declared items in a section content string.
 * CR-034: A declared item is any of:
 *   - A bullet line: lines matching `^\s*- ` (regardless of checkbox state)
 *   - A table data row: `| ... |` lines that follow a `|---|`-style separator
 *   - A definition-list term: lines matching `^[*_]?[A-Z][^|*\n]*[*_]?:`
 *     (covers `**Item:**`, `Item:`, `*Item*:` etc.)
 * Counts bullets + table data rows + definition-list terms within the section.
 */
function countDeclaredItems(sectionContent: string): number {
  const lines = sectionContent.split('\n');
  let count = 0;
  let inTable = false; // true after we've seen a separator row

  for (const line of lines) {
    // Bullet lines (includes `- [x]` and `- [ ]`)
    if (/^\s*- /.test(line)) {
      count++;
      inTable = false;
      continue;
    }

    // Table rows: `| ... |` pattern
    if (/^\|.+\|/.test(line)) {
      // Check if this is a separator row: |---|, |:---:|, etc.
      if (/^\|[\s\-:]+\|[\s\-:|]*$/.test(line.replace(/\s/g, ''))) {
        // This is a separator row — marks start of data rows
        inTable = true;
        continue;
      }
      // Data row (only if we've seen a separator)
      if (inTable) {
        count++;
      }
      // Header row (before separator) — not counted
      continue;
    }

    // If we hit a non-table line after being in a table, exit table mode
    if (inTable && !/^\|/.test(line)) {
      inTable = false;
    }

    // Definition-list terms: `**Item:**`, `Item:`, `*Item*:`, `Item — value`
    // Match lines that start with an optional bold/italic marker, then uppercase letter,
    // then no pipes or asterisks, then end with colon
    if (/^(\*{1,2}|_{1,2})?[A-Z][^|*\n]*(\*{1,2}|_{1,2})?:/.test(line.trim())) {
      count++;
      continue;
    }
  }

  return count;
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

// ─── Existing-surfaces-verified evaluator ─────────────────────────────────────

/**
 * CR-033: Verify that every path cited in the `## Existing Surfaces` section
 * of the document body actually exists on disk relative to the project root.
 *
 * Algorithm per CR-033 §1:
 *  1. Locate `## Existing Surfaces` section. Absent → not-applicable (pass).
 *  2. Extract path-shaped substrings via permissive regex; strip `:symbol` suffix.
 *  3. Sandbox-check + fs.existsSync each unique path.
 *  4. Zero paths found: look for "no overlap found" / sentinel phrases → pass or fail.
 *  5. Any missing path → fail with detail naming each missing path.
 *
 * Note: The permissive regex intentionally matches prose-shaped strings like `e.g`.
 * The existence check filters them — `e.g` will not exist on disk and the criterion
 * will fail with that string in the detail. This is the accepted CR-033 §0.5 Q1
 * trade-off: permissive matching + existence filter, not strict format enforcement.
 *
 * Section locator reuses the `body.split(/^(?=## )/m)` pattern from evalSection
 * (FLASHCARD 2026-04-19 #gates #predicate #section — off-by-one if body starts with ##).
 */
function evalExistingSurfacesVerified(
  doc: ParsedDoc,
  projectRoot: string
): { pass: boolean; detail: string } {
  const body = doc.body;

  // Step 1: Locate ## Existing Surfaces section.
  // Split on ## headings using lookahead (same pattern as evalSection at L464).
  const rawParts = body.split(/^(?=## )/m);
  let sectionContent: string | undefined;
  for (const part of rawParts) {
    // Per CR-033 and M3 plan gotcha: match literal `## Existing Surfaces` (not numbered heading).
    if (part.startsWith('## Existing Surfaces')) {
      sectionContent = part;
      break;
    }
  }

  if (!sectionContent) {
    // Section absent → not-applicable; reuse-audit-recorded already handles the absence.
    return {
      pass: true,
      detail: `not-applicable: ## Existing Surfaces section absent — reuse-audit-recorded already failing`,
    };
  }

  // Step 2: Extract path-shaped substrings via permissive regex (CR-033 §0.5 Q1 resolved).
  // Matches: src/foo.ts, src/foo.ts:fetchIssues, package.json, cleargate-cli/src/lib/foo.ts
  const PATH_RE = /[a-zA-Z0-9_./-]+\.[a-zA-Z]{1,5}(?::[a-zA-Z_][a-zA-Z0-9_]*)?/g;
  const rawMatches = sectionContent.match(PATH_RE) ?? [];

  // Strip :symbol suffix and deduplicate
  const paths = [...new Set(rawMatches.map((m) => m.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)$/, '')))];

  // Step 4: Zero paths found — look for sentinel phrases.
  if (paths.length === 0) {
    const SENTINEL_RE =
      /no overlap found|no existing surface|no prior implementation|audit returned empty/i;
    if (SENTINEL_RE.test(sectionContent)) {
      return {
        pass: true,
        detail: `## Existing Surfaces contains no path citations; sentinel phrase present — audit explicitly empty`,
      };
    }
    return {
      pass: false,
      detail: `'## Existing Surfaces' has no path citations and no "no overlap found" sentinel`,
    };
  }

  // Step 3: For each unique path, sandbox-check + existence-check.
  const missing: string[] = [];
  for (const p of paths) {
    const resolved = path.resolve(projectRoot, p);
    // Sandbox check: must be inside projectRoot (same pattern as evalFileExists at ~L580).
    if (!resolved.startsWith(projectRoot + path.sep) && resolved !== projectRoot) {
      // Sandbox-rejected paths are treated as missing per CR-033 §1 step 4.
      missing.push(p);
      continue;
    }
    if (!fs.existsSync(resolved)) {
      missing.push(p);
    }
  }

  // Step 5: Report result.
  if (missing.length > 0) {
    return {
      pass: false,
      detail: `cited paths do not exist on disk: ${missing.join(', ')}`,
    };
  }

  return {
    pass: true,
    detail: `all ${paths.length} cited path${paths.length === 1 ? '' : 's'} exist on disk`,
  };
}
