/**
 * uninstall.test.ts — STORY-009-07
 *
 * Tests for `cleargate uninstall` preservation flow + safety rails + .uninstalled marker.
 *
 * All wet tests use os.tmpdir() fixtures via fs.mkdtempSync.
 * NEVER runs against the meta-repo itself.
 * One test per Gherkin scenario + 3 unit tests.
 *
 * No top-level await (FLASHCARD #tsup #cjs #esm).
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  uninstallHandler,
  shouldPreserve,
  type UninstallOptions,
  type UninstalledMarker,
} from '../../src/commands/uninstall.js';
import type { ManifestFile, ManifestEntry } from '../../src/lib/manifest.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-uninstall-test-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
});

/** Shared manifest entries simulating a real ClearGate install. */
function makeFrameworkEntries(): ManifestEntry[] {
  return [
    { path: '.cleargate/knowledge/cleargate-protocol.md', sha256: 'aaa', tier: 'protocol', overwrite_policy: 'merge-3way', preserve_on_uninstall: false },
    { path: '.cleargate/templates/story.md', sha256: 'bbb', tier: 'template', overwrite_policy: 'skip', preserve_on_uninstall: false },
    { path: '.cleargate/wiki/index.md', sha256: 'ccc', tier: 'derived', overwrite_policy: 'always', preserve_on_uninstall: false },
    { path: '.cleargate/hook-log/gate-check.log', sha256: null, tier: 'derived', overwrite_policy: 'skip', preserve_on_uninstall: false },
    { path: '.claude/agents/architect.md', sha256: 'ddd', tier: 'agent', overwrite_policy: 'skip', preserve_on_uninstall: false },
    { path: '.claude/agents/developer.md', sha256: 'eee', tier: 'agent', overwrite_policy: 'skip', preserve_on_uninstall: false },
    { path: '.claude/agents/qa.md', sha256: 'fff', tier: 'agent', overwrite_policy: 'skip', preserve_on_uninstall: false },
    { path: '.claude/agents/reporter.md', sha256: 'ggg', tier: 'agent', overwrite_policy: 'skip', preserve_on_uninstall: false },
    { path: '.claude/hooks/token-ledger.sh', sha256: 'hhh', tier: 'hook', overwrite_policy: 'skip', preserve_on_uninstall: false },
    { path: '.claude/hooks/stamp-and-gate.sh', sha256: 'iii', tier: 'hook', overwrite_policy: 'skip', preserve_on_uninstall: false },
    { path: '.claude/hooks/session-start.sh', sha256: 'jjj', tier: 'hook', overwrite_policy: 'skip', preserve_on_uninstall: false },
    { path: '.claude/skills/flashcard/SKILL.md', sha256: 'kkk', tier: 'skill', overwrite_policy: 'skip', preserve_on_uninstall: false },
  ];
}

function makeUserArtifactEntries(): ManifestEntry[] {
  return [
    { path: '.cleargate/FLASHCARD.md', sha256: null, tier: 'user-artifact', overwrite_policy: 'preserve', preserve_on_uninstall: true },
    { path: '.cleargate/delivery/archive/SPRINT-01.md', sha256: null, tier: 'user-artifact', overwrite_policy: 'preserve', preserve_on_uninstall: true },
    { path: '.cleargate/delivery/pending-sync/EPIC-001.md', sha256: null, tier: 'user-artifact', overwrite_policy: 'preserve', preserve_on_uninstall: true },
    { path: '.cleargate/sprint-runs/SPRINT-01/REPORT.md', sha256: null, tier: 'user-artifact', overwrite_policy: 'preserve', preserve_on_uninstall: true },
  ];
}

function makeManifest(entries: ManifestEntry[], version = '0.2.0'): ManifestFile {
  return {
    cleargate_version: version,
    generated_at: '2026-04-19T00:00:00Z',
    installed_at: '2026-04-19T00:00:00Z',
    files: entries,
  };
}

