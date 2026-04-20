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

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import pg from 'pg';
import { bootstrapRootHandler, isValidHandle, scrubPassword } from '../../src/commands/bootstrap-root.js';

// ─────────────────────────────────────────────────────────────────────────────
// Real Postgres setup — same DB as MCP tests
// ─────────────────────────────────────────────────────────────────────────────

const DB_URL =
  process.env['DATABASE_URL'] ??
  'postgres://cleargate:dev-only-password@localhost:5432/cleargate';

let pool: pg.Pool;

beforeAll(async () => {
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

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  // Clean slate before each test — remove only test-inserted rows to avoid
  // touching FK-constrained production data in a shared DB. We use a reserved
  // test-handle prefix so cleanup is safe.
  await pool.query(`DELETE FROM admin_users WHERE github_handle LIKE 'test-%' OR github_handle IN ('sandrinio', 'another-user', 'first-root', 'second-user')`);
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

it('G1: empty table creates first root admin', async () => {
  const { stdout, stderr, exitCode } = await runCapture({
    handle: 'sandrinio',
    databaseUrl: DB_URL,
  });

  expect(exitCode).toBe(0);
  expect(stdout.join('\n')).toContain("Bootstrapped root admin 'sandrinio'.");
  expect(stderr).toHaveLength(0);

  const row = await getAdmin('sandrinio');
  expect(row).toBeDefined();
  expect(row!.is_root).toBe(true);

  const count = await countAdmin('sandrinio');
  expect(count).toBe(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// G2: Same handle re-run is a no-op
// ─────────────────────────────────────────────────────────────────────────────

it('G2: same handle re-run is a no-op (idempotent)', async () => {
  await insertAdmin('sandrinio', true);

  const { stdout, stderr, exitCode } = await runCapture({
    handle: 'sandrinio',
    databaseUrl: DB_URL,
  });

  expect(exitCode).toBe(0);
  expect(stdout.join('\n')).toContain("Root admin 'sandrinio' already exists; no change.");
  expect(stderr).toHaveLength(0);

  // Still exactly one row
  expect(await countAdmin('sandrinio')).toBe(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// G3: Refuse second root without --force
// ─────────────────────────────────────────────────────────────────────────────

it('G3: refuses to create second root without --force', async () => {
  await insertAdmin('sandrinio', true); // existing root

  const { stdout, stderr, exitCode } = await runCapture({
    handle: 'another-user',
    databaseUrl: DB_URL,
    force: false,
  });

  expect(exitCode).not.toBe(0);
  expect(stderr.join('\n')).toContain(
    'refusing to create a second root admin; pass --force to override',
  );
  expect(stdout).toHaveLength(0);

  // No row for another-user
  expect(await countAdmin('another-user')).toBe(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// G4: --force promotes existing non-root admin
// ─────────────────────────────────────────────────────────────────────────────

it('G4: --force promotes existing non-root user to root', async () => {
  await insertAdmin('another-user', false);

  const { stdout, stderr, exitCode } = await runCapture({
    handle: 'another-user',
    databaseUrl: DB_URL,
    force: true,
  });

  expect(exitCode).toBe(0);
  expect(stdout.join('\n')).toContain("Promoted 'another-user' to root admin.");
  expect(stderr).toHaveLength(0);

  const row = await getAdmin('another-user');
  expect(row!.is_root).toBe(true);
});

// ─────────────────────────────────────────────────────────────────────────────
// G5: Missing DATABASE_URL errors clearly
// ─────────────────────────────────────────────────────────────────────────────

it('G5: missing DATABASE_URL errors with clear message', async () => {
  const { stdout, stderr, exitCode } = await runCapture({
    handle: 'sandrinio',
    databaseUrl: undefined,
    env: {}, // no DATABASE_URL in env
  });

  expect(exitCode).not.toBe(0);
  expect(exitCode).toBe(2);
  expect(stderr.join('\n')).toContain('DATABASE_URL is required');
  expect(stdout).toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// G6: --database-url flag overrides env
// ─────────────────────────────────────────────────────────────────────────────

it('G6: --database-url flag overrides env DATABASE_URL', async () => {
  const { stdout, stderr, exitCode } = await runCapture({
    handle: 'sandrinio',
    databaseUrl: DB_URL, // valid flag
    env: { DATABASE_URL: 'postgres://wrong-host:5432/x' }, // env would fail
  });

  expect(exitCode).toBe(0);
  expect(stdout.join('\n')).toContain("Bootstrapped root admin 'sandrinio'.");
  expect(stderr).toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// G7: Unreachable database errors cleanly (exit 3)
// ─────────────────────────────────────────────────────────────────────────────

it('G7: unreachable database exits with code 3', async () => {
  const { stdout, stderr, exitCode } = await runCapture({
    handle: 'sandrinio',
    databaseUrl: 'postgres://user:s3cr3t@nowhere.invalid:5432/x',
  });

  expect(exitCode).toBe(3);
  expect(stderr.join('\n')).toContain('cannot reach database');
  expect(stdout).toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// G8: Invalid handle rejected before DB round-trip
// ─────────────────────────────────────────────────────────────────────────────

it('G8: invalid handle rejected before DB round-trip (pgClientFactory never called)', async () => {
  const pgClientFactory = vi.fn();

  const { stderr, exitCode } = await runCapture({
    handle: 'not a handle', // has spaces — invalid
    databaseUrl: DB_URL,
    pgClientFactory,
  });

  expect(exitCode).not.toBe(0);
  expect(stderr.join('\n')).toContain('is not a valid GitHub handle');
  expect(pgClientFactory).not.toHaveBeenCalled();
});

// ─────────────────────────────────────────────────────────────────────────────
// G9: DATABASE_URL password is scrubbed from error output
// ─────────────────────────────────────────────────────────────────────────────

it('G9: DATABASE_URL password scrubbed from error output', async () => {
  const { stderr, exitCode } = await runCapture({
    handle: 'sandrinio',
    databaseUrl: 'postgres://user:s3cr3t@nowhere.invalid:5432/x',
  });

  expect(exitCode).toBe(3);
  const stderrText = stderr.join('\n');
  expect(stderrText).toContain('cannot reach database');
  // Password must not appear
  expect(stderrText).not.toContain('s3cr3t');
});

// ─────────────────────────────────────────────────────────────────────────────
// Handle regex unit tests (U1-U10)
// ─────────────────────────────────────────────────────────────────────────────

describe('handle validation (isValidHandle)', () => {
  // Valid handles
  it('U1: single letter handle is valid', () => {
    expect(isValidHandle('a')).toBe(true);
  });

  it('U2: hyphenated handle is valid', () => {
    expect(isValidHandle('a-b')).toBe(true);
  });

  it('U3: alphanumeric handle is valid', () => {
    expect(isValidHandle('A1')).toBe(true);
  });

  it('U4: complex valid handle', () => {
    expect(isValidHandle('a-b-c-1')).toBe(true);
  });

  it('U5: 39-char handle (max valid) is valid', () => {
    // 1 start char + 38 subsequent = 39 total
    expect(isValidHandle('a' + 'b'.repeat(38))).toBe(true);
  });

  // Invalid handles
  it('U6: 40-char handle (too long) is rejected', () => {
    // 1 + 39 = 40 chars — exceeds 39 limit
    expect(isValidHandle('a' + 'b'.repeat(39))).toBe(false);
  });

  it('U7: leading hyphen is rejected', () => {
    expect(isValidHandle('-leading')).toBe(false);
  });

  it('U8: trailing hyphen is rejected', () => {
    // GitHub does not allow trailing hyphens. Our regex enforces alphanumeric
    // at both start and end for handles longer than 1 char.
    expect(isValidHandle('trailing-')).toBe(false);
  });

  it('U9: handle with space is rejected', () => {
    expect(isValidHandle('has space')).toBe(false);
  });

  it('U10: empty string is rejected', () => {
    expect(isValidHandle('')).toBe(false);
  });

  it('U11: all-hyphens handle is rejected', () => {
    expect(isValidHandle('---')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// scrubPassword unit test
// ─────────────────────────────────────────────────────────────────────────────

describe('scrubPassword', () => {
  it('scrubs password from postgres:// URL in error messages', () => {
    const msg = 'connect ECONNREFUSED: postgres://user:s3cr3t@localhost:5432/db';
    const scrubbed = scrubPassword(msg);
    expect(scrubbed).not.toContain('s3cr3t');
    expect(scrubbed).toContain('postgres://user:***@');
  });

  it('scrubs postgresql:// URLs too', () => {
    const msg = 'error: postgresql://admin:mypassword@db.example.com:5432/cleargate';
    const scrubbed = scrubPassword(msg);
    expect(scrubbed).not.toContain('mypassword');
    expect(scrubbed).toContain('postgresql://admin:***@');
  });

  it('passes through strings without postgres URLs unchanged', () => {
    const msg = 'some other error message';
    expect(scrubPassword(msg)).toBe(msg);
  });
});
