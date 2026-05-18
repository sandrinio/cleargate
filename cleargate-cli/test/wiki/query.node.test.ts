import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for STORY-002-08: cleargate wiki query [--persist]
 * Vitest, real-fs fixtures under os.tmpdir(). No fs mocks.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { wikiQueryHandler, computeSlug } from '../../src/commands/wiki-query.js';
import type { WikiQueryOptions } from '../../src/commands/wiki-query.js';

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

interface QueryFixture {
  root: string;
  wikiRoot: string;
  indexPath: string;
  cleanup: () => void;
}

function buildQueryFixture(indexContent: string): QueryFixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-query-test-'));
  const wikiRoot = path.join(root, '.cleargate', 'wiki');
  fs.mkdirSync(wikiRoot, { recursive: true });
  fs.mkdirSync(path.join(wikiRoot, 'topics'), { recursive: true });

  const indexPath = path.join(wikiRoot, 'index.md');
  fs.writeFileSync(indexPath, indexContent, 'utf8');

  return {
    root,
    wikiRoot,
    indexPath,
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

/** Run queryHandler and capture results */
async function runQuery(fixture: QueryFixture, overrides: Partial<WikiQueryOptions> & { query: string }) {
  const out: string[] = [];
  const err: string[] = [];
  let exitCode: number | undefined;

  const opts: WikiQueryOptions = {
    cwd: fixture.root,
    stdout: (s) => { out.push(s); },
    stderr: (s) => { err.push(s); },
    exit: (c): never => {
      exitCode = c;
      throw new Error(`EXIT:${c}`);
    },
    now: () => '2026-04-19T12:00:00.000Z',
    ...overrides,
  };

  try {
    await wikiQueryHandler(opts);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('EXIT:')) {
      return { stdout: out.join(''), stderr: err.join(''), exitCode: exitCode ?? 0 };
    }
    throw e;
  }
  return { stdout: out.join(''), stderr: err.join(''), exitCode: 0 };
}

/** Build a simple index.md with a few entries */
function simpleIndex(...ids: string[]): string {
  const lines = [
    '# Wiki Index',
    '',
    '> Auto-generated by `cleargate wiki build`.',
    '',
    '## Proposals',
    '',
    ...ids.map((id) => `| [[${id}]] | proposal | Draft | .cleargate/delivery/pending-sync/${id}.md |`),
    '',
  ];
  return lines.join('\n');
}

// ─── Scenario 1: Read-only synthesis (default) ───────────────────────────────

describe('Scenario 1: Read-only synthesis — no file writes', () => {
  let fixture: QueryFixture;

  beforeEach(() => {
    fixture = buildQueryFixture(simpleIndex('PROPOSAL-stripe-webhooks'));
  });

  afterEach(() => fixture.cleanup());

  test('stdout contains [[PROPOSAL-stripe-webhooks]]', async () => {
    const result = await runQuery(fixture, { query: 'stripe' });
    assert.ok(String(result.stdout).includes('[[PROPOSAL-stripe-webhooks]]'));
  });

  test('exits 0', async () => {
    const result = await runQuery(fixture, { query: 'stripe' });
    assert.strictEqual(result.exitCode, 0);
  });

  test('zero file writes — topics dir is empty', async () => {
    await runQuery(fixture, { query: 'stripe', persist: false });
    const topicsDir = path.join(fixture.wikiRoot, 'topics');
    const entries = fs.readdirSync(topicsDir);
    assert.strictEqual((entries).length, 0);
  });

  test('zero file writes — index.md is unchanged', async () => {
    const originalContent = fs.readFileSync(fixture.indexPath, 'utf8');
    await runQuery(fixture, { query: 'stripe', persist: false });
    const afterContent = fs.readFileSync(fixture.indexPath, 'utf8');
    assert.strictEqual(afterContent, originalContent);
  });
});

// ─── Scenario 2: --persist writes topic page ─────────────────────────────────

