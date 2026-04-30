import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseFrontmatter } from '../wiki/parse-frontmatter.js';
import { deriveBucket } from '../wiki/derive-bucket.js';
import { deriveRepo } from '../wiki/derive-repo.js';
import { getGitSha, type GitRunner } from '../wiki/git-sha.js';
import { serializePage, parsePage, type WikiPage } from '../wiki/page-schema.js';
import { compile as compileActiveSprint } from '../wiki/synthesis/active-sprint.js';
import { compile as compileOpenGates } from '../wiki/synthesis/open-gates.js';
import { compile as compileProductState } from '../wiki/synthesis/product-state.js';
import { compile as compileRoadmap } from '../wiki/synthesis/roadmap.js';
import { scanRawItems, type RawItem } from '../wiki/scan.js';

// ─── Phase 4 types ───────────────────────────────────────────────────────────

/** Statuses for which Phase 4 (contradiction check) should run. */
const PHASE4_TRIGGER_STATUSES = new Set(['Draft', 'In Review']);

/** A single contradiction finding from the contradict subagent. */
export interface ContradictFinding {
  draft: string;
  neighbor: string;
  claim: string;
}

/** Returned by preparePhase4 when Phase 4 should be skipped. */
export interface Phase4Skip {
  skip: true;
  reason: string;
}

/** Returned by preparePhase4 when Phase 4 should proceed. */
export interface Phase4Ready {
  skip: false;
  /** ID of the draft item being ingested. */
  draftId: string;
  /** Absolute path to the just-written wiki page for the draft. */
  draftWikiPath: string;
  /** Neighborhood page paths (wiki pages, relative to wiki root). */
  neighborhood: string[];
  /** Whether neighborhood was truncated to 12. */
  truncated: boolean;
  /** Git SHA of the raw file at this moment. */
  ingestSha: string;
  /** Prompt string to pass to the contradict subagent. */
  prompt: string;
}

export type Phase4Result = Phase4Skip | Phase4Ready;

export interface WikiIngestOptions {
  /** Absolute path to the raw delivery file to ingest */
  rawPath: string;
  /** Test seam: working directory (defaults to process.cwd()) */
  cwd?: string;
  /** Test seam: frozen ISO timestamp */
  now?: () => string;
  /** Test seam: replaces process.stdout.write */
  stdout?: (s: string) => void;
  /** Test seam: replaces process.stderr.write */
  stderr?: (s: string) => void;
  /** Test seam: replaces process.exit */
  exit?: (code: number) => never;
  /** Test seam: forwarded to getGitSha */
  gitRunner?: GitRunner;
  /** Test seam: replaces fs.rename (for atomic index.md write test) */
  rename?: (src: string, dst: string) => void;
  /** Test seam: override directory for synthesis templates (default resolved via import.meta.url) */
  templateDir?: string;
  /**
   * Test seam: stub for Phase 4 subagent invocation.
   * When provided, replaces the stdout signal (agent-workflow invocation) with a
   * direct call — returning findings synchronously. Used in unit tests only.
   * In production, Phase 4 emits a `phase4:` JSON line; the calling agent reads it
   * and spawns the contradict subagent via Task, then calls commitPhase4Findings.
   */
  phase4SubagentStub?: (draftWikiPath: string, neighborhood: string[]) => ContradictFinding[];
}

/** Directories under .cleargate/ that are excluded from ingest per §10.3. */
const EXCLUDED_SUFFIXES = [
  '.cleargate/knowledge/',
  '.cleargate/templates/',
  '.cleargate/sprint-runs/',
  '.cleargate/hook-log/',
  '.cleargate/wiki/',
];

const BUCKET_ORDER = ['epics', 'stories', 'sprints', 'proposals', 'crs', 'bugs', 'topics'] as const;
const BUCKET_LABELS: Record<string, string> = {
  epics: 'Epics',
  stories: 'Stories',
  sprints: 'Sprints',
  proposals: 'Proposals',
  crs: 'CRs',
  bugs: 'Bugs',
  topics: 'Topics',
};

