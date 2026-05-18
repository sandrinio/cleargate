import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * identity.test.ts — STORY-010-01 §2.1 Gherkin scenarios 1–4.
 *
 * All tests use tmpdir + injected opts seams.
 * Do NOT mock.module('child_process') — use the gitEmail injectable instead
 * (see flashcard 2026-04-19 #cli #vitest #vi-mock-hoisting).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { resolveIdentity, readParticipant, writeParticipant } from '../../src/lib/identity.js';

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


function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-identity-test-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('Scenario: Identity resolves from participant.json first', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    fs.mkdirSync(path.join(tmpDir, '.cleargate'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.cleargate', '.participant.json'),
      JSON.stringify({ email: 'a@x.com', set_at: '2026-01-01T00:00:00Z', source: 'prompted' }),
      'utf8',
    );
  });

  afterEach(() => cleanup(tmpDir));

  test('participant-json wins over env + git', () => {
    const result = resolveIdentity(tmpDir, {
      env: { CLEARGATE_USER: 'b@x.com' },
      gitEmail: () => 'c@x.com',
    });
    assert.strictEqual(result.email, 'a@x.com');
    assert.strictEqual(result.source, 'participant-json');
  });
});

describe('Scenario: Identity falls through to env when participant.json absent', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => cleanup(tmpDir));

  test('env wins when participant-json absent', () => {
    const result = resolveIdentity(tmpDir, {
      env: { CLEARGATE_USER: 'b@x.com' },
      gitEmail: () => 'c@x.com',
    });
    assert.strictEqual(result.email, 'b@x.com');
    assert.strictEqual(result.source, 'env');
  });
});

describe('Scenario: Identity falls through to git', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => cleanup(tmpDir));

  test('git wins when no participant-json no env', () => {
    const result = resolveIdentity(tmpDir, {
      env: {},
      gitEmail: () => 'c@x.com',
    });
    assert.strictEqual(result.email, 'c@x.com');
    assert.strictEqual(result.source, 'git');
  });
});

describe('Scenario: Identity host fallback', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => cleanup(tmpDir));

  test('host fallback when all other sources absent', () => {
    const result = resolveIdentity(tmpDir, {
      env: {},
      gitEmail: () => null,
      hostname: () => 'mac',
      username: () => 'dev',
    });
    assert.match(String(result.email), /.+@.+/);
    assert.strictEqual(result.source, 'host');
    assert.strictEqual(result.email, 'dev@mac');
  });
});

describe('readParticipant', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => cleanup(tmpDir));

  test('returns null when file does not exist', () => {
    expect(readParticipant(tmpDir)).toBeNull();
  });

  test('returns null for malformed JSON', () => {
    fs.mkdirSync(path.join(tmpDir, '.cleargate'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.cleargate', '.participant.json'), '{not-json', 'utf8');
    expect(readParticipant(tmpDir)).toBeNull();
  });
});

describe('writeParticipant', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => cleanup(tmpDir));

  test('writes atomic file with correct shape', async () => {
    const now = () => '2026-04-19T12:00:00Z';
    await writeParticipant(tmpDir, 'test@x.com', 'prompted', now);

    const filePath = path.join(tmpDir, '.cleargate', '.participant.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8')) as { email: string; set_at: string; source: string };
    assert.strictEqual(content.email, 'test@x.com');
    assert.strictEqual(content.source, 'prompted');
    assert.strictEqual(content.set_at, '2026-04-19T12:00:00Z');
  });

  test('creates .cleargate/ directory if missing', async () => {
    const now = () => '2026-04-19T12:00:00Z';
    await writeParticipant(tmpDir, 'new@x.com', 'inferred', now);
    expect(fs.existsSync(path.join(tmpDir, '.cleargate'))).toBe(true);
  });
});
