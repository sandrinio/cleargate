/**
 * STORY-020-03: `cleargate wiki contradict <file>` handler.
 *
 * Thin CLI wrapper over the shared Phase 4 helpers in lib/wiki/contradict.ts.
 * Both this handler and wikiIngestHandler call the same runPhase4 / preparePhase4
 * / commitPhase4Findings — no duplicate logic (DoD §4.2).
 *
 * Flow (Mode A — orchestrator decision §B=A1):
 *   1. Resolve file → derive bucket/id/fm/body/currentSha
 *   2. Call runPhase4 which calls preparePhase4 internally
 *   3a. Skipped → print "skipped: <reason>", exit 0
 *   3b. Stub provided (tests) → findings committed (or not if --dry-run)
 *   3c. Production → emit phase4 JSON signal on stdout for the calling agent
 *       (agent spawns cleargate-wiki-contradict via Task); exit 0
 *
 * `--dry-run` suppresses log append and SHA stamp; only prints findings.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseFrontmatter } from '../wiki/parse-frontmatter.js';
import { deriveBucket } from '../wiki/derive-bucket.js';
import { getGitSha, type GitRunner } from '../wiki/git-sha.js';
import { runPhase4, type ContradictFinding } from '../lib/wiki/contradict.js';

export interface WikiContradictOptions {
  /** Absolute or repo-relative path to a wiki page or raw delivery file. */
  filePath: string;
  /** When true, print findings without mutating state. */
  dryRun?: boolean;
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
  /**
   * Test seam: stub for Phase 4 subagent invocation.
   * When provided, replaces the stdout signal with a synchronous call.
   */
  phase4SubagentStub?: (draftWikiPath: string, neighborhood: string[]) => ContradictFinding[];
}

export async function wikiContradictHandler(opts: WikiContradictOptions): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const now = opts.now ?? (() => new Date().toISOString());
  const stdout = opts.stdout ?? ((s) => process.stdout.write(s));
  const stderr = opts.stderr ?? ((s) => process.stderr.write(s));
  const exit = opts.exit ?? ((c: number): never => process.exit(c));
  const gitRunner = opts.gitRunner;
  const dryRun = opts.dryRun ?? false;

  const filePath = opts.filePath;

  // Resolve filePath: if relative, resolve against cwd
  const absFilePath = path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath);
  const relFilePath = path.relative(cwd, absFilePath).replace(/\\/g, '/');

  // Validate the file exists
  if (!fs.existsSync(absFilePath)) {
    stderr(`wiki contradict: file not found: ${filePath}\n`);
    exit(1);
    return;
  }

  // Derive bucket + id from filename
  const filename = path.basename(absFilePath);
  let bucketInfo: { type: string; id: string; bucket: string };
  try {
    bucketInfo = deriveBucket(filename);
  } catch (e) {
    stderr(`wiki contradict: cannot determine bucket for ${filePath}: ${(e as Error).message}\n`);
    exit(1);
    return;
  }

  const { id } = bucketInfo;
  const wikiRoot = path.join(cwd, '.cleargate', 'wiki');

  // Read and parse the raw file
  let rawContent: string;
  try {
    rawContent = fs.readFileSync(absFilePath, 'utf8');
  } catch (e) {
    stderr(`wiki contradict: cannot read ${filePath}: ${(e as Error).message}\n`);
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
    stderr(`wiki contradict: malformed frontmatter in ${filePath}: ${(e as Error).message}\n`);
    exit(1);
    return;
  }

  // Get current git SHA for idempotency check
  const currentSha = getGitSha(absFilePath, gitRunner ?? defaultGitRunner) ?? '';

  // Run Phase 4
  const result = runPhase4({
    absRawPath: absFilePath,
    relRawPath: relFilePath,
    wikiRoot,
    id,
    fm,
    body,
    currentSha,
    dryRun,
    now,
    gitRunner,
    phase4SubagentStub: opts.phase4SubagentStub,
  });

  if (result.skipped) {
    stdout(`skipped: ${result.reason ?? 'unknown reason'}\n`);
    exit(0);
    return;
  }

  if (opts.phase4SubagentStub) {
    // Test seam path: findings were committed (or dry-run skipped commit)
    for (const f of result.findings) {
      stdout(`contradiction: ${f.draft} vs ${f.neighbor} · ${f.claim}\n`);
    }
    if (result.findings.length === 0) {
      stdout(`wiki contradict: no contradictions found for ${id}\n`);
    }
  } else {
    // Production path: emit the phase4 signal for the calling agent
    // The agent reads this JSON, spawns cleargate-wiki-contradict via Task.
    // (Node code cannot invoke the Task tool directly — no Node-side Task API.)
    if (result.phase4Signal) {
      stdout(`phase4: ${result.phase4Signal}\n`);
    }
  }

  // Always exit 0 — contradiction check is advisory
  exit(0);
}

function defaultGitRunner(cmd: string, args: string[]): string {
  const result = spawnSync(cmd, args, { encoding: 'utf8' });
  if (result.status !== 0) return '\0__NONZERO__';
  return result.stdout ?? '';
}