export async function wikiIngestHandler(opts: WikiIngestOptions): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const now = opts.now ?? (() => new Date().toISOString());
  const stdout = opts.stdout ?? ((s) => process.stdout.write(s));
  const stderr = opts.stderr ?? ((s) => process.stderr.write(s));
  const exit = opts.exit ?? ((c: number): never => process.exit(c));
  const gitRunner = opts.gitRunner;
  const rename = opts.rename ?? fs.renameSync;
  const templateDir = opts.templateDir;

  const rawPath = opts.rawPath;

  // Resolve rawPath: if relative, resolve against cwd
  const absRawPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(cwd, rawPath);
  // Compute relative path from cwd (repo root)
  const relRawPath = path.relative(cwd, absRawPath).replace(/\\/g, '/');

  // Step 1: Validate path resolves under <cwd>/.cleargate/delivery/
  const deliveryRoot = path.join(cwd, '.cleargate', 'delivery');
  const deliveryRootNorm = deliveryRoot.replace(/\\/g, '/');
  const absDeliveryRoot = deliveryRoot;

  // Check: absRawPath must be under absDeliveryRoot
  const relToDelivery = path.relative(absDeliveryRoot, absRawPath);
  if (relToDelivery.startsWith('..') || path.isAbsolute(relToDelivery)) {
    stderr(`wiki ingest: ${rawPath} not under .cleargate/delivery/\n`);
    exit(2);
    return;
  }

  void deliveryRootNorm; // suppress lint warning

  // Step 2: Exclusion check (defense-in-depth)
  const isExcluded = EXCLUDED_SUFFIXES.some((excl) => relRawPath.startsWith(excl));
  if (isExcluded) {
    stdout(`wiki ingest: ${rawPath} excluded (skip)\n`);
    exit(0);
    return;
  }

  // Step 3: Derive bucket + id + type + repo
  const filename = path.basename(absRawPath);
  let bucketInfo: ReturnType<typeof deriveBucket>;
  try {
    bucketInfo = deriveBucket(filename);
  } catch (e) {
    stderr(`wiki ingest: cannot determine bucket for ${rawPath}: ${(e as Error).message}\n`);
    exit(1);
    return;
  }

  let repo: ReturnType<typeof deriveRepo>;
  try {
    repo = deriveRepo(relRawPath);
  } catch (e) {
    stderr(`wiki ingest: cannot derive repo for ${rawPath}: ${(e as Error).message}\n`);
    exit(1);
    return;
  }

  const { type, id, bucket } = bucketInfo;

  const wikiRoot = path.join(cwd, '.cleargate', 'wiki');
  const pageDir = path.join(wikiRoot, bucket);
  const pagePath = path.join(pageDir, `${id}.md`);

  // Read and parse the raw file
  let rawContent: string;
  try {
    rawContent = fs.readFileSync(absRawPath, 'utf8');
  } catch (e) {
    stderr(`wiki ingest: cannot read ${rawPath}: ${(e as Error).message}\n`);
    exit(1);
    return;
  }

  let fm: Record<string, unknown>;
  let body: string;
  try {
    const parsed = parseFrontmatter(rawContent);
    fm = parsed.fm;
    body = parsed.body;
  } catch (e) {
    stderr(`wiki ingest: malformed frontmatter in ${rawPath}: ${(e as Error).message}\n`);
    exit(1);
    return;
  }

  // Step 4: Idempotency guard (A2)
  const currentSha = getGitSha(absRawPath, gitRunner) ?? '';
  const pageExists = fs.existsSync(pagePath);

  if (pageExists && currentSha !== '') {
    let isNoOp = false;
    try {
      const existingPageContent = fs.readFileSync(pagePath, 'utf8');
      const existingPage = parsePage(existingPageContent);

      if (existingPage.last_ingest_commit === currentSha) {
        // Check if raw file content matches what git shows for that SHA
        const contentUnchanged = checkContentUnchanged(absRawPath, currentSha, relRawPath, gitRunner);
        if (contentUnchanged) {
          isNoOp = true;
        }
      }
    } catch {
      // If we can't parse the existing page, proceed with ingest
    }

    if (isNoOp) {
      stdout(`wiki ingest: ${id} unchanged (no-op)\n`);
      exit(0);
      return;
    }
  }

  // Determine action
  const action = pageExists ? 'update' : 'create';

  // Preserve last_contradict_sha from the existing wiki page (Phase 4 stamps it there;
  // we must carry it forward when re-writing the page so idempotency survives re-ingest).
  let existingLastContradictSha: string | undefined;
  if (pageExists) {
    try {
      const existingPageContent = fs.readFileSync(pagePath, 'utf8');
      const existingPage = parsePage(existingPageContent);
      existingLastContradictSha = existingPage.last_contradict_sha;
    } catch {
      // If parse fails, leave undefined
    }
  }

  // Step 5: Build new WikiPage and write it
  const parent = buildParentRef(fm);
  const children = buildChildrenRefs(fm);
  const timestamp = now();

  const wikiPage: WikiPage = {
    type,
    id,
    parent,
    children,
    status: String(fm['status'] ?? ''),
    remote_id: String(fm['remote_id'] ?? ''),
    raw_path: relRawPath,
    last_ingest: timestamp,
    last_ingest_commit: currentSha,
    repo,
    // Carry forward last_contradict_sha so Phase 4 idempotency survives re-ingest
    ...(existingLastContradictSha !== undefined ? { last_contradict_sha: existingLastContradictSha } : {}),
  };

  const pageBody = buildPageBody({ id, fm, body });
  const pageContent = serializePage(wikiPage, pageBody);

  fs.mkdirSync(pageDir, { recursive: true });
  fs.writeFileSync(pagePath, pageContent, 'utf8');

  // Step 6: Append one log entry to wiki/log.md
  appendLogEntry(wikiRoot, { timestamp, action, id, relRawPath });

  // Step 7: Update wiki/index.md (atomic write-temp-then-rename)
  updateIndex(wikiRoot, { id, type, status: wikiPage.status, relRawPath, rename });

  // Step 8: Recompile affected synthesis pages (all four — M3 over-recompiles)
  recompileSynthesis(wikiRoot, cwd, templateDir);

  // Step 9: Phase 4 — Contradiction Check (advisory, never exits non-zero)
  const phase4Result = preparePhase4({
    absRawPath,
    relRawPath,
    wikiRoot,
    id,
    fm,
    body,
    currentSha,
    gitRunner,
  });

  if (!phase4Result.skip) {
    const phase4SeamStub = opts.phase4SubagentStub;
    if (phase4SeamStub) {
      // Test seam: synchronously call the stub instead of emitting a signal
      const findings = phase4SeamStub(phase4Result.draftWikiPath, phase4Result.neighborhood);
      commitPhase4Findings({
        absRawPath,
        wikiRoot,
        findings,
        ingestSha: phase4Result.ingestSha,
        truncated: phase4Result.truncated,
        draftId: phase4Result.draftId,
        now,
      });
    } else {
      // Production path: emit a signal line for the calling agent to act on.
      // The agent (cleargate-wiki-ingest) reads this JSON, spawns cleargate-wiki-contradict
      // via Task, and calls `cleargate wiki contradict-commit <rawPath> < findings.json`.
      stdout(`phase4: ${JSON.stringify({
        draftId: phase4Result.draftId,
        draftWikiPath: phase4Result.draftWikiPath,
        neighborhood: phase4Result.neighborhood,
        truncated: phase4Result.truncated,
        ingestSha: phase4Result.ingestSha,
        prompt: phase4Result.prompt,
      })}\n`);
    }
  }

  // Step 10: Print result
  stdout(`wiki ingest: ${action} ${bucket}/${id}.md\n`);
}

