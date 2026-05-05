/**
 * merge-ui.red.node.test.ts — BUG-028 QA-RED
 *
 * Failing tests (RED phase) for BUG-028: diff render fallback for empty-body patches.
 *
 * Per M1 blueprint §5 scenarios 3 + 4 + 5:
 * - When `createPatch(ours, theirs)` returns a header-only patch (no hunk lines),
 *   `renderInlineDiff` must detect this and emit a fallback annotation like
 *   "(whitespace/EOL-only differences — N bytes changed)" so the user has a signal
 *   before choosing [k]eep / [t]ake / [e]dit.
 *
 * Empty-body case: `createPatch` returns only the Index/=== header lines with no
 * hunks when `ours` and `theirs` are semantically identical to `diff`'s line-based
 * algorithm. This can happen when, for example, ours and theirs are identical strings
 * that somehow triggered `state=upstream-changed` via hash mismatch (e.g. different
 * normalization path was used for hashing vs. reading).
 *
 * The production scenario (bug §3): interactive merge prompt renders a blank diff
 * body between `--- installed` and `+++ upstream` — the user sees the prompt but
 * has no indication of what actually differs.
 *
 * POST-FIX contract: when `createPatch` returns an empty body (no hunk lines),
 * `renderInlineDiff` must append a fallback annotation.
 *
 * Tests MUST FAIL against the clean baseline (no implementation yet).
 * File naming: *.red.node.test.ts (immutable post-Red).
 *
 * Runner: tsx --test (node:test)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderInlineDiff } from '../../src/lib/merge-ui.js';

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Returns true if the patch contains at least one hunk line (+ or - that is
 * not the +++ / --- header).
 *
 * Mirrors the detection logic from M1.md blueprint for the fix implementation:
 *   patch.split('\n').filter(l => l.startsWith('+') || l.startsWith('-'))
 *     .filter(l => !l.startsWith('+++') && !l.startsWith('---')).length === 0
 */
function hasHunkLines(patch: string): boolean {
  return patch
    .split('\n')
    .filter((l) => l.startsWith('+') || l.startsWith('-'))
    .filter((l) => !l.startsWith('+++') && !l.startsWith('---'))
    .length > 0;
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('BUG-028 — RED: renderInlineDiff fallback for empty-body patches', () => {

  // ─── Scenario 3 (§5): Empty body when ours === theirs ─────────────────────
  //
  // createPatch returns header-only (no hunks) when ours and theirs are identical.
  // This represents the production case where state=upstream-changed was triggered
  // by a normalized-sha difference but the raw strings passed to renderInlineDiff
  // are identical (e.g. both were read after normalization by the runtime).
  //
  // PRE-FIX: renderInlineDiff returns the header-only patch with no fallback —
  //   "Index: test.sh\n===\n--- test.sh\tinstalled\n+++ test.sh\tupstream\n"
  // POST-FIX: renderInlineDiff must append a fallback annotation, e.g.:
  //   "(whitespace/EOL-only differences — N bytes changed)" or similar.
  //
  // This test FAILS pre-fix.
  it('appends a fallback annotation when createPatch returns an empty-body patch (ours === theirs)', () => {
    // Identical strings → createPatch produces no hunk lines
    const ours = '#!/usr/bin/env bash\necho "hook"\n';
    const theirs = '#!/usr/bin/env bash\necho "hook"\n';
    const filePath = '.claude/hooks/session-start.sh';

    const result = renderInlineDiff(ours, theirs, filePath);

    // Verify our assumption: createPatch produces no hunks for identical input
    assert.equal(
      hasHunkLines(result),
      false,
      `Test precondition failed: expected no hunk lines for identical ours/theirs, but got:\n${result}`
    );

    // BUG-028 assertion: the fallback annotation must be present.
    // Post-fix the output must contain one of:
    //   (a) whitespace/EOL-only annotation
    //   (b) a byte-diff count
    //   (c) any explicit signal that the diff body is empty but bytes differ
    const hasFallbackAnnotation =
      result.includes('whitespace') ||
      result.includes('EOL') ||
      result.includes('bytes changed') ||
      result.includes('bytes differ') ||
      result.includes('eol') ||
      result.includes('identical') ||
      result.includes('(no visible') ||
      result.includes('(empty diff');

    // PRE-FIX: this assertion FAILS because current renderInlineDiff returns
    // the raw createPatch output with no fallback:
    //   "Index: .claude/hooks/session-start.sh\n===...\n--- ...\n+++ ...\n"
    // POST-FIX: hasFallbackAnnotation is true.
    assert.ok(
      hasFallbackAnnotation,
      `BUG-028: renderInlineDiff must emit a fallback annotation when createPatch body is empty.\n` +
      `Current output (no fallback):\n${result}\n` +
      `Expected: output contains 'whitespace', 'EOL', 'bytes changed', or similar annotation.`
    );
  });

  // ─── Scenario 4 (§5): Empty body via identical multiline content ──────────
  //
  // Same failure mode but with multi-line identical content.
  it('appends a fallback annotation for multi-line identical content (empty patch body)', () => {
    const content = [
      '#!/usr/bin/env bash',
      'set -euo pipefail',
      '# Session start hook',
      'echo "ClearGate session started"',
      '',
    ].join('\n');

    const result = renderInlineDiff(content, content, '.claude/hooks/session-start.sh');

    assert.equal(
      hasHunkLines(result),
      false,
      `Test precondition: expected no hunks for identical multi-line content`
    );

    const hasFallbackAnnotation =
      result.includes('whitespace') ||
      result.includes('EOL') ||
      result.includes('bytes changed') ||
      result.includes('bytes differ') ||
      result.includes('eol') ||
      result.includes('identical') ||
      result.includes('(no visible') ||
      result.includes('(empty diff');

    assert.ok(
      hasFallbackAnnotation,
      `BUG-028: renderInlineDiff must emit a fallback for empty-body multi-line identical patch.\n` +
      `Current output:\n${result}`
    );
  });

  // ─── Scenario 5 (§5): Semantic change renders normal hunks (regression guard)
  //
  // When ours and theirs genuinely differ, normal hunk lines must appear.
  // No fallback annotation should be needed (the diff is self-explanatory).
  // This test PASSES pre-fix (current code already handles this correctly).
  // It is included as a regression guard: post-fix must not break normal diffs.
  it('renders normal hunk lines for a real semantic change (no fallback needed)', () => {
    const ours = 'old content\n';
    const theirs = 'new content\n';
    const result = renderInlineDiff(ours, theirs, '.claude/hooks/session-start.sh');

    const lines = result.split('\n');
    const removedLine = lines.find(
      (l) => l.startsWith('-') && !l.startsWith('---') && l.includes('old')
    );
    const addedLine = lines.find(
      (l) => l.startsWith('+') && !l.startsWith('+++') && l.includes('new')
    );

    assert.ok(removedLine, `Expected a '-old content' hunk line. Got:\n${result}`);
    assert.ok(addedLine, `Expected a '+new content' hunk line. Got:\n${result}`);
  });
});
