/**
 * STORY-002-08: cleargate wiki lint
 *
 * Scans .cleargate/wiki/ pages against their raw source files.
 * Enforcement mode (default): exits non-zero on any drift finding.
 * Suggest mode (--suggest): exits 0, prefixes flags with [advisory].
 *
 * Output format matches cleargate-wiki-lint subagent def lines 220-227:
 *   <category>: <primary-path> -> <secondary-path-or-detail> (<optional context>)
 * Summary line always last:
 *   lint: <OK|FAIL> (N pages checked, M findings)
 */

import * as path from 'node:path';
import { loadWikiPages } from '../wiki/load-wiki.js';
import type { GitRunner } from '../wiki/git-sha.js';
import {
  checkOrphan,
  checkRepoMismatch,
  checkStaleCommit,
  checkMissingIngest,
  checkBrokenBacklinks,
  checkInvalidatedCitations,
  checkExcludedPathIngested,
  checkPaginationNeeded,
  checkGateFailure,
  checkGateStaleness,
  discoverPlainTextMentions,
  type LintFinding,
} from '../wiki/lint-checks.js';

export interface WikiLintOptions {
  /** Test seam: working directory (defaults to process.cwd()) */
  cwd?: string;
  /** Test seam: replaces process.stdout.write */
  stdout?: (s: string) => void;
  /** Test seam: replaces process.stderr.write */
  stderr?: (s: string) => void;
  /** Test seam: replaces process.exit */
  exit?: (code: number) => never;
  /** Test seam: forwarded to git-sha calls */
  gitRunner?: GitRunner;
  /** Lint mode: 'enforce' (default, exits 1 on findings) or 'suggest' (always exits 0) */
  mode?: 'enforce' | 'suggest';
}

export async function wikiLintHandler(opts: WikiLintOptions = {}): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const stdout = opts.stdout ?? ((s: string) => process.stdout.write(s));
  // stderr seam is wired but lint outputs everything to stdout per subagent def
  opts.stderr;
  const exit = opts.exit ?? ((c: number): never => process.exit(c));
  const gitRunner = opts.gitRunner;
  const mode = opts.mode ?? 'enforce';

  const wikiRoot = path.join(cwd, '.cleargate', 'wiki');
  const repoRoot = cwd;

  // Step 1: load all wiki pages (single discovery pass)
  let pages = loadWikiPages(wikiRoot);

  const findings: LintFinding[] = [];

  // Meta-check: pagination-needed (fires on bucket > 50 entries)
  const paginationFindings = checkPaginationNeeded(pages);
  findings.push(...paginationFindings);

  // Step 2: per-page checks (O(n))
  for (const page of pages) {
    // (a) orphan
    const orphan = checkOrphan(page, repoRoot);
    if (orphan) findings.push(orphan);

    // (b) repo-mismatch
    const repoMismatch = checkRepoMismatch(page, repoRoot);
    if (repoMismatch) findings.push(repoMismatch);

    // (c) stale-commit
    const staleCommit = checkStaleCommit(page, repoRoot, gitRunner);
    if (staleCommit) findings.push(staleCommit);

    // (d) missing-ingest
    const missingIngest = checkMissingIngest(page, repoRoot);
    if (missingIngest) findings.push(missingIngest);

    // (e) excluded-path-ingested
    const excludedPath = checkExcludedPathIngested(page, repoRoot);
    if (excludedPath) findings.push(excludedPath);

    // (f) gate-failure — enforcing for Epic/Story/CR/Bug
    const gateFail = checkGateFailure(page, repoRoot);
    if (gateFail) findings.push(gateFail);

    // (g) gate-stale — applies to ALL types
    const gateStale = checkGateStaleness(page, repoRoot);
    if (gateStale) findings.push(gateStale);
  }

  // Step 3: single index cross-check pass — broken backlinks
  const backlinkFindings = checkBrokenBacklinks(pages, repoRoot);
  findings.push(...backlinkFindings);

  // Step 4: topic-page invalidated-citation check
  const citationFindings = checkInvalidatedCitations(pages, repoRoot);
  findings.push(...citationFindings);

  const pageCount = pages.length;
  const findingCount = findings.length;

  // Step 5: emit results
  if (mode === 'suggest') {
    // Advisory mode: prefix flags with [advisory] + do Karpathy discovery pass
    for (const finding of findings) {
      stdout(`[advisory] ${finding.line}\n`);
    }

    // Karpathy discovery pass
    const suggestions = discoverPlainTextMentions(pages, repoRoot);
    for (const suggestion of suggestions) {
      stdout(`${suggestion}\n`);
    }

    stdout(`lint: OK (${pageCount} pages checked, ${findingCount} findings)\n`);
    exit(0);
    return;
  }

  // Enforce mode
  for (const finding of findings) {
    stdout(`${finding.line}\n`);
  }

  if (findingCount > 0) {
    stdout(`lint: FAIL (${pageCount} pages checked, ${findingCount} findings)\n`);
    exit(1);
  } else {
    stdout(`lint: OK (${pageCount} pages checked, 0 findings)\n`);
    exit(0);
  }
}