function checkContentUnchanged(
  absRawPath: string,
  sha: string,
  relRawPath: string,
  gitRunner?: GitRunner,
): boolean {
  try {
    const run = gitRunner ?? defaultGitRunner;
    // git show <sha>:<relRawPath> returns file content at that commit
    const gitContent = run('git', ['show', `${sha}:${relRawPath}`]);
    // Non-zero exit is handled by runner returning empty string (defaultRunner returns stdout)
    // If empty string returned from show when sha is valid, treat as changed
    if (!gitContent && gitContent !== '') return false;
    const currentContent = fs.readFileSync(absRawPath, 'utf8');
    return gitContent === currentContent;
  } catch {
    return false;
  }
}

function defaultGitRunner(cmd: string, args: string[]): string {
  const result = spawnSync(cmd, args, { encoding: 'utf8' });
  if (result.status !== 0) return '\0__NONZERO__'; // sentinel for non-zero exit
  return result.stdout ?? '';
}

function buildParentRef(fm: Record<string, unknown>): string {
  const raw = fm['parent_epic_ref'] ?? fm['parent'] ?? '';
  const s = String(raw);
  if (!s) return '';
  if (s.startsWith('[[') && s.endsWith(']]')) return s;
  return `[[${s}]]`;
}

function buildChildrenRefs(fm: Record<string, unknown>): string[] {
  const raw = fm['children'];
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.map((c) => {
    const s = String(c);
    if (s.startsWith('[[') && s.endsWith(']]')) return s;
    return `[[${s}]]`;
  });
}

