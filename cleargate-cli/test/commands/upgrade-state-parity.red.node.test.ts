/**
 * upgrade-state-parity.red.node.test.ts — BUG-028 QA-RED
 *
 * Failing tests (RED phase) for BUG-028: dry-run vs live state parity.
 *
 * Per M1 blueprint Direction Y (recommended fix):
 * - The dry-run path must emit a two-state projected line:
 *   `state=<pre-state> → <projected-post-state>` so the user can see which
 *   files will actually change (vs just which files have drift).
 * - Currently (pre-fix) the dry-run only emits `state=<pre-state>` with NO
 *   projected post-state, so a user sees `state=clean` and has no indication
 *   that the live run will mutate the file.
 *
 * The bug in §3 evidence:
 *   [dry-run] ... state=clean
 *   [merge]   ... state=upstream-changed   ← live run shows a different state
 * The root cause: dry-run classifies using pre-mutation currentSha, but the
 * [merge] header in applyMerge3Way re-classifies with the same currentSha.
 * However the *drift map* (written post-mutation) uses postSha — so users
 * correlating the dry-run plan to the post-run drift file see a mismatch.
 *
 * Post-fix contract (Direction Y): dry-run must emit the projected post-state
 * alongside the pre-state, e.g.: `state=upstream-changed → clean` for the
 * case where taking-theirs would make the file clean.
 *
 * Tests MUST FAIL against the clean baseline (no implementation yet).
 * File naming: *.red.node.test.ts (immutable post-Red).
 *
 * Runner: tsx --test (node:test)
 */

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { upgradeHandler, type UpgradeCliOptions } from '../../src/commands/upgrade.js';
import { hashNormalized } from '../../src/lib/sha256.js';
import type { ManifestFile, ManifestEntry } from '../../src/lib/manifest.js';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-bug028-red-'));
  tmpDirs.push(dir);
  return dir;
}