describe('Scenario 2: --persist writes topic page', () => {
  let fixture: QueryFixture;

  beforeEach(() => {
    fixture = buildQueryFixture(simpleIndex('PROPOSAL-stripe-webhooks'));
  });

  afterEach(() => fixture.cleanup());

  test('creates wiki/topics/stripe.md', async () => {
    await runQuery(fixture, { query: 'stripe', persist: true });
    const topicPath = path.join(fixture.wikiRoot, 'topics', 'stripe.md');
    expect(fs.existsSync(topicPath)).toBe(true);
  });

  test('topic page has frontmatter type: topic', async () => {
    await runQuery(fixture, { query: 'stripe', persist: true });
    const topicPath = path.join(fixture.wikiRoot, 'topics', 'stripe.md');
    const content = fs.readFileSync(topicPath, 'utf8');
    assert.ok(String(content).includes('type: topic'));
  });

  test('topic page has cites containing [[PROPOSAL-stripe-webhooks]]', async () => {
    await runQuery(fixture, { query: 'stripe', persist: true });
    const topicPath = path.join(fixture.wikiRoot, 'topics', 'stripe.md');
    const content = fs.readFileSync(topicPath, 'utf8');
    assert.ok(String(content).includes('[[PROPOSAL-stripe-webhooks]]'));
  });

  test('topic page body contains the citation', async () => {
    await runQuery(fixture, { query: 'stripe', persist: true });
    const topicPath = path.join(fixture.wikiRoot, 'topics', 'stripe.md');
    const content = fs.readFileSync(topicPath, 'utf8');
    // Body (after frontmatter) should also contain the citation
    const bodyStart = content.indexOf('---', 3) + 3;
    const body = content.slice(bodyStart);
    assert.ok(String(body).includes('[[PROPOSAL-stripe-webhooks]]'));
  });

  test('exits 0', async () => {
    const result = await runQuery(fixture, { query: 'stripe', persist: true });
    assert.strictEqual(result.exitCode, 0);
  });

  test('topic page has created_by: cleargate-wiki-query', async () => {
    await runQuery(fixture, { query: 'stripe', persist: true });
    const topicPath = path.join(fixture.wikiRoot, 'topics', 'stripe.md');
    const content = fs.readFileSync(topicPath, 'utf8');
    assert.ok(String(content).includes('created_by: "cleargate-wiki-query"'));
  });

  test('topic page has frozen created_at timestamp', async () => {
    await runQuery(fixture, { query: 'stripe', persist: true });
    const topicPath = path.join(fixture.wikiRoot, 'topics', 'stripe.md');
    const content = fs.readFileSync(topicPath, 'utf8');
    assert.ok(String(content).includes('2026-04-19T12:00:00.000Z'));
  });
});

// ─── Scenario 3: Slug computation ────────────────────────────────────────────

describe('Scenario 3: Slug computation', () => {
  test('"Stripe Webhook Support!" → stripe-webhook-support', () => {
    expect(computeSlug('Stripe Webhook Support!')).toBe('stripe-webhook-support');
  });

  test('"stripe" → "stripe"', () => {
    expect(computeSlug('stripe')).toBe('stripe');
  });

  test('truncates to ≤40 chars', () => {
    const long = 'a very long query string that exceeds forty characters total here';
    const slug = computeSlug(long);
    assert.ok(slug.length <= 40);
  });

  test('strips leading/trailing hyphens after truncation', () => {
    const slug = computeSlug('hello world');
    assert.doesNotMatch(String(slug), /^-/);
    assert.doesNotMatch(String(slug), /-$/);
  });

  test('lowercase output', () => {
    const slug = computeSlug('STRIPE WEBHOOKS');
    assert.strictEqual(slug, 'stripe-webhooks');
  });

  test('persist with slug query uses correct file path', async () => {
    // Index must contain entries matching ALL terms from the query
    const index = [
      '# Wiki Index',
      '',
      '## Proposals',
      '',
      '| [[PROPOSAL-stripe-webhook-support]] | proposal | Draft | path.md |',
      '',
    ].join('\n');
    const fixture = buildQueryFixture(index);
    try {
      await runQuery(fixture, { query: 'stripe webhook support', persist: true });
      const topicPath = path.join(fixture.wikiRoot, 'topics', 'stripe-webhook-support.md');
      expect(fs.existsSync(topicPath)).toBe(true);
    } finally {
      fixture.cleanup();
    }
  });
});

// ─── Scenario 4: Slug collision overwrites ───────────────────────────────────