function buildPageBody(item: { id: string; fm: Record<string, unknown>; body: string }): string {
  const title = String(item.fm['title'] ?? item.id);
  const summary = String(
    item.fm['description'] ?? item.body.split('\n')[0] ?? 'No summary available.',
  ).slice(0, 200);

  const parent = buildParentRef(item.fm);
  const children = buildChildrenRefs(item.fm);
  const blastParts: string[] = [];
  if (parent) blastParts.push(parent);
  for (const child of children) blastParts.push(child);
  const blastLine = blastParts.length > 0 ? blastParts.join(', ') : 'None.';

  return [
    `# ${item.id}: ${title}`,
    '',
    summary,
    '',
    '## Blast radius',
    `Affects: ${blastLine}`,
    '',
    '## Open questions',
    'None.',
    '',
  ].join('\n');
}

function appendLogEntry(
  wikiRoot: string,
  entry: { timestamp: string; action: string; id: string; relRawPath: string },
): void {
  const logPath = path.join(wikiRoot, 'log.md');
  const logEntry = [
    `- timestamp: "${entry.timestamp}"`,
    `  actor: "cleargate wiki ingest"`,
    `  action: "${entry.action}"`,
    `  target: "${entry.id}"`,
    `  path: "${entry.relRawPath}"`,
  ].join('\n');

  if (fs.existsSync(logPath)) {
    const existing = fs.readFileSync(logPath, 'utf8');
    // Append to existing log
    const newContent = existing.trimEnd() + '\n' + logEntry + '\n';
    fs.writeFileSync(logPath, newContent, 'utf8');
  } else {
    fs.mkdirSync(wikiRoot, { recursive: true });
    fs.writeFileSync(logPath, `# Wiki Event Log\n\n${logEntry}\n`, 'utf8');
  }
}

function updateIndex(
  wikiRoot: string,
  opts: {
    id: string;
    type: string;
    status: string;
    relRawPath: string;
    rename: (src: string, dst: string) => void;
  },
): void {
  const indexPath = path.join(wikiRoot, 'index.md');
  const tmpPath = `${indexPath}.tmp`;

  const newRow = `| [[${opts.id}]] | ${opts.type} | ${opts.status} | ${opts.relRawPath} |`;

  let content: string;
  if (fs.existsSync(indexPath)) {
    content = fs.readFileSync(indexPath, 'utf8');
    // Check if a row with this id already exists; if so, replace it
    const idPattern = `[[${opts.id}]]`;
    const lines = content.split('\n');
    let replaced = false;
    const newLines = lines.map((line) => {
      if (line.includes(idPattern) && line.startsWith('|')) {
        replaced = true;
        return newRow;
      }
      return line;
    });

    if (replaced) {
      content = newLines.join('\n');
    } else {
      // Insert into the correct bucket section
      content = insertIntoSection(content, opts.id, newRow);
    }
  } else {
    // Build a minimal index.md with the item
    content = buildMinimalIndex(opts.id, opts.type, opts.status, opts.relRawPath);
  }

  fs.writeFileSync(tmpPath, content, 'utf8');
  opts.rename(tmpPath, indexPath);
}

