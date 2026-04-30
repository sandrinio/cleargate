/**
 * STORY-020-03: Shared Phase 4 — Contradiction Check helpers.
 *
 * Extracted from cleargate-cli/src/commands/wiki-ingest.ts so that both:
 *   - wikiIngestHandler (STORY-020-02) — calls preparePhase4 + commitPhase4Findings
 *   - wikiContradictHandler (STORY-020-03) — calls the same helpers for on-demand check
 * share a single implementation. No duplicate Phase 4 logic (DoD §4.2).
 *
 * The `runPhase4` function is the primary public surface used by the CLI handler.
 * `preparePhase4` and `commitPhase4Findings` remain exported for unit tests and for
 * the ingest handler which calls them in two separate steps.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseFrontmatter } from '../../wiki/parse-frontmatter.js';
import { parsePage } from '../../wiki/page-schema.js';
import type { GitRunner } from '../../wiki/git-sha.js';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Statuses for which Phase 4 (contradiction check) should run. */
export const PHASE4_TRIGGER_STATUSES = new Set(['Draft', 'In Review']);

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

// ─── Phase 4: preparePhase4 ──────────────────────────────────────────────────

export interface PreparePhase4Opts {
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

// ─── Phase 4: commitPhase4Findings ───────────────────────────────────────────

export interface CommitPhase4Opts {
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

// ─── runPhase4: convenience wrapper for the CLI subcommand ───────────────────

export interface RunPhase4Opts {
  /** Absolute path to the raw delivery file. */
  absRawPath: string;
  /** Relative path from repo root (used in prompt and stamp). */
  relRawPath: string;
  /** Absolute path to wiki root. */
  wikiRoot: string;
  /** Item ID (derived from filename). */
  id: string;
  /** Frontmatter fields parsed from the raw file. */
  fm: Record<string, unknown>;
  /** Body text from the raw file (used for [[ID]] extraction). */
  body: string;
  /** Git SHA of the raw file at this moment. */
  currentSha: string;
  /** Whether to skip log append and SHA stamp (dry-run mode). */
  dryRun: boolean;
  /** Frozen timestamp generator. */
  now: () => string;
  /** Optional git runner test seam. */
  gitRunner?: GitRunner;
  /**
   * Test seam: stub for Phase 4 subagent invocation.
   * In production, runPhase4 emits a `phase4:` JSON line and returns without findings.
   * When provided, the stub is called synchronously and its findings are committed.
   */
  phase4SubagentStub?: (draftWikiPath: string, neighborhood: string[]) => ContradictFinding[];
}

export interface RunPhase4Result {
  /** Whether Phase 4 was skipped. */
  skipped: boolean;
  /** Skip reason (status or sha-idempotent). Present when skipped=true. */
  reason?: string;
  /**
   * Findings committed (only populated when phase4SubagentStub is provided).
   * In production (no stub), findings come from the agent workflow.
   */
  findings: ContradictFinding[];
  /**
   * JSON signal emitted to stdout in production mode (no stub).
   * The calling agent reads this and invokes cleargate-wiki-contradict via Task.
   */
  phase4Signal?: string;
}

/**
 * Convenience wrapper that combines preparePhase4 + commitPhase4Findings.
 *
 * Used by wikiContradictHandler. wikiIngestHandler calls the two steps separately
 * so it can interleave its own stdout between them.
 *
 * Production path (no stub): returns the phase4Signal JSON string for the
 * calling agent to act on (Mode A — the agent spawns Task, not Node code).
 * Dry-run path: returns findings (or empty) without mutating any state.
 */
export function runPhase4(opts: RunPhase4Opts): RunPhase4Result {
  const result = preparePhase4({
    absRawPath: opts.absRawPath,
    relRawPath: opts.relRawPath,
    wikiRoot: opts.wikiRoot,
    id: opts.id,
    fm: opts.fm,
    body: opts.body,
    currentSha: opts.currentSha,
    gitRunner: opts.gitRunner,
  });

  if (result.skip) {
    return { skipped: true, reason: result.reason, findings: [] };
  }

  const stub = opts.phase4SubagentStub;

  if (stub) {
    // Test seam: synchronously call the stub and (optionally) commit findings
    const findings = stub(result.draftWikiPath, result.neighborhood);

    if (!opts.dryRun) {
      commitPhase4Findings({
        absRawPath: opts.absRawPath,
        wikiRoot: opts.wikiRoot,
        findings,
        ingestSha: result.ingestSha,
        truncated: result.truncated,
        draftId: result.draftId,
        now: opts.now,
      });
    }

    return { skipped: false, findings };
  }

  // Production path: emit a signal line for the calling agent (Mode A).
  // The agent (cleargate-wiki-ingest or orchestrator) reads this JSON, spawns
  // cleargate-wiki-contradict via Task, then calls `cleargate wiki contradict commit`.
  // Node code cannot invoke the Task tool directly — no Node-side Task API.
  const phase4Signal = JSON.stringify({
    draftId: result.draftId,
    draftWikiPath: result.draftWikiPath,
    neighborhood: result.neighborhood,
    truncated: result.truncated,
    ingestSha: result.ingestSha,
    prompt: result.prompt,
  });

  return { skipped: false, findings: [], phase4Signal };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Resolve which wiki bucket an ID belongs to. */
export function getBucketFromId(id: string): string {
  if (id.startsWith('EPIC-')) return 'epics';
  if (id.startsWith('STORY-')) return 'stories';
  if (id.startsWith('SPRINT-')) return 'sprints';
  if (id.startsWith('PROPOSAL-')) return 'proposals';
  if (id.startsWith('CR-')) return 'crs';
  if (id.startsWith('BUG-')) return 'bugs';
  return 'topics';
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

/** Stamp last_contradict_sha into a file's frontmatter (wiki page or raw file). */
function stampContradictSha(absFilePath: string, sha: string): void {
  try {
    const raw = fs.readFileSync(absFilePath, 'utf8');
    const stamped = upsertFrontmatterField(raw, 'last_contradict_sha', sha);
    fs.writeFileSync(absFilePath, stamped, 'utf8');
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
