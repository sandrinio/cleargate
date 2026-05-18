import { describe, test, before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for `cleargate admin bootstrap-root <handle>`.
 *
 * Integration tests (prefixed I-*) run against real Postgres via the same
 * DATABASE_URL as the MCP tests (docker-compose postgres service). They create
 * and drop a fresh `admin_users` test table each run — no drizzle dep needed.
 *
 * Unit tests (prefixed U-*) cover handle validation and the password scrubber
 * using pure in-process assertions.
 *
 * STORY-011-03 Gherkin scenarios:
 *  G1: Empty table — first root created
 *  G2: Same handle re-run is a no-op
 *  G3: Refuse second root without --force
 *  G4: --force promotes existing non-root admin
 *  G5: Missing DATABASE_URL errors clearly
 *  G6: --database-url flag overrides env
 *  G7: Unreachable database errors cleanly
 *  G8: Invalid handle rejected before DB round-trip
 *  G9: DATABASE_URL with password is scrubbed from error output
 *
 * Handle regex unit table:
 *  U1-U10: valid + invalid handle combinations
 */

import pg from 'pg';
import { bootstrapRootHandler, isValidHandle, scrubPassword } from '../../src/commands/bootstrap-root.js';

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


// ─────────────────────────────────────────────────────────────────────────────
// Real Postgres setup — same DB as MCP tests
// ─────────────────────────────────────────────────────────────────────────────

const DB_URL =
  process.env['DATABASE_URL'] ??
  'postgres://cleargate:dev-only-password@localhost:5432/cleargate';

let pool: pg.Pool;

before(async () => {
  pool = new pg.Pool({ connectionString: DB_URL, max: 3 });

  // Ensure admin_users table exists (the MCP migrations already create it;
  // this CREATE IF NOT EXISTS is a safety net for fresh envs).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      github_handle TEXT NOT NULL UNIQUE,
      email         TEXT,
      is_root       BOOLEAN NOT NULL DEFAULT false,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      github_user_id TEXT,
      disabled_at   TIMESTAMPTZ,
      created_by    UUID
    )
  `);
});

after(async () => {
  await pool.end();
});

beforeEach(async () => {
  // Clean slate before each test — remove only test-inserted rows to avoid
  // touching FK-constrained production data in a shared DB. We use a reserved
  // test-handle prefix so cleanup is safe.
  //
  // FK order matters: projects.created_by and invites.created_by reference
  // admin_users.id with ON DELETE no action. Cascade-delete children first.
  const testHandleFilter = `github_handle LIKE 'test-%' OR github_handle IN ('sandrinio', 'another-user', 'first-root', 'second-user')`;
  await pool.query(`DELETE FROM invites WHERE created_by IN (SELECT id FROM admin_users WHERE ${testHandleFilter})`);
  await pool.query(`DELETE FROM projects WHERE created_by IN (SELECT id FROM admin_users WHERE ${testHandleFilter})`);
  await pool.query(`DELETE FROM admin_users WHERE ${testHandleFilter}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface Seams {
  stdout: string[];
  stderr: string[];
  exitCode: number | undefined;
}

function makeSeams(): Seams & {
  seams: Pick<Parameters<typeof bootstrapRootHandler>[0], 'stdout' | 'stderr' | 'exit'>;
} {
  const captured: Seams = { stdout: [], stderr: [], exitCode: undefined };
  const seams = {
    stdout: (s: string) => { captured.stdout.push(s); },
    stderr: (s: string) => { captured.stderr.push(s); },
    exit: (code: number): never => {
      captured.exitCode = code;
      // Throw to stop handler execution (mirrors process.exit behaviour)
      throw new ExitSignal(code);
    },
  };
  return { ...captured, seams };
}

class ExitSignal {
  constructor(public readonly code: number) {}
}

async function run(
  opts: Parameters<typeof bootstrapRootHandler>[0],
): Promise<{ stdout: string[]; stderr: string[]; exitCode: number }> {
  const { seams, stdout, stderr } = makeSeams();
  let exitCode = 0;
  try {
    await bootstrapRootHandler({ ...opts, ...seams });
  } catch (e) {
    if (e instanceof ExitSignal) {
      exitCode = e.code;
    } else {
      throw e;
    }
  }
  // exitCode from seams overrides default 0
  const finalCode = (seams as unknown as { exitCode?: number }).exitCode ?? exitCode;
  // Actually, let's capture from stdout/stderr objects
  return { stdout, stderr, exitCode: finalCode };
}

// Helper to insert an admin user directly
async function insertAdmin(handle: string, isRoot: boolean): Promise<void> {
  await pool.query(
    `INSERT INTO admin_users (github_handle, is_root) VALUES ($1, $2)`,
    [handle, isRoot],
  );
}

async function countAdmin(handle: string): Promise<number> {
  const res = await pool.query(
    `SELECT count(*) AS cnt FROM admin_users WHERE github_handle = $1`,
    [handle],
  );
  return Number((res.rows[0] as { cnt: string })['cnt']);
}

async function getAdmin(handle: string): Promise<{ is_root: boolean } | undefined> {
  const res = await pool.query(
    `SELECT is_root FROM admin_users WHERE github_handle = $1`,
    [handle],
  );
  return res.rows[0] as { is_root: boolean } | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Capture exit properly — our ExitSignal approach needs a small fix
// ─────────────────────────────────────────────────────────────────────────────

async function runCapture(
  opts: Omit<Parameters<typeof bootstrapRootHandler>[0], 'stdout' | 'stderr' | 'exit'>,
): Promise<{ stdout: string[]; stderr: string[]; exitCode: number }> {
  const captured = { stdout: [] as string[], stderr: [] as string[], exitCode: 0 };
  try {
    await bootstrapRootHandler({
      ...opts,
      stdout: (s) => { captured.stdout.push(s); },
      stderr: (s) => { captured.stderr.push(s); },
      exit: (code): never => {
        captured.exitCode = code;
        throw new ExitSignal(code);
      },
    });
  } catch (e) {
    if (!(e instanceof ExitSignal)) throw e;
  }
  return captured;
}

// ─────────────────────────────────────────────────────────────────────────────
// G1: Empty table — first root created
// ─────────────────────────────────────────────────────────────────────────────

test('G1: empty table creates first root admin', async () => {
  const { stdout, stderr, exitCode } = await runCapture({
    handle: 'sandrinio',
    databaseUrl: DB_URL,
  });

  assert.strictEqual(exitCode, 0);
  expect(stdout.join('\n')).toContain("Bootstrapped root admin 'sandrinio'.");
  assert.strictEqual((stderr).length, 0);

  const row = await getAdmin('sandrinio');
  assert.notStrictEqual(row, undefined);
  assert.strictEqual(row!.is_root, true);

  const count = await countAdmin('sandrinio');
  assert.strictEqual(count, 1);
});

// ─────────────────────────────────────────────────────────────────────────────
// G2: Same handle re-run is a no-op
// ─────────────────────────────────────────────────────────────────────────────

test('G2: same handle re-run is a no-op (idempotent)', async () => {
  await insertAdmin('sandrinio', true);

  const { stdout, stderr, exitCode } = await runCapture({
    handle: 'sandrinio',
    databaseUrl: DB_URL,
  });

  assert.strictEqual(exitCode, 0);
  expect(stdout.join('\n')).toContain("Root admin 'sandrinio' already exists; no change.");
  assert.strictEqual((stderr).length, 0);

  // Still exactly one row
  expect(await countAdmin('sandrinio')).toBe(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// G3: Refuse second root without --force
// ─────────────────────────────────────────────────────────────────────────────

test('G3: refuses to create second root without --force', async () => {
  await insertAdmin('sandrinio', true); // existing root

  const { stdout, stderr, exitCode } = await runCapture({
    handle: 'another-user',
    databaseUrl: DB_URL,
    force: false,
  });

  assert.notStrictEqual(exitCode, 0);
  expect(stderr.join('\n')).toContain(
    'refusing to create a second root admin; pass --force to override',
  );
  assert.strictEqual((stdout).length, 0);

  // No row for another-user
  expect(await countAdmin('another-user')).toBe(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// G4: --force promotes existing non-root admin
// ─────────────────────────────────────────────────────────────────────────────

test('G4: --force promotes existing non-root user to root', async () => {
  await insertAdmin('another-user', false);

  const { stdout, stderr, exitCode } = await runCapture({
    handle: 'another-user',
    databaseUrl: DB_URL,
    force: true,
  });

  assert.strictEqual(exitCode, 0);
  expect(stdout.join('\n')).toContain("Promoted 'another-user' to root admin.");
  assert.strictEqual((stderr).length, 0);

  const row = await getAdmin('another-user');
  assert.strictEqual(row!.is_root, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// G5: Missing DATABASE_URL errors clearly
// ─────────────────────────────────────────────────────────────────────────────

test('G5: missing DATABASE_URL errors with clear message', async () => {
  const { stdout, stderr, exitCode } = await runCapture({
    handle: 'sandrinio',
    databaseUrl: undefined,
    env: {}, // no DATABASE_URL in env
  });

  assert.notStrictEqual(exitCode, 0);
  assert.strictEqual(exitCode, 2);
  expect(stderr.join('\n')).toContain('DATABASE_URL is required');
  assert.strictEqual((stdout).length, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// G6: --database-url flag overrides env
// ─────────────────────────────────────────────────────────────────────────────

test('G6: --database-url flag overrides env DATABASE_URL', async () => {
  const { stdout, stderr, exitCode } = await runCapture({
    handle: 'sandrinio',
    databaseUrl: DB_URL, // valid flag
    env: { DATABASE_URL: 'postgres://wrong-host:5432/x' }, // env would fail
  });

  assert.strictEqual(exitCode, 0);
  expect(stdout.join('\n')).toContain("Bootstrapped root admin 'sandrinio'.");
  assert.strictEqual((stderr).length, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// G7: Unreachable database errors cleanly (exit 3)
// ─────────────────────────────────────────────────────────────────────────────

test('G7: unreachable database exits with code 3', async () => {
  const { stdout, stderr, exitCode } = await runCapture({
    handle: 'sandrinio',
    databaseUrl: 'postgres://user:s3cr3t@nowhere.invalid:5432/x',
  });

  assert.strictEqual(exitCode, 3);
  expect(stderr.join('\n')).toContain('cannot reach database');
  assert.strictEqual((stdout).length, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// G8: Invalid handle rejected before DB round-trip
// ─────────────────────────────────────────────────────────────────────────────

test('G8: invalid handle rejected before DB round-trip (pgClientFactory never called)', async () => {
  const pgClientFactory = mock.fn();

  const { stderr, exitCode } = await runCapture({
    handle: 'not a handle', // has spaces — invalid
    databaseUrl: DB_URL,
    pgClientFactory,
  });

  assert.notStrictEqual(exitCode, 0);
  expect(stderr.join('\n')).toContain('is not a valid GitHub handle');
  assert.strictEqual(pgClientFactory.mock.calls.length, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// G9: DATABASE_URL password is scrubbed from error output
// ─────────────────────────────────────────────────────────────────────────────

test('G9: DATABASE_URL password scrubbed from error output', async () => {
  const { stderr, exitCode } = await runCapture({
    handle: 'sandrinio',
    databaseUrl: 'postgres://user:s3cr3t@nowhere.invalid:5432/x',
  });

  assert.strictEqual(exitCode, 3);
  const stderrText = stderr.join('\n');
  assert.ok(String(stderrText).includes('cannot reach database'));
  // Password must not appear
  assert.ok(!String(stderrText).includes('s3cr3t'));
});

// ─────────────────────────────────────────────────────────────────────────────
// Handle regex unit tests (U1-U10)
// ─────────────────────────────────────────────────────────────────────────────

describe('handle validation (isValidHandle)', () => {
  // Valid handles
  test('U1: single letter handle is valid', () => {
    expect(isValidHandle('a')).toBe(true);
  });

  test('U2: hyphenated handle is valid', () => {
    expect(isValidHandle('a-b')).toBe(true);
  });

  test('U3: alphanumeric handle is valid', () => {
    expect(isValidHandle('A1')).toBe(true);
  });

  test('U4: complex valid handle', () => {
    expect(isValidHandle('a-b-c-1')).toBe(true);
  });

  test('U5: 39-char handle (max valid) is valid', () => {
    // 1 start char + 38 subsequent = 39 total
    expect(isValidHandle('a' + 'b'.repeat(38))).toBe(true);
  });

  // Invalid handles
  test('U6: 40-char handle (too long) is rejected', () => {
    // 1 + 39 = 40 chars — exceeds 39 limit
    expect(isValidHandle('a' + 'b'.repeat(39))).toBe(false);
  });

  test('U7: leading hyphen is rejected', () => {
    expect(isValidHandle('-leading')).toBe(false);
  });

  test('U8: trailing hyphen is rejected', () => {
    // GitHub does not allow trailing hyphens. Our regex enforces alphanumeric
    // at both start and end for handles longer than 1 char.
    expect(isValidHandle('trailing-')).toBe(false);
  });

  test('U9: handle with space is rejected', () => {
    expect(isValidHandle('has space')).toBe(false);
  });

  test('U10: empty string is rejected', () => {
    expect(isValidHandle('')).toBe(false);
  });

  test('U11: all-hyphens handle is rejected', () => {
    expect(isValidHandle('---')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// scrubPassword unit test
// ─────────────────────────────────────────────────────────────────────────────

describe('scrubPassword', () => {
  test('scrubs password from postgres:// URL in error messages', () => {
    const msg = 'connect ECONNREFUSED: postgres://user:s3cr3t@localhost:5432/db';
    const scrubbed = scrubPassword(msg);
    assert.ok(!String(scrubbed).includes('s3cr3t'));
    assert.ok(String(scrubbed).includes('postgres://user:***@'));
  });

  test('scrubs postgresql:// URLs too', () => {
    const msg = 'error: postgresql://admin:mypassword@db.example.com:5432/cleargate';
    const scrubbed = scrubPassword(msg);
    assert.ok(!String(scrubbed).includes('mypassword'));
    assert.ok(String(scrubbed).includes('postgresql://admin:***@'));
  });

  test('passes through strings without postgres URLs unchanged', () => {
    const msg = 'some other error message';
    expect(scrubPassword(msg)).toBe(msg);
  });
});
