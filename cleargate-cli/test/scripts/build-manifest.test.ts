/**
 * build-manifest.test.ts — STORY-009-02
 *
 * Tests for scripts/build-manifest.ts
 * Uses fixture trees; never relies on real repo layout.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
  it('matches exact path', () => {
    expect(matchRule('.cleargate/FLASHCARD.md', '.cleargate/FLASHCARD.md')).toBe(true);
  });

  it('does not match partial exact', () => {
    expect(matchRule('.cleargate/FLASHCARD.md.bak', '.cleargate/FLASHCARD.md')).toBe(false);
  });

  it('matches /** (deep)', () => {
    expect(matchRule('.cleargate/sprint-runs/SPRINT-01/foo.md', '.cleargate/sprint-runs/**')).toBe(true);
  });

  it('matches /* (single level)', () => {
    expect(matchRule('.cleargate/knowledge/cleargate-protocol.md', '.cleargate/knowledge/**')).toBe(true);
  });

  it('does not match /* across two levels', () => {
    // /* is single-level; /** matches deep
    expect(matchRule('.cleargate/templates/sub/file.md', '.cleargate/templates/*')).toBe(false);
  });
});

describe('build-manifest: classifyPath', () => {
  it('tier classifier applies protocol rule to knowledge files', () => {
    const rule = classifyPath('.cleargate/knowledge/cleargate-protocol.md');
    expect(rule).not.toBeNull();
    expect(rule!.tier).toBe('protocol');
  });

  it('user-artifact rule returns nullSha + preserve_on_uninstall', () => {
    const rule = classifyPath('.cleargate/FLASHCARD.md');
    expect(rule).not.toBeNull();
    expect(rule!.nullSha).toBe(true);
    expect(rule!.preserve_on_uninstall).toBe(true);
    expect(rule!.tier).toBe('user-artifact');
  });

  it('derived tier is excluded', () => {
    const rule = classifyPath('.cleargate/sprint-runs/SPRINT-01/foo.md');
    expect(rule).not.toBeNull();
    expect(rule!.exclude).toBe(true);
    expect(rule!.tier).toBe('derived');
  });

  it('agent tier is classified', () => {
    const rule = classifyPath('.claude/agents/developer.md');
    expect(rule!.tier).toBe('agent');
    expect(rule!.overwrite_policy).toBe('always');
  });

  it('hook tier is classified', () => {
    const rule = classifyPath('.claude/hooks/token-ledger.sh');
    expect(rule!.tier).toBe('hook');
    expect(rule!.overwrite_policy).toBe('always');
  });

  it('skill tier is classified', () => {
    const rule = classifyPath('.claude/skills/flashcard/SKILL.md');
    expect(rule!.tier).toBe('skill');
  });

  it('cli-config tier for settings.json', () => {
    const rule = classifyPath('.claude/settings.json');
    expect(rule!.tier).toBe('cli-config');
    expect(rule!.overwrite_policy).toBe('merge-3way');
  });

  it('returns null for unclassified paths', () => {
    const rule = classifyPath('CLAUDE.md');
    expect(rule).toBeNull();
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

  it('fresh build writes MANIFEST.json', () => {
    const planningRoot = path.join(tmpDir, 'cleargate-planning');
    const outputPath = path.join(planningRoot, 'MANIFEST.json');

    const result = buildManifest({
      planningRoot,
      pkgRoot: tmpDir,
      outputPath,
      now: () => new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(result.entryCount).toBeGreaterThan(0);
    expect(fs.existsSync(outputPath)).toBe(true);

    const manifest: ManifestFile = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    expect(manifest.cleargate_version).toBe('0.2.0-test');
    expect(manifest.files.length).toBeGreaterThan(0);
  });

  it('cleargate_version matches package.json', () => {
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
    expect(manifest.cleargate_version).toBe(pkgVersion);
  });

  it('user-artifact has null sha', () => {
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
    expect(flashcard).toBeDefined();
    expect(flashcard!.sha256).toBeNull();
    expect(flashcard!.tier).toBe('user-artifact');
    expect(flashcard!.preserve_on_uninstall).toBe(true);
  });

  it('derived tier excluded from manifest', () => {
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
    expect(derivedEntry).toBeUndefined();

    const wikiEntry = manifest.files.find((f) =>
      f.path.startsWith('.cleargate/wiki/')
    );
    expect(wikiEntry).toBeUndefined();

    const hookLogEntry = manifest.files.find((f) =>
      f.path.startsWith('.cleargate/hook-log/')
    );
    expect(hookLogEntry).toBeUndefined();
  });

  it('stable ordering: two runs with same seam produce byte-identical output', () => {
    const planningRoot = path.join(tmpDir, 'cleargate-planning');
    const outputPath = path.join(planningRoot, 'MANIFEST.json');
    const frozenNow = () => new Date('2026-01-01T00:00:00.000Z');

    buildManifest({ planningRoot, pkgRoot: tmpDir, outputPath, now: frozenNow });
    const first = fs.readFileSync(outputPath);

    buildManifest({ planningRoot, pkgRoot: tmpDir, outputPath, now: frozenNow });
    const second = fs.readFileSync(outputPath);

    expect(first.equals(second)).toBe(true);
  });

  it('generated_at test seam is respected', () => {
    const planningRoot = path.join(tmpDir, 'cleargate-planning');
    const outputPath = path.join(planningRoot, 'MANIFEST.json');
    const frozenNow = () => new Date('2026-06-15T12:34:56.000Z');

    buildManifest({ planningRoot, pkgRoot: tmpDir, outputPath, now: frozenNow });

    const manifest: ManifestFile = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    expect(manifest.generated_at).toBe('2026-06-15T12:34:56.000Z');
  });

  it('TIER_RULES is frozen (immutable const)', () => {
    expect(Object.isFrozen(TIER_RULES)).toBe(true);
  });
});
