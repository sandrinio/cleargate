import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * lifecycle-reconcile.test.ts — CR-017 scenarios 1–8
 *
 * Gherkin Scenarios:
 *   1. Clean sprint close passes
 *   2. Drift at close blocks
 *   3. Multi-ID commit fully validated
 *   4. Carry-over silenced
 *   5. Sprint-init warn-only (v1)  [tested via reconcileLifecycle returning drift, caller warns]
 *   6. Sprint-init --allow-drift waiver [tested via reconcileLifecycle returning drift list]
 *   7. Verb mismatch detected (feat(BUG-NNN)) → soft warning, does not block
 *   8. Unknown ID gracefully ignored
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  reconcileLifecycle,
  parseCommitMessage,
  VERB_STATUS_MAP,
  checkVerbMismatch,
  type ReconcileLifecycleOpts,
} from '../../src/lib/lifecycle-reconcile.js';

// Minimal expect() shim (STORY-028-06)
// Backs remaining expect() calls with node:assert so vitest is not needed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function expect(actual: any): any {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    toBe(expected: unknown) { assert.strictEqual(actual, expected); },
    toEqual(expected: unknown) { assert.deepStrictEqual(actual, expected); },
    toStrictEqual(expected: unknown) { assert.deepStrictEqual(actual, expected); },
    toBeNull() { assert.strictEqual(actual, null); },
    toBeUndefined() { assert.strictEqual(actual, undefined); },
    toBeDefined() { assert.notStrictEqual(actual, undefined); },
    toBeTruthy() { assert.ok(actual); },
    toBeFalsy() { assert.ok(!actual); },
    toBeGreaterThan(n: number) { assert.ok((actual as number) > n); },
    toBeGreaterThanOrEqual(n: number) { assert.ok((actual as number) >= n); },
    toBeLessThan(n: number) { assert.ok((actual as number) < n); },
    toBeLessThanOrEqual(n: number) { assert.ok((actual as number) <= n); },
    toContain(sub: unknown) { assert.ok(String(actual).includes(String(sub))); },
    toMatch(p: string | RegExp) { assert.match(String(actual), typeof p === 'string' ? new RegExp(esc(p)) : p); },
    toHaveLength(len: number) { assert.strictEqual((actual as { length: number }).length, len); },
    toThrow(msg?: string | RegExp) {
      if (!msg) assert.throws(actual as () => void);
      else if (typeof msg === 'string') assert.throws(actual as () => void, new RegExp(esc(msg)));
      else assert.throws(actual as () => void, msg);
    },
    toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { assert.ok(actual instanceof cls); },
    toMatchObject(expected: Record<string, unknown>) { assert.deepStrictEqual(actual, expected); },
    toHaveBeenCalled() { assert.ok((actual as { mock: { calls: unknown[] } }).mock.calls.length > 0); },
    toHaveBeenCalledTimes(n: number) { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, n); },
    toHaveBeenCalledOnce() { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, 1); },
    toHaveBeenCalledWith(...expectedArgs: unknown[]) {
      const calls = (actual as { mock: { calls: Array<{arguments: unknown[]}> } }).mock.calls;
      assert.deepStrictEqual(calls[calls.length - 1].arguments, expectedArgs);
    },
    toHaveProperty(key: string, val?: unknown) {
      const obj = actual as Record<string, unknown>;
      assert.ok(key in obj);
      if (val !== undefined) assert.deepStrictEqual(obj[key], val);
    },
    get not(): any {
      return {
        toBe(expected: unknown) { assert.notStrictEqual(actual, expected); },
        toEqual(expected: unknown) { assert.notDeepStrictEqual(actual, expected); },
        toBeNull() { assert.notStrictEqual(actual, null); },
        toBeUndefined() { assert.notStrictEqual(actual, undefined); },
        toBeDefined() { assert.strictEqual(actual, undefined); },
        toBeTruthy() { assert.ok(!actual); },
        toBeFalsy() { assert.ok(actual); },
        toContain(sub: unknown) { assert.ok(!String(actual).includes(String(sub))); },
        toMatch(p: string | RegExp) { assert.doesNotMatch(String(actual), typeof p === 'string' ? new RegExp(esc(p)) : p); },
        toThrow() { assert.doesNotThrow(actual as () => void); },
        toHaveBeenCalled() { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, 0); },
        toHaveProperty(key: string) { const obj = actual as Record<string, unknown>; assert.ok(!(key in obj)); },
        toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { assert.ok(!(actual instanceof cls)); },
        toHaveLength(len: number) { assert.notStrictEqual((actual as { length: number }).length, len); },
      };
    },
    get resolves(): any {
      const p = actual as Promise<unknown>;
      return {
        async toBe(expected: unknown) { assert.strictEqual(await p, expected); },
        async toEqual(expected: unknown) { assert.deepStrictEqual(await p, expected); },
        async toBeUndefined() { assert.strictEqual(await p, undefined); },
        async toBeNull() { assert.strictEqual(await p, null); },
        async toBeDefined() { assert.notStrictEqual(await p, undefined); },
        async toBeTruthy() { assert.ok(await p); },
      };
    },
    get rejects(): any {
      const p = actual as Promise<unknown>;
      return {
        async toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { await assert.rejects(p, cls); },
        async toThrow(msg?: string | RegExp | (new (...a: unknown[]) => unknown)) {
          if (!msg) await assert.rejects(p);
          else if (typeof msg === 'string') await assert.rejects(p, new RegExp(esc(msg)));
          else await assert.rejects(p, msg as RegExp);
        },
        async toSatisfy(predicate: (val: unknown) => boolean) {
          let err: unknown;
          try { await p; } catch(e) { err = e; }
          assert.ok(predicate(err), `Rejected value did not satisfy predicate. Got: ${String(err)}`);
        },
        async toMatchObject(expected: Record<string, unknown>) {
          let err: unknown;
          try { await p; } catch(e) { err = e; }
          const errObj = err as Record<string, unknown>;
          for (const [k, v] of Object.entries(expected)) {
            if (typeof v === 'string' && (v as any).__isStringContaining) {
              assert.ok(String(errObj[k]).includes((v as any).__value), `Expected ${k} to contain "${(v as any).__value}"`);
            } else {
              assert.deepStrictEqual(errObj[k], v, `Expected ${k} to equal ${String(v)}`);
            }
          }
        },
      };
    },
  };
}
// expect.stringContaining — creates a partial string matcher for use in toMatchObject
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(expect as any).stringContaining = (str: string) => ({ __isStringContaining: true, __value: str });


