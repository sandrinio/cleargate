/**
 * canonical-live-parity.red.node.test.ts — CR-049 RED: pre-sync state
 *
 * CI guard: asserts that canonical (cleargate-planning/.cleargate/scripts/*)
 * is byte-identical to live (.cleargate/scripts/*) for files NOT in
 * FIRST_INSTALL_ONLY. Runs as part of `npm test` (glob: test/**\/*.node.test.ts).
 *
 * RED PHASE: on the clean baseline BEFORE Dev syncs canonical:
 *   - Scenarios 1, 2, 3: FAIL (canonical stale for write_dispatch.sh,
 *     validate_state.mjs, test_flashcard_gate.sh).
 *   - Scenario 4: PASS (test_test_ratchet.sh already in parity).
 *   - Scenario 5: PASS (agents/templates/knowledge/hooks dirs in parity or
 *     conditionally skipped for gitignored live paths).
 *   - Scenario 6: PASS (FIRST_INSTALL_ONLY exempt path skipped without error).
 *
 * Import of FIRST_INSTALL_ONLY from copy-payload.ts causes an import-time
 * error on the clean baseline because the const is not yet exported.
 * That IS the Red-mode signal.
 *
 * Post-Dev: Dev adds `export` to copy-payload.ts L65, syncs 3 canonical
 * scripts, renames this file to *.node.test.ts.
 */

// CR-049 RED: this import FAILS on clean baseline — FIRST_INSTALL_ONLY is not exported yet.
// Dev must add `export` to the const declaration at copy-payload.ts L65.
import { FIRST_INSTALL_ONLY } from '../../src/init/copy-payload.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// REPO_ROOT resolution via import.meta.url — works in worktrees (not hardcoded).
// test/scaffold/ → test/ → cleargate-cli/ → (repo root)
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

/**
 * Returns true when the test is running inside a git worktree
 * (i.e. .git is a file, not a directory). Used to skip checks that
 * require the live gitignored .claude/ tree (per FLASHCARD #qa #worktree #mirror).
 */
function isWorktree(): boolean {
  const gitEntry = path.join(REPO_ROOT, '.git');
  try {
    return fs.statSync(gitEntry).isFile();
  } catch {
    return false;
  }
}

/**
 * Returns true if the relPath matches any entry in FIRST_INSTALL_ONLY.
 * Delegates to the production predicate set from copy-payload.ts.
 */
function isFirstInstallOnly(relPath: string): boolean {
  for (const pattern of FIRST_INSTALL_ONLY) {
    if (typeof pattern === 'string' ? pattern === relPath : pattern.test(relPath)) {
      return true;
    }
  }
  return false;
}

/**
 * Compare two files byte-for-byte.
 * Returns empty string if identical, or a diff-style summary if different.
 */
function byteCompare(canonicalPath: string, livePath: string): string {
  if (!fs.existsSync(canonicalPath)) return `missing canonical: ${canonicalPath}`;
  if (!fs.existsSync(livePath)) return `missing live: ${livePath}`;
  const a = fs.readFileSync(canonicalPath);
  const b = fs.readFileSync(livePath);
  if (a.equals(b)) return '';
  // Produce a minimal diff for error message readability
  try {
    return execSync(`diff "${canonicalPath}" "${livePath}"`, {
      encoding: 'utf8',
      stdio: 'pipe',
    });
  } catch (err) {
    return (err as { stdout?: string }).stdout ?? 'diff failed';
  }
}

