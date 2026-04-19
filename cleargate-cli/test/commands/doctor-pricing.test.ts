/**
 * doctor-pricing.test.ts — STORY-008-06
 *
 * Tests for `cleargate doctor --pricing <file>` mode.
 * Named cases follow the Gherkin scenarios from the story.
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { runPricing } from '../../src/commands/doctor.js';

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-doctor-pricing-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeNeverExit(): (code: number) => never {
  return (code: number) => {
    throw new Error(`exit(${code})`);
  };
}

function writeWorkItemFile(
  dir: string,
  name: string,
  draftTokens: Record<string, unknown> | null
): string {
  const filePath = path.join(dir, name);
  const draftTokensLine = draftTokens !== null
    ? `draft_tokens: ${JSON.stringify(draftTokens)}`
    : 'draft_tokens:';
  const content = `---
epic_id: "EPIC-008"
status: "Active"
${draftTokensLine}
---

# Test Epic
`;
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('doctor --pricing', () => {
  it('outputs USD string (nonzero) given populated draft_tokens with known model', async () => {
    const dir = makeTmpDir();
    const filePath = writeWorkItemFile(dir, 'EPIC-008.md', {
      input: 1_000_000,
      output: 500_000,
      cache_read: 200_000,
      cache_creation: 100_000,
      model: 'claude-opus-4-7',
      last_stamp: '2026-04-19T10:00:00Z',
      sessions: [],
    });

    const out: string[] = [];
    const err: string[] = [];
    const exitCodes: number[] = [];

    await runPricing(
      filePath,
      dir,
      (s) => out.push(s),
      (s) => err.push(s),
      (code) => { exitCodes.push(code); throw new Error(`exit(${code})`); }
    );

    // Should not exit
    expect(exitCodes).toHaveLength(0);
    expect(out).toHaveLength(1);
    const line = out[0]!;
    expect(line).toContain('EPIC-008.md');
    expect(line).toContain('claude-opus-4-7');
    expect(line).toContain('$');

    // USD should be nonzero
    const match = line.match(/\$(\d+\.\d+)/);
    expect(match).toBeTruthy();
    const usd = parseFloat(match![1]!);
    expect(usd).toBeGreaterThan(0);
  });

  it('exits 1 and emits stamp-tokens hint when draft_tokens is null/empty', async () => {
    const dir = makeTmpDir();
    const filePath = writeWorkItemFile(dir, 'EPIC-008-null.md', null);

    const out: string[] = [];
    const err: string[] = [];
    let exitCode = -1;

    try {
      await runPricing(
        filePath,
        dir,
        (s) => out.push(s),
        (s) => err.push(s),
        (code) => { exitCode = code; throw new Error(`exit(${code})`); }
      );
    } catch {
      // Expected: exit throws
    }

    expect(exitCode).toBe(1);
    const allOut = out.join('\n');
    expect(allOut).toContain('run cleargate stamp-tokens first');
  });

  it('warns about unknown model and shows $0.0000', async () => {
    const dir = makeTmpDir();
    const filePath = writeWorkItemFile(dir, 'EPIC-008-unknown.md', {
      input: 100_000,
      output: 50_000,
      cache_read: 0,
      cache_creation: 0,
      model: 'claude-future-xyz',
      last_stamp: '2026-04-19T10:00:00Z',
      sessions: [],
    });

    const out: string[] = [];
    const err: string[] = [];
    let exitCode = -1;

    // runPricing does NOT exit for unknown model — it just warns
    // but should NOT throw
    await runPricing(
      filePath,
      dir,
      (s) => out.push(s),
      (s) => err.push(s),
      (code) => { exitCode = code; throw new Error(`exit(${code})`); }
    );

    // Should not exit
    expect(exitCode).toBe(-1);
    // stderr should contain warning about unknown model
    const errOut = err.join('\n');
    expect(errOut).toContain('unknown model');
    // stdout should show $0.0000
    expect(out.join('\n')).toContain('$0.0000');
  });

  it('exits 1 with error when file does not exist', async () => {
    const dir = makeTmpDir();
    let exitCode = -1;
    const err: string[] = [];

    try {
      await runPricing(
        '/tmp/nonexistent-cleargate-file.md',
        dir,
        () => {},
        (s) => err.push(s),
        (code) => { exitCode = code; throw new Error(`exit(${code})`); }
      );
    } catch {
      // Expected
    }

    expect(exitCode).toBe(1);
    expect(err.join('\n')).toContain('cannot read file');
  });

  it('exits 1 with error when filePath is empty string', async () => {
    const dir = makeTmpDir();
    let exitCode = -1;
    const err: string[] = [];

    try {
      await runPricing(
        '',
        dir,
        () => {},
        (s) => err.push(s),
        (code) => { exitCode = code; throw new Error(`exit(${code})`); }
      );
    } catch {
      // Expected
    }

    expect(exitCode).toBe(1);
    expect(err.join('\n')).toContain('missing <file>');
  });
});