function insertIntoSection(content: string, id: string, newRow: string): string {
  // Determine which bucket section to insert into
  const bucket = getBucketFromId(id);
  const label = BUCKET_LABELS[bucket] ?? bucket;
  const sectionHeader = `## ${label}`;

  const lines = content.split('\n');
  let sectionStart = -1;
  let nextSectionStart = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === sectionHeader) {
      sectionStart = i;
      // Find next section
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].startsWith('## ')) {
          nextSectionStart = j;
          break;
        }
      }
      break;
    }
  }

  if (sectionStart === -1) {
    // Section doesn't exist — append new section at end
    const sectionContent = [
      '',
      sectionHeader,
      '',
      newRow,
      '',
    ].join('\n');
    return content.trimEnd() + sectionContent;
  }

  // Find insertion point: after any existing rows in this section, sorted by id
  const sectionEnd = nextSectionStart === -1 ? lines.length : nextSectionStart;
  const sectionLines = lines.slice(sectionStart + 1, sectionEnd);

  // Find existing row entries and insert in sorted order
  let insertAt = -1;
  for (let i = 0; i < sectionLines.length; i++) {
    const line = sectionLines[i];
    if (line.startsWith('|') && !line.startsWith('|---|')) {
      // Extract the id from the row: | [[ID]] | ...
      const match = /\|\s*\[\[([^\]]+)\]\]/.exec(line);
      if (match) {
        const rowId = match[1];
        if (id.localeCompare(rowId) <= 0) {
          insertAt = sectionStart + 1 + i;
          break;
        }
      }
    }
  }

  if (insertAt === -1) {
    // Append before the next section or at end of section
    // Find last row in section
    let lastRowIdx = sectionStart + 1;
    for (let i = sectionStart + 1; i < sectionEnd; i++) {
      if (lines[i].startsWith('|')) {
        lastRowIdx = i + 1;
      }
    }
    lines.splice(lastRowIdx, 0, newRow);
  } else {
    lines.splice(insertAt, 0, newRow);
  }

  return lines.join('\n');
}

function getBucketFromId(id: string): string {
  if (id.startsWith('EPIC-')) return 'epics';
  if (id.startsWith('STORY-')) return 'stories';
  if (id.startsWith('SPRINT-')) return 'sprints';
  if (id.startsWith('PROPOSAL-')) return 'proposals';
  if (id.startsWith('CR-')) return 'crs';
  if (id.startsWith('BUG-')) return 'bugs';
  return 'topics';
}

function buildMinimalIndex(id: string, type: string, status: string, relRawPath: string): string {
  const bucket = getBucketFromId(id);
  const label = BUCKET_LABELS[bucket] ?? bucket;

  const lines: string[] = [
    '# Wiki Index',
    '',
    '> Auto-generated by `cleargate wiki build`. Do not edit manually.',
    '',
    '| ID | Type | Status | Raw Path |',
    '|---|---|---|---|',
  ];

  for (const b of BUCKET_ORDER) {
    if (b === 'topics') continue;
    lines.push('', `## ${BUCKET_LABELS[b]}`, '');
    if (b === bucket) {
      lines.push(`| [[${id}]] | ${type} | ${status} | ${relRawPath} |`);
    } else {
      lines.push('_No items._');
    }
  }
  lines.push('');

  void label; // suppress
  return lines.join('\n');
}

// ─── Phase 4: preparePhase4 ──────────────────────────────────────────────────

interface PreparePhase4Opts {
  absRawPath: string;
  relRawPath: string;
  wikiRoot: string;
  id: string;
  fm: Record<string, unknown>;
  body: string;
  currentSha: string;
  gitRunner?: GitRunner;
}

/**
 * Deterministic Phase 4 prep (no LLM).
 *
 * Returns `{ skip: true, reason }` when Phase 4 should not run (status filter
 * or SHA idempotency). Returns `{ skip: false, ... }` with the neighborhood
 * and prompt when Phase 4 should proceed.
 *
 * Exported for unit tests and for the `cleargate wiki contradict` subcommand (STORY-020-03).
 */