/**
 * Write fixture files to the target directory from manifest entries.
 * Creates parent dirs as needed.
 */
function writeFixtureFiles(target: string, entries: ManifestEntry[], content = 'fixture content\n'): void {
  for (const e of entries) {
    const abs = path.join(target, e.path);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf-8');
  }
}

function writeInstallManifest(target: string, manifest: ManifestFile): void {
  const dir = path.join(target, '.cleargate');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, '.install-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}

function writeCLAUDEmd(target: string, content?: string): void {
  const defaultContent = [
    '# My project',
    '',
    '<!-- CLEARGATE:START -->',
    'ClearGate injected content',
    '<!-- CLEARGATE:END -->',
    '',
    '## My section',
    'User prose here.',
  ].join('\n');
  fs.writeFileSync(path.join(target, 'CLAUDE.md'), content ?? defaultContent, 'utf-8');
}

function writeSettingsJson(target: string, settings: object): void {
  const dir = path.join(target, '.claude');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify(settings, null, 2) + '\n', 'utf-8');
}

function writePackageJson(target: string, name: string, deps?: Record<string, string>): void {
  const pkg = { name, version: '1.0.0', dependencies: deps ?? {} };
  fs.writeFileSync(path.join(target, 'package.json'), JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
}

function readUninstalledMarker(target: string): UninstalledMarker {
  const raw = fs.readFileSync(path.join(target, '.cleargate', '.uninstalled'), 'utf-8');
  return JSON.parse(raw) as UninstalledMarker;
}

/** Build standard test options with captured stdout/stderr and exit tracking. */
function makeOpts(
  target: string,
  overrides: Partial<UninstallOptions> = {}
): UninstallOptions & { out: string[]; err: string[]; exitCode: number | null } {
  const out: string[] = [];
  const err: string[] = [];
  let exitCode: number | null = null;

  return {
    cwd: target,
    stdout: (s: string) => out.push(s),
    stderr: (s: string) => err.push(s),
    exit: ((code: number) => {
      exitCode = code;
      throw new Error(`exit(${code})`);
    }) as (code: number) => never,
    now: () => new Date('2026-04-19T12:00:00.000Z'),
    git: () => ({ stdout: '', code: 128 }), // default: not a git repo → skip check
    promptName: async () => 'my-project', // default: correct project name
    promptYesNo: async () => true,          // default: confirm yes to all
    ...overrides,
    out,
    err,
    get exitCode() { return exitCode; },
  } as UninstallOptions & { out: string[]; err: string[]; exitCode: number | null };
}

/** Run handler and capture exit; returns { out, err, exitCode, threw }. */
async function run(opts: UninstallOptions & { out: string[]; err: string[]; exitCode: number | null }) {
  let threw = false;
  try {
    await uninstallHandler(opts);
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (!msg.startsWith('exit(')) throw e;
    threw = true;
  }
  return { out: opts.out, err: opts.err, exitCode: opts.exitCode, threw };
}

// ─── Scenario 1: Dry-run shows preview without changes ────────────────────────

describe('Scenario: Dry-run shows preview without changes', () => {
  it('--dry-run lists planned removals + preservations and no file changes', async () => {
    const target = makeTmpDir();
    const entries = [...makeFrameworkEntries(), ...makeUserArtifactEntries()];
    writeInstallManifest(target, makeManifest(entries));
    writeFixtureFiles(target, entries);
    writeCLAUDEmd(target);
    writePackageJson(target, 'my-project');

    const opts = makeOpts(target, { dryRun: true, yes: true });

    // Record all files before
    const before: Record<string, string> = {};
    for (const e of entries) {
      const p = path.join(target, e.path);
      if (fs.existsSync(p)) before[e.path] = fs.readFileSync(p, 'utf-8');
    }
    const beforeClaude = fs.readFileSync(path.join(target, 'CLAUDE.md'), 'utf-8');

    const result = await run(opts);

    expect(result.exitCode).toBe(0);
    const combined = result.out.join('\n');
    expect(combined).toContain('[dry-run]');
    expect(combined).toContain('[remove]');
    expect(combined).toContain('[keep]');
    expect(combined).toContain('No files changed');

    // No file on disk changes
    for (const e of entries) {
      const p = path.join(target, e.path);
      if (before[e.path] !== undefined) {
        expect(fs.readFileSync(p, 'utf-8')).toBe(before[e.path]);
      }
    }
    expect(fs.readFileSync(path.join(target, 'CLAUDE.md'), 'utf-8')).toBe(beforeClaude);
    // .uninstalled must NOT exist
    expect(fs.existsSync(path.join(target, '.cleargate', '.uninstalled'))).toBe(false);
  });
});

// ─── Scenario 2: Typed confirmation required ──────────────────────────────────

describe('Scenario: Typed confirmation required', () => {
  it('wrong project name → "name mismatch — aborting", no file changes', async () => {
    const target = makeTmpDir();
    const entries = makeFrameworkEntries();
    writeInstallManifest(target, makeManifest(entries));
    writeFixtureFiles(target, entries);
    writeCLAUDEmd(target);
    writePackageJson(target, 'my-project');

    const opts = makeOpts(target, {
      yes: false,
      promptName: async () => 'wrong-name',
    });

    const result = await run(opts);

    expect(result.exitCode).toBe(1);
    expect(result.out.join('\n')).toContain('name mismatch — aborting');

    // No files removed
    for (const e of entries) {
      expect(fs.existsSync(path.join(target, e.path))).toBe(true);
    }
  });
});

// ─── Scenario 3: Preserves user artifacts by default ─────────────────────────

describe('Scenario: Preserves user artifacts by default', () => {
  it('--yes preserves FLASHCARD, archive, pending-sync, REPORT.md', async () => {
    const target = makeTmpDir();
    const frameworkEntries = makeFrameworkEntries();
    const userEntries = makeUserArtifactEntries();
    const allEntries = [...frameworkEntries, ...userEntries];

    writeInstallManifest(target, makeManifest(allEntries));
    writeFixtureFiles(target, allEntries);
    writeCLAUDEmd(target);
    writePackageJson(target, 'my-project');

    const opts = makeOpts(target, { yes: true });
    const result = await run(opts);

    expect(result.exitCode).toBe(null); // exited normally
    expect(result.err.join('\n')).not.toContain('Error');

    // User artifacts preserved
    for (const e of userEntries) {
      expect(fs.existsSync(path.join(target, e.path))).toBe(true);
    }

    // Framework files removed
    for (const e of frameworkEntries) {
      expect(fs.existsSync(path.join(target, e.path))).toBe(false);
    }
  });
});

// ─── Scenario 4: Removes framework files ─────────────────────────────────────

describe('Scenario: Removes framework files', () => {
  it('--yes removes knowledge, templates, wiki, hook-log, agents, hooks, skills', async () => {
    const target = makeTmpDir();
    const frameworkEntries = makeFrameworkEntries();
    writeInstallManifest(target, makeManifest(frameworkEntries));
    writeFixtureFiles(target, frameworkEntries);
    writeCLAUDEmd(target);
    writePackageJson(target, 'my-project');

    const opts = makeOpts(target, { yes: true });
    await run(opts);

    // Check specific framework paths
    const knowledgePath = path.join(target, '.cleargate', 'knowledge', 'cleargate-protocol.md');
    const templatePath = path.join(target, '.cleargate', 'templates', 'story.md');
    const agentPath = path.join(target, '.claude', 'agents', 'architect.md');
    const hookPath = path.join(target, '.claude', 'hooks', 'token-ledger.sh');
    const skillPath = path.join(target, '.claude', 'skills', 'flashcard', 'SKILL.md');

    expect(fs.existsSync(knowledgePath)).toBe(false);
    expect(fs.existsSync(templatePath)).toBe(false);
    expect(fs.existsSync(agentPath)).toBe(false);
    expect(fs.existsSync(hookPath)).toBe(false);
    expect(fs.existsSync(skillPath)).toBe(false);
  });
});

// ─── Scenario 5: Surgery on CLAUDE.md + settings.json ────────────────────────

describe('Scenario: Surgery on CLAUDE.md + settings.json', () => {
  it('strips only CLEARGATE block from CLAUDE.md and only ClearGate hooks from settings.json', async () => {
    const target = makeTmpDir();
    const entries = makeFrameworkEntries();
    writeInstallManifest(target, makeManifest(entries));
    writeFixtureFiles(target, entries);

    // CLAUDE.md with ClearGate block and user prose
    const claudeContent = [
      '# My Project',
      '',
      '## Before block',
      'user prose before',
      '',
      '<!-- CLEARGATE:START -->',
      'ClearGate injected content',
      '<!-- CLEARGATE:END -->',
      '',
      '## After block',
      'user prose after',
    ].join('\n');
    fs.writeFileSync(path.join(target, 'CLAUDE.md'), claudeContent, 'utf-8');

    // settings.json with both user hooks and ClearGate hooks
    const settingsObj = {
      hooks: {
        SubagentStop: [
          {
            hooks: [{ type: 'command', command: '/user/custom/hook.sh' }],
          },
        ],
        PostToolUse: [
          {
            matcher: 'Edit|Write',
            hooks: [
              { type: 'command', command: '/path/.claude/hooks/stamp-and-gate.sh' },
            ],
          },
        ],
      },
    };
    writeSettingsJson(target, settingsObj);
    writePackageJson(target, 'my-project');

    const opts = makeOpts(target, { yes: true });
    await run(opts);

    // CLAUDE.md: surroundings intact, CLEARGATE block gone
    const newClaude = fs.readFileSync(path.join(target, 'CLAUDE.md'), 'utf-8');
    expect(newClaude).toContain('user prose before');
    expect(newClaude).toContain('user prose after');
    expect(newClaude).not.toContain('<!-- CLEARGATE:START -->');
    expect(newClaude).not.toContain('ClearGate injected content');

    // settings.json: user hook retained, ClearGate hook removed
    const newSettings = JSON.parse(
      fs.readFileSync(path.join(target, '.claude', 'settings.json'), 'utf-8')
    ) as Record<string, unknown>;
    const hooks = newSettings.hooks as Record<string, unknown> | undefined;
    // SubagentStop user hook should be retained
    expect(hooks?.SubagentStop).toBeDefined();
    // PostToolUse ClearGate stamp-and-gate should be gone
    const ptu = hooks?.PostToolUse as Array<{ hooks: Array<{ command: string }> }> | undefined;
    if (ptu) {
      for (const entry of ptu) {
        for (const h of entry.hooks ?? []) {
          expect(h.command).not.toContain('stamp-and-gate');
        }
      }
    }
  });
});

// ─── Scenario 6: Writes .uninstalled marker ───────────────────────────────────

describe('Scenario: Writes .uninstalled marker', () => {
  it('.cleargate/.uninstalled has correct shape', async () => {
    const target = makeTmpDir();
    const entries = makeFrameworkEntries();
    writeInstallManifest(target, makeManifest(entries, '0.2.0'));
    writeFixtureFiles(target, entries);
    writeCLAUDEmd(target);
    writePackageJson(target, 'my-project');

    const opts = makeOpts(target, { yes: true });
    await run(opts);

    const markerPath = path.join(target, '.cleargate', '.uninstalled');
    expect(fs.existsSync(markerPath)).toBe(true);

    const marker = readUninstalledMarker(target);
    expect(marker.uninstalled_at).toBe('2026-04-19T12:00:00.000Z');
    expect(marker.prior_version).toBe('0.2.0');
    expect(Array.isArray(marker.preserved)).toBe(true);
    expect(Array.isArray(marker.removed)).toBe(true);
    expect(marker.removed.length).toBeGreaterThan(0);
  });
});

// ─── Scenario 7: Refuses on missing CLAUDE.md markers ────────────────────────

describe('Scenario: Refuses on missing CLAUDE.md markers', () => {
  it('exits non-zero if CLAUDE.md exists but has no CLEARGATE:START marker', async () => {
    const target = makeTmpDir();
    const entries = makeFrameworkEntries();
    writeInstallManifest(target, makeManifest(entries));
    writeFixtureFiles(target, entries);

    // CLAUDE.md without markers
    fs.writeFileSync(path.join(target, 'CLAUDE.md'), '# Plain file\nNo markers here.\n', 'utf-8');
    writePackageJson(target, 'my-project');

    const opts = makeOpts(target, { yes: true });
    const result = await run(opts);

    expect(result.exitCode).toBe(1);
    expect(result.err.join('\n')).toContain('CLAUDE.md is missing <!-- CLEARGATE:START --> marker');

    // No files should be removed
    for (const e of entries) {
      expect(fs.existsSync(path.join(target, e.path))).toBe(true);
    }
  });
});

// ─── Scenario 8: Refuses on uncommitted changes without --force ───────────────

describe('Scenario: Refuses on uncommitted changes without --force', () => {
  it('exits non-zero when git status shows uncommitted tracked files', async () => {
    const target = makeTmpDir();
    const entries = makeFrameworkEntries();
    writeInstallManifest(target, makeManifest(entries));
    writeFixtureFiles(target, entries);
    writeCLAUDEmd(target);
    writePackageJson(target, 'my-project');

    // Simulate git repo with uncommitted changes
    const gitRunner: UninstallOptions['git'] = (args) => {
      const cmd = args.join(' ');
      if (cmd.includes('rev-parse')) return { stdout: 'true', code: 0 };
      if (cmd.includes('status --porcelain')) {
        return {
          stdout: ' M .cleargate/knowledge/cleargate-protocol.md\n',
          code: 0,
        };
      }
      return { stdout: '', code: 0 };
    };

    const opts = makeOpts(target, { yes: true, git: gitRunner });
    const result = await run(opts);

    expect(result.exitCode).toBe(1);
    expect(result.err.join('\n')).toContain('Uncommitted changes');

    // Files should NOT be removed
    for (const e of entries) {
      expect(fs.existsSync(path.join(target, e.path))).toBe(true);
    }
  });

  it('--force bypasses uncommitted-changes check', async () => {
    const target = makeTmpDir();
    const entries = makeFrameworkEntries();
    writeInstallManifest(target, makeManifest(entries));
    writeFixtureFiles(target, entries);
    writeCLAUDEmd(target);
    writePackageJson(target, 'my-project');

    const gitRunner: UninstallOptions['git'] = (args) => {
      const cmd = args.join(' ');
      if (cmd.includes('rev-parse')) return { stdout: 'true', code: 0 };
      if (cmd.includes('status --porcelain')) {
        return {
          stdout: ' M .cleargate/knowledge/cleargate-protocol.md\n',
          code: 0,
        };
      }
      return { stdout: '', code: 0 };
    };

    const opts = makeOpts(target, { yes: true, force: true, git: gitRunner });
    const result = await run(opts);

    // Should proceed (no exit with code 1 for uncommitted)
    expect(result.err.join('\n')).not.toContain('Uncommitted changes');
    // .uninstalled marker should be written
    expect(fs.existsSync(path.join(target, '.cleargate', '.uninstalled'))).toBe(true);
  });
});

// ─── Scenario 9: Idempotent re-run ───────────────────────────────────────────

describe('Scenario: Idempotent re-run', () => {
  it('second run after successful uninstall prints "already uninstalled" and exits 0', async () => {
    const target = makeTmpDir();
    const entries = makeFrameworkEntries();
    writeInstallManifest(target, makeManifest(entries));
    writeFixtureFiles(target, entries);
    writeCLAUDEmd(target);
    writePackageJson(target, 'my-project');

    // First uninstall
    const opts1 = makeOpts(target, { yes: true });
    await run(opts1);

    // .install-manifest.json should be removed by first run
    // Manually ensure the marker exists (written by first run)
    expect(fs.existsSync(path.join(target, '.cleargate', '.uninstalled'))).toBe(true);

    // Second uninstall (no manifest, marker present)
    const opts2 = makeOpts(target);
    const result = await run(opts2);

    expect(result.exitCode).toBe(0);
    expect(result.out.join('\n')).toContain('already uninstalled');
  });
});

// ─── Scenario 10: Single-target — does not recurse ────────────────────────────

describe('Scenario: Single-target — does not recurse', () => {
  it('nested cleargate-planning/.cleargate/ is untouched when uninstalling root', async () => {
    const target = makeTmpDir();
    const entries = makeFrameworkEntries();
    writeInstallManifest(target, makeManifest(entries));
    writeFixtureFiles(target, entries);
    writeCLAUDEmd(target);
    writePackageJson(target, 'my-project');

    // Create a nested .cleargate/ (simulating cleargate-planning/ scaffold)
    const nestedDir = path.join(target, 'cleargate-planning', '.cleargate');
    fs.mkdirSync(nestedDir, { recursive: true });
    fs.writeFileSync(
      path.join(nestedDir, 'nested-file.md'),
      'nested scaffold file\n',
      'utf-8'
    );
    const nestedManifestDir = path.join(target, 'cleargate-planning', '.cleargate');
    fs.writeFileSync(
      path.join(nestedManifestDir, '.install-manifest.json'),
      JSON.stringify(makeManifest([]), null, 2),
      'utf-8'
    );

    const opts = makeOpts(target, { yes: true });
    await run(opts);

    // Nested .cleargate/ must be untouched
    expect(fs.existsSync(path.join(nestedDir, 'nested-file.md'))).toBe(true);
    expect(fs.existsSync(path.join(nestedManifestDir, '.install-manifest.json'))).toBe(true);
  });
});

// ─── Scenario 11: Empty .cleargate after --remove all ─────────────────────────

describe('Scenario: Empty .cleargate after --remove all', () => {
  it('--remove all removes .cleargate/ directory itself when nothing preserved inside', async () => {
    const target = makeTmpDir();
    // Only framework files in manifest (no user-artifact entries)
    const entries = makeFrameworkEntries();
    writeInstallManifest(target, makeManifest(entries));
    writeFixtureFiles(target, entries);
    writeCLAUDEmd(target);
    writePackageJson(target, 'my-project');

    const opts = makeOpts(target, { yes: true, remove: ['all'] });
    await run(opts);

    // .cleargate/ directory should be gone (no user items preserved inside it)
    expect(fs.existsSync(path.join(target, '.cleargate'))).toBe(false);
  });
});

// ─── Scenario 12: Missing .install-manifest.json ─────────────────────────────

describe('Scenario: Missing .install-manifest.json', () => {
  it('prints "no ClearGate install detected" and exits 0', async () => {
    const target = makeTmpDir();
    // Do NOT write .install-manifest.json

    const opts = makeOpts(target);
    const result = await run(opts);

    expect(result.exitCode).toBe(0);
    expect(result.out.join('\n')).toContain('no ClearGate install detected');
  });
});

// ─── Unit test 13: Category classifier ───────────────────────────────────────

describe('Unit: shouldPreserve classifier', () => {
  it('user-artifact tier → preserved by default', () => {
    const entry: ManifestEntry = {
      path: '.cleargate/FLASHCARD.md',
      sha256: null,
      tier: 'user-artifact',
      overwrite_policy: 'preserve',
      preserve_on_uninstall: true,
    };
    expect(shouldPreserve(entry, new Set(), new Set())).toBe(true);
  });

  it('protocol tier → removed by default', () => {
    const entry: ManifestEntry = {
      path: '.cleargate/knowledge/cleargate-protocol.md',
      sha256: 'abc',
      tier: 'protocol',
      overwrite_policy: 'merge-3way',
      preserve_on_uninstall: false,
    };
    expect(shouldPreserve(entry, new Set(), new Set())).toBe(false);
  });

  it('user-artifact + --remove all → removed', () => {
    const entry: ManifestEntry = {
      path: '.cleargate/FLASHCARD.md',
      sha256: null,
      tier: 'user-artifact',
      overwrite_policy: 'preserve',
      preserve_on_uninstall: true,
    };
    expect(shouldPreserve(entry, new Set(), new Set(['user-artifact'] as const))).toBe(false);
  });

  it('protocol tier + --preserve protocol → preserved', () => {
    const entry: ManifestEntry = {
      path: '.cleargate/knowledge/cleargate-protocol.md',
      sha256: 'abc',
      tier: 'protocol',
      overwrite_policy: 'merge-3way',
      preserve_on_uninstall: false,
    };
    expect(shouldPreserve(entry, new Set(['protocol'] as const), new Set())).toBe(true);
  });

  it('--remove overrides --preserve (remove wins)', () => {
    const entry: ManifestEntry = {
      path: '.cleargate/knowledge/cleargate-protocol.md',
      sha256: 'abc',
      tier: 'protocol',
      overwrite_policy: 'merge-3way',
      preserve_on_uninstall: false,
    };
    // Both sets include protocol — remove wins (checked first in shouldPreserve)
    expect(shouldPreserve(entry, new Set(['protocol'] as const), new Set(['protocol'] as const))).toBe(false);
  });
});

// ─── Unit test 14: Marker writer shape ───────────────────────────────────────

describe('Unit: .uninstalled marker shape round-trip', () => {
  it('marker JSON round-trips with all required fields', async () => {
    const target = makeTmpDir();
    const entries = makeFrameworkEntries();
    writeInstallManifest(target, makeManifest(entries, '0.2.1'));
    writeFixtureFiles(target, entries);
    writeCLAUDEmd(target);
    writePackageJson(target, 'my-project');

    const opts = makeOpts(target, {
      yes: true,
      now: () => new Date('2026-04-19T10:00:00.000Z'),
    });
    await run(opts);

    const marker = readUninstalledMarker(target);

    // Shape validation
    expect(typeof marker.uninstalled_at).toBe('string');
    expect(marker.uninstalled_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(marker.prior_version).toBe('0.2.1');
    expect(Array.isArray(marker.preserved)).toBe(true);
    expect(Array.isArray(marker.removed)).toBe(true);
  });
});

// ─── Unit test 15: Preservation-flag parser ───────────────────────────────────

describe('Unit: preservation-flag parsing', () => {
  it('--preserve flashcard preserves user-artifact tier, --remove protocol removes it', async () => {
    const target = makeTmpDir();
    const entries: ManifestEntry[] = [
      {
        path: '.cleargate/FLASHCARD.md',
        sha256: null,
        tier: 'user-artifact',
        overwrite_policy: 'preserve',
        preserve_on_uninstall: true,
      },
      {
        path: '.cleargate/knowledge/cleargate-protocol.md',
        sha256: 'abc',
        tier: 'protocol',
        overwrite_policy: 'merge-3way',
        preserve_on_uninstall: false,
      },
    ];
    writeInstallManifest(target, makeManifest(entries));
    writeFixtureFiles(target, entries);
    writeCLAUDEmd(target);
    writePackageJson(target, 'my-project');

    const opts = makeOpts(target, {
      yes: true,
      preserve: ['user-artifact'],
      remove: ['protocol'],
    });
    await run(opts);

    expect(fs.existsSync(path.join(target, '.cleargate', 'FLASHCARD.md'))).toBe(true);
    expect(fs.existsSync(path.join(target, '.cleargate', 'knowledge', 'cleargate-protocol.md'))).toBe(false);
  });
});