describe('Scenario 4: Slug collision overwrites', () => {
  let fixture: QueryFixture;

  beforeEach(() => {
    fixture = buildQueryFixture(simpleIndex('PROPOSAL-stripe-webhooks', 'PROPOSAL-stripe-v2'));
  });

  afterEach(() => fixture.cleanup());

  test('overwrites existing topic page', async () => {
    const topicPath = path.join(fixture.wikiRoot, 'topics', 'stripe.md');

    // Pre-seed with old content
    const oldContent = [
      '---',
      'type: topic',
      'id: "stripe"',
      'created_by: "cleargate-wiki-query"',
      'created_at: "2026-01-01T00:00:00.000Z"',
      'cites: ["[[OLD-PROPOSAL]]"]',
      '---',
      '',
      'Old content.',
      '',
    ].join('\n');
    fs.writeFileSync(topicPath, oldContent, 'utf8');

    // Wait a tick to ensure mtime can change
    await new Promise((r) => setTimeout(r, 10));

    // Run with same slug query
    await runQuery(fixture, { query: 'stripe', persist: true });

    const newContent = fs.readFileSync(topicPath, 'utf8');
    // Content should be replaced
    assert.ok(!String(newContent).includes('OLD-PROPOSAL'));
    assert.ok(String(newContent).includes('PROPOSAL-stripe-webhooks'));
  });
});

// ─── Scenario 5: wiki/index.md Topics section update ─────────────────────────

describe('Scenario 5: wiki/index.md Topics section update', () => {
  let fixture: QueryFixture;

  beforeEach(() => {
    fixture = buildQueryFixture(simpleIndex('PROPOSAL-stripe-webhooks'));
  });

  afterEach(() => fixture.cleanup());

  test('creates ## Topics section if absent', async () => {
    // Ensure original index has no Topics section
    const original = fs.readFileSync(fixture.indexPath, 'utf8');
    assert.ok(!String(original).includes('## Topics'));

    await runQuery(fixture, { query: 'stripe', persist: true });

    const updated = fs.readFileSync(fixture.indexPath, 'utf8');
    assert.ok(String(updated).includes('## Topics'));
  });

  test('appends one row in ## Topics section', async () => {
    await runQuery(fixture, { query: 'stripe', persist: true });
    const updated = fs.readFileSync(fixture.indexPath, 'utf8');
    assert.ok(String(updated).includes('stripe'));
    // Row should contain the slug
    const topicsIdx = updated.indexOf('## Topics');
    const topicsSection = updated.slice(topicsIdx);
    assert.ok(String(topicsSection).includes('stripe'));
  });

  test('appends another row when ## Topics section already exists', async () => {
    // First persist creates the section
    await runQuery(fixture, { query: 'stripe', persist: true });

    // Add another entry to the index
    const indexContent = fs.readFileSync(fixture.indexPath, 'utf8');
    const withExtra =
      indexContent.replace(
        '## Proposals',
        '## Proposals\n| [[PROPOSAL-other]] | proposal | Draft | path.md |',
      );
    fs.writeFileSync(fixture.indexPath, withExtra, 'utf8');

    // Second persist
    await runQuery(fixture, { query: 'other', persist: true });

    const final = fs.readFileSync(fixture.indexPath, 'utf8');
    // Both slugs should appear in Topics section
    const topicsIdx = final.indexOf('## Topics');
    const topicsSection = final.slice(topicsIdx);
    assert.ok(String(topicsSection).includes('stripe'));
    assert.ok(String(topicsSection).includes('other'));
  });
});

// ─── Scenario 6: No matches — zero writes ────────────────────────────────────

describe('Scenario 6: No matches — zero writes', () => {
  let fixture: QueryFixture;

  beforeEach(() => {
    fixture = buildQueryFixture(simpleIndex('PROPOSAL-stripe-webhooks'));
  });

  afterEach(() => fixture.cleanup());

  test('no match exits 0', async () => {
    const result = await runQuery(fixture, { query: 'nonexistent-term' });
    assert.strictEqual(result.exitCode, 0);
  });

  test('no match with persist=true does not create file', async () => {
    await runQuery(fixture, { query: 'nonexistent-term', persist: true });
    const topicsDir = path.join(fixture.wikiRoot, 'topics');
    const entries = fs.readdirSync(topicsDir);
    assert.strictEqual((entries).length, 0);
  });
});