export function preparePhase4(opts: PreparePhase4Opts): Phase4Result {
  const { relRawPath, wikiRoot, id, fm, body, currentSha } = opts;

  // 1. Status filter — only Draft / In Review
  const rawStatus = String(fm['status'] ?? '');
  if (!PHASE4_TRIGGER_STATUSES.has(rawStatus)) {
    return { skip: true, reason: `status=${rawStatus}` };
  }

  // 2. SHA idempotency — check existing wiki page's last_contradict_sha
  const bucket = getBucketFromId(id);
  const pagePath = path.join(wikiRoot, bucket, `${id}.md`);
  if (fs.existsSync(pagePath)) {
    try {
      const existingContent = fs.readFileSync(pagePath, 'utf8');
      const existingPage = parsePage(existingContent);
      if (existingPage.last_contradict_sha && existingPage.last_contradict_sha === currentSha) {
        return { skip: true, reason: `sha-idempotent sha=${currentSha.slice(0, 8)}` };
      }
    } catch {
      // If parse fails, proceed with Phase 4
    }
  }

  // 3. Build neighborhood (deterministic)
  const neighborhood = collectNeighborhood({ fm, body, wikiRoot });
  const truncated = neighborhood.length > 12;
  const trimmedNeighborhood = truncated ? neighborhood.slice(0, 12) : neighborhood;

  // 4. Build prompt for the contradict subagent
  const draftWikiPath = pagePath;
  const prompt = buildContradictPrompt({ id, draftWikiPath, neighborhood: trimmedNeighborhood, relRawPath });

  return {
    skip: false,
    draftId: id,
    draftWikiPath,
    neighborhood: trimmedNeighborhood,
    truncated,
    ingestSha: currentSha,
    prompt,
  };
}