after(async () => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeEntry(overrides: Partial<ManifestEntry> = {}): ManifestEntry {
  return {
    path: '.claude/hooks/session-start.sh',
    sha256: 'aabbccdd',
    tier: 'hook',
    overwrite_policy: 'merge-3way',
    preserve_on_uninstall: false,
    ...overrides,
  };
}

function makeManifest(entries: ManifestEntry[]): ManifestFile {
  return {
    cleargate_version: '0.11.3',
    generated_at: '2026-05-05T00:00:00Z',
    files: entries,
  };
}

function writePackageManifest(pkgRoot: string, manifest: ManifestFile): void {
  fs.mkdirSync(pkgRoot, { recursive: true });
  fs.writeFileSync(path.join(pkgRoot, 'MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
}

function writeTrackedFile(root: string, relPath: string, content: string): void {
  const abs = path.join(root, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf-8');
}

function writeInstallSnapshot(projectRoot: string, manifest: ManifestFile): void {
  const dir = path.join(projectRoot, '.cleargate');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, '.install-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}

function makeCliOpts(
  overrides: Partial<UpgradeCliOptions> = {}
): UpgradeCliOptions & { out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  return {
    stdout: (s: string) => out.push(s),
    stderr: (s: string) => err.push(s),
    now: () => new Date('2026-05-05T12:00:00.000Z'),
    promptMergeChoice: async () => 't' as const,
    ...overrides,
    out,
    err,
  } as UpgradeCliOptions & { out: string[]; err: string[] };
}

// ─── Test 1: Dry-run emits projected post-state (Direction Y) ─────────────────
//
// Fixture: upstream has a new content; disk has the old installed content (no
// user modifications → classify gives `upstream-changed`). After taking-theirs,
// the file would be clean (postSha == upstreamSha).
//
// PRE-FIX: dry-run emits `state=upstream-changed` with NO projected post-state.
// POST-FIX: dry-run must emit the projected post-state, e.g.:
//   `state=upstream-changed → clean`
// so the user knows that accepting the upstream change will leave the file clean.
//
// This test FAILS pre-fix because the current dry-run emits only `state=upstream-changed`
// with no arrow/projection.

describe('BUG-028 — RED: dry-run projected post-state (Direction Y)', () => {
  it('dry-run emits a projected post-state annotation (state=X → Y) for upstream-changed files', async () => {
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    // Old installed content
    const installedContent = '#!/usr/bin/env bash\necho "v1"\n';
    const installSha = hashNormalized(installedContent);

    // New upstream content
    const upstreamContent = '#!/usr/bin/env bash\necho "v2"\n';
    const upstreamSha = hashNormalized(upstreamContent);

    // Disk matches install (no user edits → classify: upstream-changed)
    const diskContent = installedContent;

    const entry = makeEntry({
      path: '.claude/hooks/session-start.sh',
      sha256: upstreamSha,
    });

    const pkgManifest = makeManifest([entry]);
    writePackageManifest(pkgRoot, pkgManifest);
    writeTrackedFile(pkgRoot, entry.path, upstreamContent);
    writeTrackedFile(projectRoot, entry.path, diskContent);

    const snapshotEntry = { ...entry, sha256: installSha };
    writeInstallSnapshot(projectRoot, makeManifest([snapshotEntry]));

    const opts = makeCliOpts({ cwd: projectRoot, packageRoot: pkgRoot });
    await upgradeHandler({ dryRun: true }, opts);

    const dryOutput = opts.out.join('\n');

    // BUG-028 Direction Y assertion: the dry-run line for this file must contain
    // a projected post-state notation. Pattern: `state=<pre> → <post>` or
    // `postState=<post>` or equivalent two-state signal.
    //
    // PRE-FIX: this assertion FAILS because current code only emits:
    //   "[dry-run] .claude/hooks/session-start.sh  action=merge-3way  state=upstream-changed"
    // with no projected post-state.
    const dryRunFileLine = opts.out.find(
      (l) => l.includes(entry.path) && l.includes('[dry-run]') && l.includes('state=')
    );
    assert.ok(dryRunFileLine, `dry-run must emit a state= line for ${entry.path}`);

    // The projected post-state must appear in the line — as an arrow or postState field.
    const hasProjectedPostState =
      dryRunFileLine.includes(' → ') ||
      dryRunFileLine.includes('postState=') ||
      dryRunFileLine.includes('->');

    assert.ok(
      hasProjectedPostState,
      `BUG-028: dry-run line must include a projected post-state (e.g. 'state=upstream-changed → clean').\n` +
      `Actual line: ${dryRunFileLine}\n` +
      `Full output:\n${dryOutput}`
    );
  });

  // ─── Test 1b: Parity for whitespace-only fixture (CRLF on disk, LF upstream)
  //
  // hashNormalized strips CRLF→LF, so currentSha == upstreamSha == installSha.
  // classify: clean (no drift). Dry-run and live both say clean.
  //
  // Post-fix: dry-run must still emit a projected post-state even for clean files
  // (projected post = clean too), so the output format is consistent.
  // Alternatively: dry-run may skip the projection for clean files (since no
  // change is expected). Either way: the two-state format test below captures
  // that the dry-run communicates the SAME state as the live run would show.
  //
  // This test verifies parity by running both and comparing the state= values.
  // For whitespace-only (CRLF vs LF where hash equals), both should say clean.
  it('dry-run and live report the same state for a CRLF-on-disk / LF-upstream file (parity test)', async () => {
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    // Upstream: LF content
    const upstreamContent = '#!/usr/bin/env bash\necho "hook"\n';
    const upstreamSha = hashNormalized(upstreamContent);

    // Disk: CRLF version of the same content
    // hashNormalized(CRLF) == hashNormalized(LF) → classify: clean
    const diskContent = '#!/usr/bin/env bash\r\necho "hook"\r\n';

    // Install sha matches upstream (no version drift)
    const installSha = upstreamSha;

    const entry = makeEntry({
      path: '.claude/hooks/session-start.sh',
      sha256: upstreamSha,
    });

    const pkgManifest = makeManifest([entry]);
    writePackageManifest(pkgRoot, pkgManifest);
    writeTrackedFile(pkgRoot, entry.path, upstreamContent);
    writeTrackedFile(projectRoot, entry.path, diskContent);

    const snapshotEntry = { ...entry, sha256: installSha };
    writeInstallSnapshot(projectRoot, makeManifest([snapshotEntry]));

    // ── Dry run ──
    const dryOpts = makeCliOpts({ cwd: projectRoot, packageRoot: pkgRoot });
    await upgradeHandler({ dryRun: true }, dryOpts);

    const dryStateLine = dryOpts.out.find(
      (l) => l.includes(entry.path) && l.includes('state=')
    );
    assert.ok(dryStateLine, 'dry-run must emit a state= line');
    const dryStateMatch = dryStateLine.match(/state=(\S+)/);
    assert.ok(dryStateMatch);
    const dryPreState = dryStateMatch[1].split(/\s*→\s*/)[0]; // take pre-state part

    // ── Live run (auto-take-theirs) ──
    // Restore disk to CRLF before live run
    writeTrackedFile(projectRoot, entry.path, diskContent);
    writeInstallSnapshot(projectRoot, makeManifest([snapshotEntry]));

    const liveOpts = makeCliOpts({ cwd: projectRoot, packageRoot: pkgRoot });
    await upgradeHandler({ yes: true }, liveOpts);

    // Live run emits "[yes] taking theirs: <path>  state=<S>" or "[skip]" etc.
    const liveStateLine = liveOpts.out.find(
      (l) => l.includes(entry.path) && l.includes('state=')
    );

    // If file is clean, live run may emit a skip or a take-theirs-clean.
    // Either way: the pre-state in the dry-run must match the state in the live run.
    if (liveStateLine) {
      const liveStateMatch = liveStateLine.match(/state=(\S+)/);
      assert.ok(liveStateMatch);
      const liveState = liveStateMatch[1];

      // BUG-028 core assertion: pre-states must match
      assert.equal(
        dryPreState,
        liveState,
        `BUG-028: dry-run pre-state (${dryPreState}) must match live state (${liveState})`
      );
    }
    // If live emits no state= line for a clean file, dry-run pre-state must be 'clean'
    else {
      assert.equal(
        dryPreState,
        'clean',
        `BUG-028: If live emits no state= for a clean file, dry-run must also show state=clean, got ${dryPreState}`
      );
    }
  });
});
