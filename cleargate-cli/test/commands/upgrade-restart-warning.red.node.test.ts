/**
 * upgrade-restart-warning.red.node.test.ts — CR-059 QA-RED
 *
 * Failing tests (RED phase) for CR-059: smarter session-load restart warning.
 *
 * Four test scenarios covering CR-059 §4 Verification Protocol:
 *
 *   Test 1 — suppression on cosmetic settings.json rewrite
 *     Fixture: .claude/settings.json written with `always` overwrite_policy.
 *     Target has hooks block serialized as {"hooks":{...},"foo":1}.
 *     Upstream has same hooks but {"foo":1,"hooks":{...}} (key order only).
 *     Run upgrade. postSha != currentSha (byte-level) → warning fires pre-fix.
 *     Assert: "[upgrade] complete." present, "Restart Claude Code" absent.
 *
 *   Test 2 — warning on real hooks change
 *     Same always-overwrite path. Upstream changes the hook command string.
 *     Assert: "Restart Claude Code" present AND ".claude/settings.json" listed.
 *
 *   Test 3a — .mcp.json cosmetic re-key suppression
 *     Fixture: other servers reordered but cleargate entry identical.
 *     Assert: "Restart Claude Code" absent.
 *
 *   Test 3b — .mcp.json cleargate args change
 *     Fixture: mcpServers.cleargate.args changed upstream.
 *     Assert: "Restart Claude Code" present AND ".mcp.json" listed.
 *
 * PRE-FIX: Tests 1 and 3a FAIL because upgrade.ts uses byte-level sha
 *   comparison (`postSha !== currentSha`) with no schema-aware suppression.
 *   extractSessionLoadDelta does not yet exist.
 * Tests 2 and 3b should PASS even pre-fix (real changes trigger real warnings).
 *
 * Runner: tsx --test (node:test)
 * Naming: *.red.node.test.ts (immutable post-Red per flashcard 2026-05-04 #naming #red-green)
 * Forbidden: DO NOT edit implementation files.
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-cr059-red-'));
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
    path: '.cleargate/knowledge/cleargate-protocol.md',
    sha256: 'aaaa1111',
    tier: 'protocol',
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

// ─── Test 1: Suppression on cosmetic settings.json rewrite ───────────────────
//
// SDR-locked scope: `.claude/settings.json` — only hooks block matters.
//
// To bypass the merge-3way surgery path (which normalizes content as a side
// effect), we use overwrite_policy:'always'. This means applyAlwaysOverwrite
// fires: raw overwrite with upstream content. The `postSha` = hash(upstream),
// `currentSha` = hash(target). Both differ at byte level (key order) but the
// hooks block is schema-identical.
//
// PRE-FIX (bug): `postSha !== currentSha` → warning fires (false positive).
// POST-FIX: `extractSessionLoadDelta('.claude/settings.json', ours, theirs)`
//   sees hooks-identical → returns false → suppressed.
//
// This test FAILS pre-fix because the byte-level sha comparison triggers the
// warning for a cosmetic-only key-order change.

describe('CR-059 Test 1 — cosmetic settings.json rewrite suppressed', () => {
  it('does NOT emit restart warning when only key order differs in settings.json (always-overwrite path)', async () => {
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    // Canonical hooks block — same content, two different serialisations
    const hooksBlock = {
      PostToolUse: [
        {
          matcher: 'Edit(.*)',
          command: '/path/to/token-ledger.sh',
        },
      ],
      PreToolUse: [
        {
          matcher: 'Task',
          command: '/path/to/dispatch.sh',
        },
      ],
    };

    // Target (on disk): hooks first, then extra_key
    const targetSettingsObj = { hooks: hooksBlock, extra_key: 'value' };
    const targetSettingsContent = JSON.stringify(targetSettingsObj, null, 2) + '\n';

    // Upstream payload: extra_key first, then hooks — byte-different, hooks-identical
    const upstreamSettingsObj = { extra_key: 'value', hooks: hooksBlock };
    const upstreamSettingsContent = JSON.stringify(upstreamSettingsObj, null, 2) + '\n';

    // Confirm byte-level difference (precondition for this test to be meaningful)
    assert.notEqual(targetSettingsContent, upstreamSettingsContent,
      'Fixture precondition: target and upstream must differ at byte level (key order)');

    // hashNormalized must also differ (whitespace-normalisation doesn't fix key order)
    const installSha = hashNormalized(targetSettingsContent);
    const upstreamSha = hashNormalized(upstreamSettingsContent);
    assert.notEqual(installSha, upstreamSha,
      'Fixture precondition: hashNormalized must differ for key-order-swapped inputs');

    // Use overwrite_policy:'always' to force raw overwrite (bypasses surgery).
    // This is the code path where the postSha != currentSha bug bites.
    const entry = makeEntry({
      path: '.claude/settings.json',
      sha256: upstreamSha,
      tier: 'cli-config',
      overwrite_policy: 'always',
    });

    const pkgManifest = makeManifest([entry]);
    writePackageManifest(pkgRoot, pkgManifest);
    writeTrackedFile(pkgRoot, entry.path, upstreamSettingsContent);
    writeTrackedFile(projectRoot, entry.path, targetSettingsContent);

    // Install snapshot records the old sha (upgrade sees upstream as newer)
    const snapshotEntry = { ...entry, sha256: installSha };
    writeInstallSnapshot(projectRoot, makeManifest([snapshotEntry]));

    const opts = makeCliOpts({
      cwd: projectRoot,
      packageRoot: pkgRoot,
    });

    await upgradeHandler({}, opts);

    const fullOutput = opts.out.join('\n');

    // Assert 1a: upgrade completed
    assert.ok(
      opts.out.some((l) => l.includes('[upgrade] complete.')),
      `[upgrade] complete. not found in output:\n${fullOutput}`
    );

    // Assert 1b — the RED assertion that FAILS pre-fix:
    // When hooks block is schema-identical, NO restart warning should fire.
    // Pre-fix: postSha != currentSha (byte-level diff) → warning fires.
    // Post-fix: extractSessionLoadDelta detects hooks-identical → suppressed.
    const hasRestartWarning = opts.out.some((l) => l.includes('Restart Claude Code'));
    assert.equal(
      hasRestartWarning,
      false,
      `CR-059 Test 1 FAIL: "Restart Claude Code" was emitted for a cosmetic-only ` +
      `key-order change in .claude/settings.json (always-overwrite path).\n` +
      `extractSessionLoadDelta must suppress this false positive.\n` +
      `Full output:\n${fullOutput}`
    );
  });
});

// ─── Test 2: Warning on real hooks change ────────────────────────────────────
//
// Same always-overwrite path, but the hook command string changes.
// This is a real schema-meaningful change → warning MUST fire.
//
// PRE-FIX: byte sha differs AND hooks differ → warning fires (correct behaviour).
// POST-FIX: extractSessionLoadDelta sees hooks-different → returns true → warns.
//
// This test verifies that the fix does NOT over-suppress real hook changes.
// It should PASS both pre-fix and post-fix (regression preservation).

describe('CR-059 Test 2 — warning fires on real hooks change in settings.json', () => {
  it('emits restart warning listing .claude/settings.json when hook command changes (always-overwrite path)', async () => {
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    // Target: old hook command
    const targetSettingsObj = {
      hooks: {
        PostToolUse: [{ matcher: 'Edit(.*)', command: '/old/path/token-ledger.sh' }],
      },
    };
    const targetSettingsContent = JSON.stringify(targetSettingsObj, null, 2) + '\n';

    // Upstream: new hook command — real schema-meaningful change
    const upstreamSettingsObj = {
      hooks: {
        PostToolUse: [{ matcher: 'Edit(.*)', command: '/new/path/token-ledger.sh' }],
      },
    };
    const upstreamSettingsContent = JSON.stringify(upstreamSettingsObj, null, 2) + '\n';

    const installSha = hashNormalized(targetSettingsContent);
    const upstreamSha = hashNormalized(upstreamSettingsContent);

    const entry = makeEntry({
      path: '.claude/settings.json',
      sha256: upstreamSha,
      tier: 'cli-config',
      overwrite_policy: 'always',
    });

    const pkgManifest = makeManifest([entry]);
    writePackageManifest(pkgRoot, pkgManifest);
    writeTrackedFile(pkgRoot, entry.path, upstreamSettingsContent);
    writeTrackedFile(projectRoot, entry.path, targetSettingsContent);

    const snapshotEntry = { ...entry, sha256: installSha };
    writeInstallSnapshot(projectRoot, makeManifest([snapshotEntry]));

    const opts = makeCliOpts({
      cwd: projectRoot,
      packageRoot: pkgRoot,
    });

    await upgradeHandler({}, opts);

    const fullOutput = opts.out.join('\n');

    // Assert 2a: restart warning emitted
    const hasRestartWarning = opts.out.some((l) => l.includes('Restart Claude Code'));
    assert.ok(
      hasRestartWarning,
      `CR-059 Test 2 FAIL: "Restart Claude Code" was NOT emitted for a real ` +
      `hook command change in .claude/settings.json.\n` +
      `Full output:\n${fullOutput}`
    );

    // Assert 2b: .claude/settings.json listed in the warning block
    const warningIdx = opts.out.findIndex((l) => l.includes('Restart Claude Code'));
    const warningBlock = warningIdx >= 0 ? opts.out.slice(warningIdx).join('\n') : '';
    assert.ok(
      warningBlock.includes('.claude/settings.json'),
      `CR-059 Test 2 FAIL: ".claude/settings.json" not listed in restart warning block.\n` +
      `Warning block:\n${warningBlock}\nFull output:\n${fullOutput}`
    );
  });
});

// ─── Test 3a: .mcp.json cosmetic re-key suppression ─────────────────────────
//
// SDR-locked scope: only mcpServers.cleargate entry matters.
// Fixture: target .mcp.json has {"mcpServers":{"other":{...},"cleargate":{same}}}.
// Upstream: {"mcpServers":{"cleargate":{same},"other":{...}}} (other reordered).
// cleargate entry is IDENTICAL — no restart needed.
//
// PRE-FIX: byte sha differs → warning fires (BUG — false positive).
// POST-FIX: extractSessionLoadDelta detects cleargate-identical → suppressed.
// This test FAILS pre-fix.

describe('CR-059 Test 3a — .mcp.json cosmetic re-key suppressed', () => {
  it('does NOT emit restart warning when only other servers reordered in .mcp.json', async () => {
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    const cleargateMcpEntry = {
      command: 'npx',
      args: ['cleargate', 'mcp', 'serve'],
    };
    const otherServerEntry = {
      command: 'other-server',
      args: ['--port', '3000'],
    };

    // Target: other server first, then cleargate
    const targetMcpObj = {
      mcpServers: {
        other: otherServerEntry,
        cleargate: cleargateMcpEntry,
      },
    };
    const targetMcpContent = JSON.stringify(targetMcpObj, null, 2) + '\n';

    // Upstream: cleargate first, then other — byte-different, cleargate-identical
    const upstreamMcpObj = {
      mcpServers: {
        cleargate: cleargateMcpEntry,
        other: otherServerEntry,
      },
    };
    const upstreamMcpContent = JSON.stringify(upstreamMcpObj, null, 2) + '\n';

    // Confirm byte-level difference exists
    assert.notEqual(targetMcpContent, upstreamMcpContent,
      'Fixture precondition: target and upstream .mcp.json must differ at byte level');

    const installSha = hashNormalized(targetMcpContent);
    const upstreamSha = hashNormalized(upstreamMcpContent);

    assert.notEqual(installSha, upstreamSha,
      'Fixture precondition: hashNormalized must differ for these byte-different inputs');

    const entry = makeEntry({
      path: '.mcp.json',
      sha256: upstreamSha,
      tier: 'cli-config',
      overwrite_policy: 'always',
    });

    const pkgManifest = makeManifest([entry]);
    writePackageManifest(pkgRoot, pkgManifest);
    writeTrackedFile(pkgRoot, entry.path, upstreamMcpContent);
    writeTrackedFile(projectRoot, entry.path, targetMcpContent);

    const snapshotEntry = { ...entry, sha256: installSha };
    writeInstallSnapshot(projectRoot, makeManifest([snapshotEntry]));

    const opts = makeCliOpts({
      cwd: projectRoot,
      packageRoot: pkgRoot,
    });

    await upgradeHandler({}, opts);

    const fullOutput = opts.out.join('\n');

    // Assert 3a — the RED assertion that FAILS pre-fix:
    // When cleargate entry is identical, NO restart warning should fire.
    // Pre-fix: postSha != currentSha (byte-level key-order diff) → warning fires.
    // Post-fix: extractSessionLoadDelta detects cleargate-identical → suppressed.
    const hasRestartWarning = opts.out.some((l) => l.includes('Restart Claude Code'));
    assert.equal(
      hasRestartWarning,
      false,
      `CR-059 Test 3a FAIL: "Restart Claude Code" was emitted for a cosmetic-only ` +
      `server-key reorder in .mcp.json (cleargate entry unchanged).\n` +
      `extractSessionLoadDelta must suppress this false positive.\n` +
      `Full output:\n${fullOutput}`
    );
  });
});

// ─── Test 3b: .mcp.json cleargate args change ────────────────────────────────
//
// SDR-locked scope: mcpServers.cleargate.args change → real change → must warn.
// Fixture: target has args:["cleargate","mcp","serve"].
// Upstream: args:["cleargate","mcp","serve","--verbose"] — REAL change.
//
// PRE-FIX: byte sha differs → warning fires (correct).
// POST-FIX: extractSessionLoadDelta sees cleargate.args changed → still warns.
// This test should PASS both pre-fix and post-fix (regression preservation).

describe('CR-059 Test 3b — .mcp.json cleargate args change triggers warning', () => {
  it('emits restart warning listing .mcp.json when mcpServers.cleargate.args changes', async () => {
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    // Target: cleargate args without --verbose
    const targetMcpObj = {
      mcpServers: {
        cleargate: {
          command: 'npx',
          args: ['cleargate', 'mcp', 'serve'],
        },
      },
    };
    const targetMcpContent = JSON.stringify(targetMcpObj, null, 2) + '\n';

    // Upstream: cleargate args WITH --verbose — REAL schema-meaningful change
    const upstreamMcpObj = {
      mcpServers: {
        cleargate: {
          command: 'npx',
          args: ['cleargate', 'mcp', 'serve', '--verbose'],
        },
      },
    };
    const upstreamMcpContent = JSON.stringify(upstreamMcpObj, null, 2) + '\n';

    const installSha = hashNormalized(targetMcpContent);
    const upstreamSha = hashNormalized(upstreamMcpContent);

    const entry = makeEntry({
      path: '.mcp.json',
      sha256: upstreamSha,
      tier: 'cli-config',
      overwrite_policy: 'always',
    });

    const pkgManifest = makeManifest([entry]);
    writePackageManifest(pkgRoot, pkgManifest);
    writeTrackedFile(pkgRoot, entry.path, upstreamMcpContent);
    writeTrackedFile(projectRoot, entry.path, targetMcpContent);

    const snapshotEntry = { ...entry, sha256: installSha };
    writeInstallSnapshot(projectRoot, makeManifest([snapshotEntry]));

    const opts = makeCliOpts({
      cwd: projectRoot,
      packageRoot: pkgRoot,
    });

    await upgradeHandler({}, opts);

    const fullOutput = opts.out.join('\n');

    // Assert 3b: restart warning emitted for real cleargate change
    const hasRestartWarning = opts.out.some((l) => l.includes('Restart Claude Code'));
    assert.ok(
      hasRestartWarning,
      `CR-059 Test 3b FAIL: "Restart Claude Code" was NOT emitted for a real ` +
      `mcpServers.cleargate.args change in .mcp.json.\n` +
      `Full output:\n${fullOutput}`
    );

    // Assert 3b: .mcp.json listed in the warning block
    const warningIdx = opts.out.findIndex((l) => l.includes('Restart Claude Code'));
    const warningBlock = warningIdx >= 0 ? opts.out.slice(warningIdx).join('\n') : '';
    assert.ok(
      warningBlock.includes('.mcp.json'),
      `CR-059 Test 3b FAIL: ".mcp.json" not listed in restart warning block.\n` +
      `Warning block:\n${warningBlock}\nFull output:\n${fullOutput}`
    );
  });
});
