import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * build-manifest.test.ts — STORY-009-02
 *
 * Tests for scripts/build-manifest.ts
 * Uses fixture trees; never relies on real repo layout.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import {
  buildManifest,
  classifyPath,
  matchRule,
  TIER_RULES,
} from '../../scripts/build-manifest.js';
import type { ManifestFile } from '../../src/lib/manifest.js';

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


// ─── Fixture helpers ──────────────────────────────────────────────────────────

function createFixtureTree(rootDir: string): void {
  // package.json for version reading
  fs.writeFileSync(
    path.join(rootDir, 'package.json'),
    JSON.stringify({ version: '0.2.0-test' }),
    'utf-8'
  );

  // cleargate-planning structure
  const planning = path.join(rootDir, 'cleargate-planning');
  fs.mkdirSync(planning, { recursive: true });

  // Protocol
  const knowledge = path.join(planning, '.cleargate', 'knowledge');
  fs.mkdirSync(knowledge, { recursive: true });
  fs.writeFileSync(path.join(knowledge, 'cleargate-protocol.md'), 'protocol content\n', 'utf-8');

  // Templates
  const templates = path.join(planning, '.cleargate', 'templates');
  fs.mkdirSync(templates, { recursive: true });
  fs.writeFileSync(path.join(templates, 'story.md'), 'story template\n', 'utf-8');

  // Agents
  const agents = path.join(planning, '.claude', 'agents');
  fs.mkdirSync(agents, { recursive: true });
  fs.writeFileSync(path.join(agents, 'developer.md'), 'developer agent\n', 'utf-8');

  // Hooks
  const hooks = path.join(planning, '.claude', 'hooks');
  fs.mkdirSync(hooks, { recursive: true });
  fs.writeFileSync(path.join(hooks, 'token-ledger.sh'), '#!/bin/bash\n', 'utf-8');

  // Skills
  const skills = path.join(planning, '.claude', 'skills', 'flashcard');
  fs.mkdirSync(skills, { recursive: true });
  fs.writeFileSync(path.join(skills, 'SKILL.md'), 'skill content\n', 'utf-8');

  // CLI config
  const claudeDir = path.join(planning, '.claude');
  fs.writeFileSync(path.join(claudeDir, 'settings.json'), '{}', 'utf-8');

  // User-artifact (FLASHCARD.md)
  const cleargateDir = path.join(planning, '.cleargate');
  fs.writeFileSync(path.join(cleargateDir, 'FLASHCARD.md'), 'flashcard content\n', 'utf-8');

  // Derived (should be excluded)
  const sprintRuns = path.join(cleargateDir, 'sprint-runs', 'SPRINT-01');
  fs.mkdirSync(sprintRuns, { recursive: true });
  fs.writeFileSync(path.join(sprintRuns, 'plans.md'), 'derived content\n', 'utf-8');

  const wiki = path.join(cleargateDir, 'wiki');
  fs.mkdirSync(wiki, { recursive: true });
  fs.writeFileSync(path.join(wiki, 'index.md'), 'wiki content\n', 'utf-8');

  const hookLog = path.join(cleargateDir, 'hook-log');
  fs.mkdirSync(hookLog, { recursive: true });
  fs.writeFileSync(path.join(hookLog, 'token-ledger.log'), 'log content\n', 'utf-8');
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('build-manifest: matchRule', () => {
  test('matches exact path', () => {
    expect(matchRule('.cleargate/FLASHCARD.md', '.cleargate/FLASHCARD.md')).toBe(true);
  });

  test('does not match partial exact', () => {
    expect(matchRule('.cleargate/FLASHCARD.md.bak', '.cleargate/FLASHCARD.md')).toBe(false);
  });

  test('matches /** (deep)', () => {
    expect(matchRule('.cleargate/sprint-runs/SPRINT-01/foo.md', '.cleargate/sprint-runs/**')).toBe(true);
  });

  test('matches /* (single level)', () => {
    expect(matchRule('.cleargate/knowledge/cleargate-protocol.md', '.cleargate/knowledge/**')).toBe(true);
  });

  test('does not match /* across two levels', () => {
    // /* is single-level; /** matches deep
    expect(matchRule('.cleargate/templates/sub/file.md', '.cleargate/templates/*')).toBe(false);
  });
});

describe('build-manifest: classifyPath', () => {
  test('tier classifier applies protocol rule to knowledge files', () => {
    const rule = classifyPath('.cleargate/knowledge/cleargate-protocol.md');
    assert.notStrictEqual(rule, null);
    assert.strictEqual(rule!.tier, 'protocol');
  });

  test('user-artifact rule returns nullSha + preserve_on_uninstall', () => {
    const rule = classifyPath('.cleargate/FLASHCARD.md');
    assert.notStrictEqual(rule, null);
    assert.strictEqual(rule!.nullSha, true);
    assert.strictEqual(rule!.preserve_on_uninstall, true);
    assert.strictEqual(rule!.tier, 'user-artifact');
  });

  test('derived tier is excluded', () => {
    const rule = classifyPath('.cleargate/sprint-runs/SPRINT-01/foo.md');
    assert.notStrictEqual(rule, null);
    assert.strictEqual(rule!.exclude, true);
    assert.strictEqual(rule!.tier, 'derived');
  });

  test('agent tier is classified', () => {
    const rule = classifyPath('.claude/agents/developer.md');
    assert.strictEqual(rule!.tier, 'agent');
    assert.strictEqual(rule!.overwrite_policy, 'always');
  });

  test('hook tier is classified', () => {
    const rule = classifyPath('.claude/hooks/token-ledger.sh');
    assert.strictEqual(rule!.tier, 'hook');
    assert.strictEqual(rule!.overwrite_policy, 'always');
  });

  test('skill tier is classified', () => {
    const rule = classifyPath('.claude/skills/flashcard/SKILL.md');
    assert.strictEqual(rule!.tier, 'skill');
  });

  test('cli-config tier for settings.json', () => {
    const rule = classifyPath('.claude/settings.json');
    assert.strictEqual(rule!.tier, 'cli-config');
    assert.strictEqual(rule!.overwrite_policy, 'merge-3way');
  });

  test('returns null for unclassified paths', () => {
    const rule = classifyPath('CLAUDE.md');
    assert.strictEqual(rule, null);
  });
});

describe('build-manifest: fresh build writes MANIFEST.json', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-test-'));
    createFixtureTree(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('fresh build writes MANIFEST.json', () => {
    const planningRoot = path.join(tmpDir, 'cleargate-planning');
    const outputPath = path.join(planningRoot, 'MANIFEST.json');

    const result = buildManifest({
      planningRoot,
      pkgRoot: tmpDir,
      outputPath,
      now: () => new Date('2026-01-01T00:00:00.000Z'),
    });

    assert.ok(result.entryCount > 0);
    expect(fs.existsSync(outputPath)).toBe(true);

    const manifest: ManifestFile = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    assert.strictEqual(manifest.cleargate_version, '0.2.0-test');
    assert.ok(manifest.files.length > 0);
  });

  test('cleargate_version matches package.json', () => {
    const planningRoot = path.join(tmpDir, 'cleargate-planning');
    const outputPath = path.join(planningRoot, 'MANIFEST.json');

    buildManifest({
      planningRoot,
      pkgRoot: tmpDir,
      outputPath,
      now: () => new Date('2026-01-01T00:00:00.000Z'),
    });

    const manifest: ManifestFile = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    const pkgVersion = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf-8')).version;
    assert.strictEqual(manifest.cleargate_version, pkgVersion);
  });

  test('user-artifact has null sha', () => {
    const planningRoot = path.join(tmpDir, 'cleargate-planning');
    const outputPath = path.join(planningRoot, 'MANIFEST.json');

    buildManifest({
      planningRoot,
      pkgRoot: tmpDir,
      outputPath,
      now: () => new Date('2026-01-01T00:00:00.000Z'),
    });

    const manifest: ManifestFile = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    const flashcard = manifest.files.find((f) => f.path === '.cleargate/FLASHCARD.md');
    assert.notStrictEqual(flashcard, undefined);
    assert.strictEqual(flashcard!.sha256, null);
    assert.strictEqual(flashcard!.tier, 'user-artifact');
    assert.strictEqual(flashcard!.preserve_on_uninstall, true);
  });

  test('derived tier excluded from manifest', () => {
    const planningRoot = path.join(tmpDir, 'cleargate-planning');
    const outputPath = path.join(planningRoot, 'MANIFEST.json');

    buildManifest({
      planningRoot,
      pkgRoot: tmpDir,
      outputPath,
      now: () => new Date('2026-01-01T00:00:00.000Z'),
    });

    const manifest: ManifestFile = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    const derivedEntry = manifest.files.find((f) =>
      f.path.startsWith('.cleargate/sprint-runs/')
    );
    assert.strictEqual(derivedEntry, undefined);

    const wikiEntry = manifest.files.find((f) =>
      f.path.startsWith('.cleargate/wiki/')
    );
    assert.strictEqual(wikiEntry, undefined);

    const hookLogEntry = manifest.files.find((f) =>
      f.path.startsWith('.cleargate/hook-log/')
    );
    assert.strictEqual(hookLogEntry, undefined);
  });

  test('stable ordering: two runs with same seam produce byte-identical output', () => {
    const planningRoot = path.join(tmpDir, 'cleargate-planning');
    const outputPath = path.join(planningRoot, 'MANIFEST.json');
    const frozenNow = () => new Date('2026-01-01T00:00:00.000Z');

    buildManifest({ planningRoot, pkgRoot: tmpDir, outputPath, now: frozenNow });
    const first = fs.readFileSync(outputPath);

    buildManifest({ planningRoot, pkgRoot: tmpDir, outputPath, now: frozenNow });
    const second = fs.readFileSync(outputPath);

    expect(first.equals(second)).toBe(true);
  });

  test('generated_at test seam is respected', () => {
    const planningRoot = path.join(tmpDir, 'cleargate-planning');
    const outputPath = path.join(planningRoot, 'MANIFEST.json');
    const frozenNow = () => new Date('2026-06-15T12:34:56.000Z');

    buildManifest({ planningRoot, pkgRoot: tmpDir, outputPath, now: frozenNow });

    const manifest: ManifestFile = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    assert.strictEqual(manifest.generated_at, '2026-06-15T12:34:56.000Z');
  });

  test('TIER_RULES is frozen (immutable const)', () => {
    expect(Object.isFrozen(TIER_RULES)).toBe(true);
  });
});