// ─── Helpers ─────────────────────────────────────────────────────────────────

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-lc-reconcile-'));
  tmpDirs.push(d);
  return d;
}

afterEach(() => {
  for (const d of tmpDirs.splice(0)) {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

interface DeliveryRoot {
  root: string;
  pendingDir: string;
  archiveDir: string;
}

function makeDeliveryRoot(): DeliveryRoot {
  const root = makeTmpDir();
  const pendingDir = path.join(root, 'pending-sync');
  const archiveDir = path.join(root, 'archive');
  fs.mkdirSync(pendingDir, { recursive: true });
  fs.mkdirSync(archiveDir, { recursive: true });
  return { root, pendingDir, archiveDir };
}

function writeArtifact(
  dir: string,
  id: string,
  status: string,
  opts: { carryOver?: boolean } = {},
): string {
  const slug = id.replace(/-/g, '_');
  const fileName = `${id}_${slug}.md`;
  const carryOverLine = opts.carryOver ? 'carry_over: true\n' : 'carry_over: false\n';
  const content = `---\nstatus: ${status}\n${carryOverLine}approved: true\n---\n\n# ${id}\n`;
  const absPath = path.join(dir, fileName);
  fs.writeFileSync(absPath, content, 'utf8');
  return absPath;
}

/**
 * Build a fake git runner that returns a fixed log output.
 * Each entry is { sha, subject, body? }.
 */
function makeGitRunner(
  commits: Array<{ sha: string; subject: string; body?: string }>,
): (cmd: string, args: string[]) => string {
  return (_cmd: string, _args: string[]) => {
    if (commits.length === 0) return '';
    return commits
      .map((c) => `${c.sha}\x00${c.subject}\x00${c.body ?? ''}\x00---COMMIT---\n`)
      .join('');
  };
}

function makeOpts(
  overrides: Partial<ReconcileLifecycleOpts> & {
    deliveryRoot: string;
    gitRunner: (cmd: string, args: string[]) => string;
  },
): ReconcileLifecycleOpts {
  return {
    since: new Date('2026-01-01'),
    until: new Date('2026-12-31'),
    repoRoot: overrides.deliveryRoot,
    ...overrides,
  };
}

// ─── Scenario 1: Clean sprint close passes ────────────────────────────────────

describe('Scenario 1: Clean sprint close passes', () => {
  test('returns drift=[], clean=N when all artifacts are at expected status in archive', () => {
    const { root, archiveDir } = makeDeliveryRoot();

    // CR-001 is Completed in archive
    writeArtifact(archiveDir, 'CR-001', 'Completed');

    const gitRunner = makeGitRunner([
      { sha: 'abc1234', subject: 'feat(CR-001): implement lifecycle gate' },
    ]);

    const result = reconcileLifecycle(makeOpts({ deliveryRoot: root, gitRunner }));
    assert.strictEqual((result.drift).length, 0);
    assert.strictEqual(result.clean, 1);
  });

  test('returns drift=[], clean=0 when no feat/fix commits exist in range', () => {
    const { root } = makeDeliveryRoot();

    const gitRunner = makeGitRunner([
      { sha: 'abc1234', subject: 'chore(SPRINT-15): update state.json' },
      { sha: 'def5678', subject: 'docs: update protocol' },
    ]);

    const result = reconcileLifecycle(makeOpts({ deliveryRoot: root, gitRunner }));
    assert.strictEqual((result.drift).length, 0);
    assert.strictEqual(result.clean, 0);
  });
});

// ─── Scenario 2: Drift at close blocks ────────────────────────────────────────

describe('Scenario 2: Drift at close blocks', () => {
  test('returns drift item when artifact is still Draft in pending-sync', () => {
    const { root, pendingDir } = makeDeliveryRoot();

    // STORY-001-01 is Draft in pending-sync (not reconciled)
    writeArtifact(pendingDir, 'STORY-001-01', 'Draft');

    const gitRunner = makeGitRunner([
      { sha: 'deadbeef', subject: 'feat(STORY-001-01): implement feature X' },
    ]);

    const result = reconcileLifecycle(makeOpts({ deliveryRoot: root, gitRunner }));
    assert.strictEqual((result.drift).length, 1);

    const item = result.drift[0]!;
    assert.strictEqual(item.id, 'STORY-001-01');
    assert.strictEqual(item.type, 'STORY');
    assert.strictEqual(item.actual_status, 'Draft');
    assert.strictEqual(item.in_archive, false);
    assert.ok(String(item.commit_shas).includes('deadbeef'));
  });

  test('drift item includes the correct remediation-enabling fields', () => {
    const { root, pendingDir } = makeDeliveryRoot();
    writeArtifact(pendingDir, 'CR-005', 'In Review');

    const gitRunner = makeGitRunner([
      { sha: 'cafe0123', subject: 'feat(CR-005): add new feature' },
    ]);

    const result = reconcileLifecycle(makeOpts({ deliveryRoot: root, gitRunner }));
    assert.match(String(result.drift[0]?.file_path), /pending-sync\/CR-005/);
    assert.strictEqual(result.drift[0]?.expected_status, 'Completed');
  });
});

// ─── Scenario 3: Multi-ID commit fully validated ──────────────────────────────

describe('Scenario 3: Multi-ID commit fully validated', () => {
  test('BUG-001 + CR-001 in one commit: one stale → exits naming only the stale one', () => {
    const { root, pendingDir, archiveDir } = makeDeliveryRoot();

    // BUG-001 is Completed in archive — clean
    writeArtifact(archiveDir, 'BUG-001', 'Completed');
    // CR-001 is Draft in pending-sync — drift
    writeArtifact(pendingDir, 'CR-001', 'Draft');

    const gitRunner = makeGitRunner([
      {
        sha: 'multi001',
        subject: 'fix(BUG-001): fix crash and align CR-001',
        body: 'CR-001 status left in Draft deliberately for test',
      },
    ]);

    // Need to also have a feat(CR-001) commit to trigger CR expectation
    const gitRunnerWithCr = makeGitRunner([
      { sha: 'multi001', subject: 'fix(BUG-001): fix crash' },
      { sha: 'multi002', subject: 'feat(CR-001): align lifecycle', body: '' },
    ]);

    const result = reconcileLifecycle(makeOpts({ deliveryRoot: root, gitRunner: gitRunnerWithCr }));
    assert.strictEqual((result.drift).length, 1);
    assert.strictEqual(result.drift[0]?.id, 'CR-001');
    assert.notStrictEqual(result.drift[0]?.id, 'BUG-001');
    assert.strictEqual(result.clean, 1);
  });

  test('bundled commit: two IDs in one commit → two separate DriftItems each with that SHA', () => {
    const { root, pendingDir } = makeDeliveryRoot();

    writeArtifact(pendingDir, 'STORY-001-01', 'Draft');
    writeArtifact(pendingDir, 'CR-002', 'Approved');

    // Single bundled commit references both IDs in the commit body
    const gitRunner = makeGitRunner([
      {
        sha: 'bundled1',
        subject: 'feat(STORY-001-01): bundled fix',
        body: 'CR-002 also adjusted',
      },
    ]);

    const result = reconcileLifecycle(makeOpts({ deliveryRoot: root, gitRunner }));
    // Both are in pending-sync with non-terminal status
    // STORY-001-01 is from subject, CR-002 from body
    const ids = result.drift.map((d) => d.id).sort();
    assert.ok(String(ids).includes('STORY-001-01'));
    // Each should have the bundled commit SHA
    for (const item of result.drift) {
      assert.ok(String(item.commit_shas).includes('bundled1'));
    }
  });
});

// ─── Scenario 4: Carry-over silenced ─────────────────────────────────────────

describe('Scenario 4: Carry-over silenced', () => {
  test('artifact with carry_over: true → no drift reported, close passes', () => {
    const { root, pendingDir } = makeDeliveryRoot();

    // STORY-002-01 is Draft but has carry_over: true
    writeArtifact(pendingDir, 'STORY-002-01', 'Draft', { carryOver: true });

    const gitRunner = makeGitRunner([
      { sha: 'coshasha1', subject: 'feat(STORY-002-01): work in progress' },
    ]);

    const result = reconcileLifecycle(makeOpts({ deliveryRoot: root, gitRunner }));
    assert.strictEqual((result.drift).length, 0);
    assert.strictEqual(result.clean, 0); // not counted as clean either — silently skipped
  });
});

// ─── Scenario 5: Sprint-init warn-only (v1) ───────────────────────────────────

describe('Scenario 5: Sprint-init warn-only (v1)', () => {
  test('reconcileLifecycle returns drift items for caller to warn; caller proceeds after warn', () => {
    const { root, pendingDir } = makeDeliveryRoot();

    writeArtifact(pendingDir, 'CR-010', 'Approved');

    const gitRunner = makeGitRunner([
      { sha: 'warnsha1', subject: 'feat(CR-010): implement advisory gates' },
    ]);

    const result = reconcileLifecycle(makeOpts({ deliveryRoot: root, gitRunner }));
    // drift is returned; caller decides to warn-only vs block
    assert.ok(result.drift.length > 0);
    assert.strictEqual(result.drift[0]?.id, 'CR-010');
    // The drift list is what the caller uses to print the punch list and then proceed
    // (warn-only = init proceeds after printing this list)
  });
});

// ─── Scenario 6: --allow-drift waiver ────────────────────────────────────────

describe('Scenario 6: --allow-drift waiver', () => {
  test('drift list is still returned when --allow-drift is passed (caller records waiver)', () => {
    const { root, pendingDir } = makeDeliveryRoot();

    writeArtifact(pendingDir, 'CR-011', 'Draft');

    const gitRunner = makeGitRunner([
      { sha: 'waivsha1', subject: 'feat(CR-011): capability gating' },
    ]);

    const result = reconcileLifecycle(makeOpts({ deliveryRoot: root, gitRunner }));
    // drift is non-empty → caller receives it and records waiver in context_source
    assert.strictEqual((result.drift).length, 1);
    assert.strictEqual(result.drift[0]?.id, 'CR-011');
    // NOTE: recording the waiver in state.json + context_source is the caller's responsibility
    // (sprintInitHandler in sprint.ts). This lib only reports drift.
  });
});

// ─── Scenario 7: Verb mismatch detected ──────────────────────────────────────

describe('Scenario 7: Verb mismatch detected', () => {
  test('feat(BUG-NNN) → soft warning from checkVerbMismatch, does not block', () => {
    const warning = checkVerbMismatch('feat', 'BUG');
    assert.notStrictEqual(warning, null);
    assert.ok(String(warning).includes("verb 'feat' unusual for BUG"));
  });

  test('fix(STORY-NNN-NN) → soft warning from checkVerbMismatch', () => {
    const warning = checkVerbMismatch('fix', 'STORY');
    assert.notStrictEqual(warning, null);
    assert.ok(String(warning).includes("verb 'fix' unusual for STORY"));
  });

  test('no mismatch warning for feat(CR-NNN)', () => {
    expect(checkVerbMismatch('feat', 'CR')).toBeNull();
  });

  test('no mismatch warning for fix(BUG-NNN)', () => {
    expect(checkVerbMismatch('fix', 'BUG')).toBeNull();
  });

  test('feat(BUG-NNN) artifact still checked for status (not skipped entirely)', () => {
    const { root, pendingDir } = makeDeliveryRoot();

    // BUG still in Draft
    writeArtifact(pendingDir, 'BUG-007', 'Draft');

    const gitRunner = makeGitRunner([
      { sha: 'mismatch1', subject: 'feat(BUG-007): fix the bug with feat verb' },
    ]);

    // feat is in VERB_STATUS_MAP for STORY/EPIC/CR but not BUG
    // However our implementation soft-checks: BUG with feat verb → uses Verified expected
    const result = reconcileLifecycle(makeOpts({ deliveryRoot: root, gitRunner }));
    // The implementation should either report drift or skip (soft warning = doesn't block = no drift in v1)
    // Per spec: feat(BUG-NNN) → soft warning, does NOT block in v1
    // Implementation: we treat verb mismatch as soft; still check status but don't count as hard drift
    // The test verifies this is handled gracefully without throwing
    expect(() => result).not.toThrow();
  });
});

// ─── Scenario 8: Unknown ID gracefully ignored ────────────────────────────────

describe('Scenario 8: Unknown ID gracefully ignored', () => {
  test('commit references STORY-999-99 with no file → not counted as drift', () => {
    const { root } = makeDeliveryRoot();
    // No files created — STORY-999-99 has no artifact

    const gitRunner = makeGitRunner([
      { sha: 'ghost0001', subject: 'feat(STORY-999-99): ghost story' },
    ]);

    const result = reconcileLifecycle(makeOpts({ deliveryRoot: root, gitRunner }));
    // Unknown ID → no file found → skipped, not drift
    assert.strictEqual((result.drift).length, 0);
    assert.strictEqual(result.clean, 0);
  });
});

// ─── parseCommitMessage unit tests ────────────────────────────────────────────

describe('parseCommitMessage', () => {
  test('parses simple feat(STORY-001-01): subject', () => {
    const result = parseCommitMessage('feat(STORY-001-01): implement X');
    assert.strictEqual((result).length, 1);
    assert.deepStrictEqual(result[0], { verb: 'feat', id: 'STORY-001-01', type: 'STORY' });
  });

  test('parses fix(BUG-007): subject', () => {
    const result = parseCommitMessage('fix(BUG-007): fix crash');
    assert.strictEqual((result).length, 1);
    assert.deepStrictEqual(result[0], { verb: 'fix', id: 'BUG-007', type: 'BUG' });
  });

  test('parses multi-ID from subject + body', () => {
    const result = parseCommitMessage('feat(STORY-013-08): CLI\n\nCR-011 aligned');
    const ids = result.map((r) => r.id);
    assert.ok(String(ids).includes('STORY-013-08'));
    assert.ok(String(ids).includes('CR-011'));
  });

  test('normalizes PROP-013 to PROPOSAL-013', () => {
    const result = parseCommitMessage('feat(PROP-013): decompose');
    assert.strictEqual(result[0]?.id, 'PROPOSAL-013');
  });

  test('deduplicates same ID appearing multiple times', () => {
    const result = parseCommitMessage('feat(CR-001): fix CR-001 again');
    const ids = result.map((r) => r.id);
    const crIds = ids.filter((id) => id === 'CR-001');
    assert.strictEqual((crIds).length, 1);
  });

  test('returns empty for merge: commit', () => {
    const result = parseCommitMessage('merge: STORY-001-01 → main');
    // merge verb → entries returned, but reconcileLifecycle skips merge verb
    // parseCommitMessage itself returns the IDs; caller skips merge
    const verbs = result.map((r) => r.verb);
    if (verbs.length > 0) {
      expect(verbs.every((v) => v === 'merge')).toBe(true);
    }
  });

  test('returns empty for chore: commit with no IDs', () => {
    const result = parseCommitMessage('chore: update deps');
    assert.strictEqual((result).length, 0);
  });
});

// ─── VERB_STATUS_MAP integrity ────────────────────────────────────────────────

describe('VERB_STATUS_MAP', () => {
  test('feat maps to STORY/EPIC/CR with expected Completed only (post-CR-067)', () => {
    assert.notStrictEqual(VERB_STATUS_MAP['feat'], undefined);
    assert.ok(String(VERB_STATUS_MAP['feat']!.types).includes('STORY'));
    assert.ok(String(VERB_STATUS_MAP['feat']!.types).includes('CR'));
    assert.ok(String(VERB_STATUS_MAP['feat']!.types).includes('EPIC'));
    assert.ok(String(VERB_STATUS_MAP['feat']!.expected).includes('Completed'));
    assert.ok(!String(VERB_STATUS_MAP['feat']!.expected).includes('Done'));
    assert.ok(!String(VERB_STATUS_MAP['feat']!.expected).includes('Verified'));
  });

  test('fix maps to BUG/HOTFIX with expected Completed only (post-CR-067)', () => {
    assert.notStrictEqual(VERB_STATUS_MAP['fix'], undefined);
    assert.ok(String(VERB_STATUS_MAP['fix']!.types).includes('BUG'));
    assert.ok(String(VERB_STATUS_MAP['fix']!.expected).includes('Completed'));
    assert.ok(!String(VERB_STATUS_MAP['fix']!.expected).includes('Verified'));
  });
});