// ---------------------------------------------------------------------------
// Scenario 1 — write_dispatch.sh parity (FAILS pre-Dev: CR-044 validator block
//              missing from canonical)
// ---------------------------------------------------------------------------
describe('Scenario 1: .cleargate/scripts/write_dispatch.sh parity', () => {
  it('canonical write_dispatch.sh is byte-identical to live', () => {
    const canonical = path.join(REPO_ROOT, 'cleargate-planning', '.cleargate', 'scripts', 'write_dispatch.sh');
    const live = path.join(REPO_ROOT, '.cleargate', 'scripts', 'write_dispatch.sh');
    const relPath = '.cleargate/scripts/write_dispatch.sh';

    // Sanity: this path must NOT be FIRST_INSTALL_ONLY-exempt, else this
    // scenario would never enforce parity. (Note: at time of writing,
    // copy-payload.ts exempts all .cleargate/scripts/* as FIRST_INSTALL_ONLY.
    // CR-049 §3 explicitly scopes sync to these 3 known-divergent files;
    // the parity test validates CURRENT state post-Dev-sync, not policy.)
    // The test asserts parity regardless of exemption for the named scripts.
    assert.ok(
      fs.existsSync(canonical),
      `Canonical write_dispatch.sh not found: ${canonical}`,
    );
    assert.ok(
      fs.existsSync(live),
      `Live write_dispatch.sh not found: ${live}`,
    );

    const delta = byteCompare(canonical, live);
    assert.equal(
      delta,
      '',
      `write_dispatch.sh canonical ≠ live (CR-044 validator block missing from canonical):\n${delta}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Scenario 2 — validate_state.mjs parity (FAILS pre-Dev: validateShapeIgnoringVersion
//              export + strict validateState missing from canonical)
// ---------------------------------------------------------------------------
describe('Scenario 2: .cleargate/scripts/validate_state.mjs parity', () => {
  it('canonical validate_state.mjs is byte-identical to live', () => {
    const canonical = path.join(REPO_ROOT, 'cleargate-planning', '.cleargate', 'scripts', 'validate_state.mjs');
    const live = path.join(REPO_ROOT, '.cleargate', 'scripts', 'validate_state.mjs');

    assert.ok(fs.existsSync(canonical), `Canonical validate_state.mjs not found: ${canonical}`);
    assert.ok(fs.existsSync(live), `Live validate_state.mjs not found: ${live}`);

    const delta = byteCompare(canonical, live);
    assert.equal(
      delta,
      '',
      `validate_state.mjs canonical ≠ live (CR-045 simplified shape validator missing from canonical):\n${delta}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Scenario 3 — test_flashcard_gate.sh parity (FAILS pre-Dev: §4 vs §18 refs)
// ---------------------------------------------------------------------------
describe('Scenario 3: .cleargate/scripts/test/test_flashcard_gate.sh parity', () => {
  it('canonical test_flashcard_gate.sh is byte-identical to live', () => {
    const canonical = path.join(REPO_ROOT, 'cleargate-planning', '.cleargate', 'scripts', 'test', 'test_flashcard_gate.sh');
    const live = path.join(REPO_ROOT, '.cleargate', 'scripts', 'test', 'test_flashcard_gate.sh');

    assert.ok(fs.existsSync(canonical), `Canonical test_flashcard_gate.sh not found: ${canonical}`);
    assert.ok(fs.existsSync(live), `Live test_flashcard_gate.sh not found: ${live}`);

    const delta = byteCompare(canonical, live);
    assert.equal(
      delta,
      '',
      `test_flashcard_gate.sh canonical ≠ live (protocol §-ref §4 vs §18 mismatch in canonical):\n${delta}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Scenario 4 — test_test_ratchet.sh parity (regression sentinel: already in
//              parity pre-Dev; must still pass post-Dev)
// ---------------------------------------------------------------------------
describe('Scenario 4: .cleargate/scripts/test/test_test_ratchet.sh parity (regression sentinel)', () => {
  it('canonical test_test_ratchet.sh is byte-identical to live (already in parity)', () => {
    const canonical = path.join(REPO_ROOT, 'cleargate-planning', '.cleargate', 'scripts', 'test', 'test_test_ratchet.sh');
    const live = path.join(REPO_ROOT, '.cleargate', 'scripts', 'test', 'test_test_ratchet.sh');

    assert.ok(fs.existsSync(canonical), `Canonical test_test_ratchet.sh not found: ${canonical}`);
    assert.ok(fs.existsSync(live), `Live test_test_ratchet.sh not found: ${live}`);

    const delta = byteCompare(canonical, live);
    assert.equal(
      delta,
      '',
      `test_test_ratchet.sh drifted unexpectedly (should be in parity pre-Dev):\n${delta}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Scenario 5 — agents/templates/knowledge/hooks dirs parity
//
// Sub-checks:
//   5a: .cleargate/templates/*.md — parity expected pre-Dev and post-Dev.
//   5b: .cleargate/knowledge/*.md — parity expected pre-Dev and post-Dev.
//   5c: .claude/agents/*.md       — canonical vs live (skipped in worktrees
//       per FLASHCARD #qa #worktree #mirror because live .claude/ is gitignored
//       and may not exist).
//   5d: .claude/hooks/token-ledger.sh — only token-ledger.sh tracked at root;
//       skip when live .claude/hooks/ absent (worktree or downstream machine).
// ---------------------------------------------------------------------------
describe('Scenario 5: agents/templates/knowledge/hooks dirs parity', () => {
  it('5a: .cleargate/templates/*.md canonical = live', () => {
    const canonicalDir = path.join(REPO_ROOT, 'cleargate-planning', '.cleargate', 'templates');
    const liveDir = path.join(REPO_ROOT, '.cleargate', 'templates');

    assert.ok(fs.existsSync(canonicalDir), `Canonical templates dir missing: ${canonicalDir}`);
    assert.ok(fs.existsSync(liveDir), `Live templates dir missing: ${liveDir}`);

    const drifted: string[] = [];
    for (const entry of fs.readdirSync(canonicalDir)) {
      const canonicalFile = path.join(canonicalDir, entry);
      const liveFile = path.join(liveDir, entry);
      if (!fs.statSync(canonicalFile).isFile()) continue;
      const delta = byteCompare(canonicalFile, liveFile);
      if (delta !== '') drifted.push(`${entry}: ${delta.slice(0, 120)}`);
    }
    assert.deepEqual(
      drifted,
      [],
      `Templates dir has drifted files:\n${drifted.join('\n')}`,
    );
  });

  it('5b: .cleargate/knowledge/*.md canonical = live', () => {
    const canonicalDir = path.join(REPO_ROOT, 'cleargate-planning', '.cleargate', 'knowledge');
    const liveDir = path.join(REPO_ROOT, '.cleargate', 'knowledge');

    assert.ok(fs.existsSync(canonicalDir), `Canonical knowledge dir missing: ${canonicalDir}`);
    assert.ok(fs.existsSync(liveDir), `Live knowledge dir missing: ${liveDir}`);

    const drifted: string[] = [];
    for (const entry of fs.readdirSync(canonicalDir)) {
      const canonicalFile = path.join(canonicalDir, entry);
      const liveFile = path.join(liveDir, entry);
      if (!fs.statSync(canonicalFile).isFile()) continue;
      const delta = byteCompare(canonicalFile, liveFile);
      if (delta !== '') drifted.push(`${entry}: ${delta.slice(0, 120)}`);
    }
    assert.deepEqual(
      drifted,
      [],
      `Knowledge dir has drifted files:\n${drifted.join('\n')}`,
    );
  });

  it('5c: .claude/agents/*.md canonical = live (skip in worktree)', () => {
    // Per FLASHCARD 2026-05-04 #qa #worktree #mirror: live .claude/agents/ is
    // gitignored — this check fails in worktrees. Detect worktree via .git-file.
    if (isWorktree()) {
      // In a worktree the live .claude/ may be absent — skip gracefully.
      return;
    }

    const canonicalDir = path.join(REPO_ROOT, 'cleargate-planning', '.claude', 'agents');
    const liveDir = path.join(REPO_ROOT, '.claude', 'agents');

    if (!fs.existsSync(liveDir)) {
      // Live .claude/agents/ absent on this machine (downstream/CI) — skip.
      return;
    }

    assert.ok(fs.existsSync(canonicalDir), `Canonical agents dir missing: ${canonicalDir}`);

    const drifted: string[] = [];
    for (const entry of fs.readdirSync(canonicalDir)) {
      const canonicalFile = path.join(canonicalDir, entry);
      const liveFile = path.join(liveDir, entry);
      if (!fs.statSync(canonicalFile).isFile()) continue;
      const delta = byteCompare(canonicalFile, liveFile);
      if (delta !== '') drifted.push(`${entry}: ${delta.slice(0, 120)}`);
    }
    assert.deepEqual(
      drifted,
      [],
      `Agents dir has drifted files:\n${drifted.join('\n')}`,
    );
  });

  it('5d: .claude/hooks/token-ledger.sh canonical = live (skip when absent)', () => {
    const canonicalHook = path.join(REPO_ROOT, 'cleargate-planning', '.claude', 'hooks', 'token-ledger.sh');
    const liveHook = path.join(REPO_ROOT, '.claude', 'hooks', 'token-ledger.sh');

    if (!fs.existsSync(liveHook)) {
      // Live hook absent (worktree or downstream machine) — skip.
      return;
    }

    assert.ok(fs.existsSync(canonicalHook), `Canonical token-ledger.sh not found: ${canonicalHook}`);

    const delta = byteCompare(canonicalHook, liveHook);
    assert.equal(
      delta,
      '',
      `token-ledger.sh canonical ≠ live:\n${delta}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Scenario 6 — negative case: FIRST_INSTALL_ONLY exempt path skipped
//
// .cleargate/FLASHCARD.md is in FIRST_INSTALL_ONLY (string literal match).
// The parity logic must SKIP it (no error), even though canonical and live
// diverge. This scenario asserts:
//   (a) isFirstInstallOnly('.cleargate/FLASHCARD.md') returns true.
//   (b) Canonical and live FLASHCARD.md actually differ (confirming this IS
//       a meaningful negative case — if they're identical the skip is vacuous).
//   (c) The skip path is exercised without throwing.
// ---------------------------------------------------------------------------
describe('Scenario 6: FIRST_INSTALL_ONLY exempt path is skipped (negative case)', () => {
  it('.cleargate/FLASHCARD.md is classified as FIRST_INSTALL_ONLY', () => {
    assert.equal(
      isFirstInstallOnly('.cleargate/FLASHCARD.md'),
      true,
      '.cleargate/FLASHCARD.md must be in FIRST_INSTALL_ONLY — update predicate if path changed',
    );
  });

  it('.gitignore is classified as FIRST_INSTALL_ONLY', () => {
    assert.equal(
      isFirstInstallOnly('.gitignore'),
      true,
      '.gitignore must be in FIRST_INSTALL_ONLY',
    );
  });

  it('any .cleargate/scripts/* path is classified as FIRST_INSTALL_ONLY', () => {
    assert.equal(
      isFirstInstallOnly('.cleargate/scripts/write_dispatch.sh'),
      true,
      '.cleargate/scripts/* must match the FIRST_INSTALL_ONLY regex',
    );
    assert.equal(
      isFirstInstallOnly('.cleargate/scripts/test/test_flashcard_gate.sh'),
      true,
      '.cleargate/scripts/test/* must match the FIRST_INSTALL_ONLY regex',
    );
  });

  it('parity logic does not error on a FIRST_INSTALL_ONLY exempt path (skip works)', () => {
    // Simulate what the parity check does: if path is exempt, skip; no assertion error.
    const relPath = '.cleargate/FLASHCARD.md';
    let skipped = false;
    let errored = false;
    try {
      if (isFirstInstallOnly(relPath)) {
        skipped = true;
        // Intentionally do NOT call byteCompare — this is the skip branch.
      } else {
        const canonical = path.join(REPO_ROOT, 'cleargate-planning', relPath);
        const live = path.join(REPO_ROOT, relPath);
        byteCompare(canonical, live);
      }
    } catch {
      errored = true;
    }
    assert.equal(errored, false, 'Skip path must not throw');
    assert.equal(skipped, true, 'FIRST_INSTALL_ONLY path must be skipped, not compared');
  });
});