/** Collect the contradiction-check neighborhood for a draft (§1.2 STORY-020-02). */
function collectNeighborhood(opts: {
  fm: Record<string, unknown>;
  body: string;
  wikiRoot: string;
}): string[] {
  const { fm, body, wikiRoot } = opts;
  const seen = new Set<string>();
  const result: string[] = [];

  function addPath(wikiRelPath: string): void {
    const abs = path.join(wikiRoot, wikiRelPath);
    if (!seen.has(wikiRelPath) && fs.existsSync(abs)) {
      seen.add(wikiRelPath);
      result.push(wikiRelPath);
    }
  }

  // Step a: [[ID]] mentions in raw body
  const idMentions = extractIdMentions(body);
  for (const mentionedId of idMentions) {
    const bucket = getBucketFromId(mentionedId);
    addPath(`${bucket}/${mentionedId}.md`);
  }

  // Step b: parent page (from frontmatter parent_epic_ref or parent)
  const parentRaw = String(fm['parent_epic_ref'] ?? fm['parent'] ?? '');
  const parentId = parentRaw.replace(/^\[\[|\]\]$/g, '').trim();
  if (parentId) {
    const parentBucket = getBucketFromId(parentId);
    addPath(`${parentBucket}/${parentId}.md`);

    // Step c: siblings (other children of the parent epic)
    const parentPagePath = path.join(wikiRoot, parentBucket, `${parentId}.md`);
    if (fs.existsSync(parentPagePath)) {
      try {
        const parentContent = fs.readFileSync(parentPagePath, 'utf8');
        const parentPage = parsePage(parentContent);
        for (const childRef of parentPage.children) {
          const childId = childRef.replace(/^\[\[|\]\]$/g, '').trim();
          if (childId) {
            const childBucket = getBucketFromId(childId);
            addPath(`${childBucket}/${childId}.md`);
          }
        }
      } catch {
        // ignore parse errors
      }
    }

    // Step d: topic pages that cite this parent
    const topicsDir = path.join(wikiRoot, 'topics');
    if (fs.existsSync(topicsDir)) {
      try {
        const topicFiles = fs.readdirSync(topicsDir).filter((f) => f.endsWith('.md'));
        for (const tf of topicFiles) {
          const topicPath = path.join(topicsDir, tf);
          try {
            const topicContent = fs.readFileSync(topicPath, 'utf8');
            const { fm: topicFm } = parseFrontmatter(topicContent);
            const cites = topicFm['cites'];
            const citesArr = Array.isArray(cites) ? cites : cites ? [cites] : [];
            const citesParent = citesArr.some((c) => {
              const s = String(c).replace(/^\[\[|\]\]$/g, '').trim();
              return s === parentId;
            });
            if (citesParent) {
              addPath(`topics/${tf}`);
            }
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    }
  }

  return result;
}

/** Extract [[ID]] references from raw markdown body text. */
function extractIdMentions(body: string): string[] {
  const re = /\[\[([A-Z][A-Z0-9-]+)\]\]/g;
  const seen = new Set<string>();
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const id = m[1];
    if (!seen.has(id)) {
      seen.add(id);
      results.push(id);
    }
  }
  return results;
}

/** Build the prompt string for the contradict subagent. */
function buildContradictPrompt(opts: {
  id: string;
  draftWikiPath: string;
  neighborhood: string[];
  relRawPath: string;
}): string {
  const { id, draftWikiPath, neighborhood, relRawPath } = opts;
  return [
    `Check draft ${id} for contradictions against its neighborhood.`,
    `Draft wiki page: ${draftWikiPath}`,
    `Raw source: ${relRawPath}`,
    `Neighborhood pages (${neighborhood.length}): ${neighborhood.join(', ')}`,
    `For each contradiction found, emit one line: contradiction: ${id} vs <neighbor-id> · <claim-summary (≤80 chars)>`,
    `Follow each finding with one reasoning paragraph. Always exit 0.`,
  ].join('\n');
}

// ─── Phase 4: commitPhase4Findings ───────────────────────────────────────────

interface CommitPhase4Opts {
  /** Absolute path to the raw delivery file (for raw frontmatter stamp). */
  absRawPath: string;
  /** Absolute path to wiki root. */
  wikiRoot: string;
  /** Draft item ID (used to locate wiki page for idempotency stamp). */
  draftId: string;
  /** Findings from the contradict subagent. */
  findings: ContradictFinding[];
  /** Git SHA used for idempotency stamping. */
  ingestSha: string;
  /** Whether neighborhood was truncated. */
  truncated: boolean;
  /** Frozen timestamp generator. */
  now: () => string;
}

/**
 * Commit Phase 4 findings: append to contradictions.md and stamp last_contradict_sha.
 *
 * Stamps `last_contradict_sha` on BOTH:
 * 1. The wiki page (`.cleargate/wiki/<bucket>/<id>.md`) — used by `preparePhase4` for
 *    idempotency on the next ingest run.
 * 2. The raw delivery file — informational, mirrors the wiki page stamp.
 *
 * Always exits cleanly — advisory only.
 *
 * Exported for unit tests and for the `cleargate wiki contradict` subcommand (STORY-020-03).
 */
export function commitPhase4Findings(opts: CommitPhase4Opts): void {
  const { absRawPath, wikiRoot, findings, ingestSha, truncated, draftId, now } = opts;

  const contradictionsPath = path.join(wikiRoot, 'contradictions.md');

  // Append findings to contradictions.md
  if (findings.length > 0) {
    const entries = findings.map((f) =>
      [
        `- draft: "[[${f.draft || draftId}]]"`,
        `  neighbor: "[[${f.neighbor}]]"`,
        `  claim: ${JSON.stringify(f.claim)}`,
        `  ingest_sha: "${ingestSha}"`,
        `  truncated: ${truncated}`,
        `  label: null`,
      ].join('\n'),
    );

    if (fs.existsSync(contradictionsPath)) {
      const existing = fs.readFileSync(contradictionsPath, 'utf8');
      // Append entries after existing findings: block (trimEnd + newline + entries)
      const newContent = existing.trimEnd() + '\n' + entries.join('\n') + '\n';
      fs.writeFileSync(contradictionsPath, newContent, 'utf8');
    } else {
      // Create skeleton + entries
      fs.mkdirSync(wikiRoot, { recursive: true });
      const skeleton = buildContradictionsSkeletonWithFindings(now(), entries);
      fs.writeFileSync(contradictionsPath, skeleton, 'utf8');
    }
  } else {
    // No findings — ensure contradictions.md exists (create skeleton if not)
    if (!fs.existsSync(contradictionsPath)) {
      fs.mkdirSync(wikiRoot, { recursive: true });
      fs.writeFileSync(contradictionsPath, buildContradictionsSkeleton(now()), 'utf8');
    }
  }

  // Stamp last_contradict_sha on the WIKI PAGE (primary — used by preparePhase4 idempotency)
  const wikiPageBucket = getBucketFromId(draftId);
  const wikiPagePath = path.join(wikiRoot, wikiPageBucket, `${draftId}.md`);
  stampContradictSha(wikiPagePath, ingestSha);

  // Also stamp on the raw file (informational mirror)
  stampContradictSha(absRawPath, ingestSha);
}

/** Build the initial contradictions.md skeleton with findings. */
function buildContradictionsSkeletonWithFindings(timestamp: string, entries: string[]): string {
  return [
    '---',
    `type: "synthesis"`,
    `id: "contradictions"`,
    `generated_at: "${timestamp}"`,
    '---',
    '',
    '# Wiki Contradictions — Advisory Log',
    '',
    '(Append-only. Each entry is one YAML record. Human applies label: true-positive | false-positive | nitpick.)',
    '',
    'findings:',
    ...entries,
    '',
  ].join('\n');
}

/** Build the initial contradictions.md skeleton without findings. */
function buildContradictionsSkeleton(timestamp: string): string {
  return [
    '---',
    `type: "synthesis"`,
    `id: "contradictions"`,
    `generated_at: "${timestamp}"`,
    '---',
    '',
    '# Wiki Contradictions — Advisory Log',
    '',
    '(Append-only. Each entry is one YAML record. Human applies label: true-positive | false-positive | nitpick.)',
    '',
    'findings: []',
    '',
  ].join('\n');
}

/** Stamp last_contradict_sha into the raw file's frontmatter. */
function stampContradictSha(absRawPath: string, sha: string): void {
  try {
    const raw = fs.readFileSync(absRawPath, 'utf8');
    const stamped = upsertFrontmatterField(raw, 'last_contradict_sha', sha);
    fs.writeFileSync(absRawPath, stamped, 'utf8');
  } catch {
    // Advisory — never throws
  }
}

/**
 * Upsert a single string field in the first frontmatter block.
 * Reads raw bytes, regex-replaces target line in first --- block.
 * Per FLASHCARD #frontmatter #write-back: do NOT round-trip via parseFrontmatter+re-serialize.
 */
function upsertFrontmatterField(raw: string, key: string, value: string): string {
  const lines = raw.split('\n');
  if (lines[0] !== '---') return raw;

  let closeIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') { closeIdx = i; break; }
  }
  if (closeIdx === -1) return raw;

  // Check if field already exists in frontmatter block
  const keyPrefix = `${key}:`;
  let found = false;
  for (let i = 1; i < closeIdx; i++) {
    if (lines[i].startsWith(keyPrefix)) {
      lines[i] = `${key}: "${value}"`;
      found = true;
      break;
    }
  }

  if (!found) {
    // Insert before closing ---
    lines.splice(closeIdx, 0, `${key}: "${value}"`);
  }

  return lines.join('\n');
}

function recompileSynthesis(wikiRoot: string, cwd: string, templateDir?: string): void {
  // Recompile all four synthesis pages
  // Gather current state from wiki pages to pass to recipes
  const deliveryRoot = path.join(cwd, '.cleargate', 'delivery');
  let items: RawItem[] = [];
  if (fs.existsSync(deliveryRoot)) {
    try {
      items = scanRawItems(deliveryRoot, cwd);
    } catch {
      // If scan fails, pass empty state — synthesis pages will reflect empty
    }
  }

  fs.writeFileSync(path.join(wikiRoot, 'active-sprint.md'), compileActiveSprint(items, templateDir), 'utf8');
  fs.writeFileSync(path.join(wikiRoot, 'open-gates.md'), compileOpenGates(items, templateDir), 'utf8');
  fs.writeFileSync(path.join(wikiRoot, 'product-state.md'), compileProductState(items, templateDir), 'utf8');
  fs.writeFileSync(path.join(wikiRoot, 'roadmap.md'), compileRoadmap(items, templateDir), 'utf8');
}
