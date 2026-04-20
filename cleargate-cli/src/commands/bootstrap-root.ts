/**
 * `cleargate admin bootstrap-root <handle>` — seed the first root admin.
 *
 * Idempotent: running the same handle twice is safe. Provides a `--force` flag
 * to either promote an existing non-root user or insert a second root when one
 * already exists.
 *
 * Exit codes:
 *  0 — success (including idempotent no-op)
 *  1 — validation error (bad handle, second-root guard refused)
 *  2 — missing DATABASE_URL
 *  3 — connection / query failure
 *
 * DATABASE_URL password is scrubbed from all error output.
 *
 * STORY-011-03.
 */

import pg from 'pg';

// ─────────────────────────────────────────────────────────────────────────────
// Handle validation
// ─────────────────────────────────────────────────────────────────────────────

// GitHub handle grammar: starts with alphanumeric, ends with alphanumeric,
// allows hyphens in the middle, max 39 chars total.
// Single-char handles (no middle section) are allowed.
// Trailing hyphens are rejected by requiring the last char to be alphanumeric
// when the handle is longer than 1 char.
const HANDLE_RE = /^[A-Za-z0-9]([A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

export function isValidHandle(handle: string): boolean {
  return HANDLE_RE.test(handle);
}

// ─────────────────────────────────────────────────────────────────────────────
// Password scrubber
// ─────────────────────────────────────────────────────────────────────────────

const SCRUB = /(postgres(?:ql)?:\/\/[^:/@]+):[^@/]+@/gi;

export function scrubPassword(s: string): string {
  return s.replace(SCRUB, '$1:***@');
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Minimal pg client surface needed by this handler. */
export interface PgClientLike {
  // connect() returns Promise<void> or Promise<Client> depending on pg version.
  // We accept either by using Promise<unknown>.
  connect(): Promise<unknown>;
  query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  end(): Promise<void>;
}

export interface BootstrapRootOptions {
  handle: string;
  databaseUrl?: string;
  force?: boolean;
  env?: NodeJS.ProcessEnv;
  stdout?: (s: string) => void;
  stderr?: (s: string) => void;
  exit?: (code: number) => never;
  /** Test seam — factory receives the resolved connection string */
  pgClientFactory?: (url: string) => PgClientLike;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal result — avoids exception-based control flow bleeding into the
// SQL error catch block (exit seam throws in tests; we must not catch those).
// ─────────────────────────────────────────────────────────────────────────────

interface SqlResult {
  exitCode: number;
  kind: 'stdout' | 'stderr';
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────

export async function bootstrapRootHandler(opts: BootstrapRootOptions): Promise<void> {
  const env = opts.env ?? process.env;
  const stdoutFn = opts.stdout ?? ((s: string) => process.stdout.write(s + '\n'));
  const stderrFn = opts.stderr ?? ((s: string) => process.stderr.write(s + '\n'));
  const exitFn = opts.exit ?? ((code: number): never => process.exit(code));
  const force = opts.force ?? false;

  // ── 1. Handle validation ────────────────────────────────────────────────────
  const { handle } = opts;
  if (!isValidHandle(handle)) {
    stderrFn(`cleargate: error: '${handle}' is not a valid GitHub handle`);
    return exitFn(1);
  }

  // ── 2. Resolve DATABASE_URL ─────────────────────────────────────────────────
  const url = opts.databaseUrl ?? env['DATABASE_URL'];
  if (!url) {
    stderrFn('cleargate: error: DATABASE_URL is required (set env or pass --database-url)');
    return exitFn(2);
  }

  // ── 3. Connect ──────────────────────────────────────────────────────────────
  const clientFactory =
    opts.pgClientFactory ??
    ((connStr: string): PgClientLike => new pg.Client({ connectionString: connStr }));

  const client = clientFactory(url);

  try {
    await client.connect();
  } catch (err) {
    const raw = err instanceof Error ? `${err.message} ${err.stack ?? ''}` : String(err);
    stderrFn(`cleargate: error: cannot reach database (${scrubPassword(raw.trim())})`);
    return exitFn(3);
  }

  // ── 4. Run SQL (returns a SqlResult, never throws for logic branches) ────────
  // By returning a value rather than calling exitFn() inside runSql(), we ensure
  // that if the test exit-seam throws, the throw propagates out of the whole
  // handler rather than being caught here as a "database error".
  let result: SqlResult;
  let sqlError: unknown = undefined;

  try {
    result = await runSql(client, handle, force);
  } catch (err) {
    sqlError = err;
    result = { exitCode: 3, kind: 'stderr', message: '' }; // filled below
  }

  // ── 5. Close connection ─────────────────────────────────────────────────────
  try {
    await client.end();
  } catch {
    // ignore cleanup error
  }

  // ── 6. Handle SQL error ─────────────────────────────────────────────────────
  if (sqlError !== undefined) {
    const err = sqlError;
    const raw = err instanceof Error ? `${err.message} ${err.stack ?? ''}` : String(err);
    stderrFn(`cleargate: error: cannot reach database (${scrubPassword(raw.trim())})`);
    return exitFn(3);
  }

  // ── 7. Emit message and exit ────────────────────────────────────────────────
  if (result!.kind === 'stdout') {
    stdoutFn(result!.message);
  } else {
    stderrFn(result!.message);
  }
  return exitFn(result!.exitCode);
}

// ─────────────────────────────────────────────────────────────────────────────
// SQL logic — returns SqlResult, never calls exitFn
// ─────────────────────────────────────────────────────────────────────────────

async function runSql(
  client: PgClientLike,
  handle: string,
  force: boolean,
): Promise<SqlResult> {
  await client.query('BEGIN');

  // Step 1: does the handle already exist?
  const existing = await client.query(
    'SELECT id, is_root FROM admin_users WHERE github_handle = $1',
    [handle],
  );

  if (existing.rows.length > 0) {
    const row = existing.rows[0]!;

    if (row['is_root'] === true) {
      // Branch A: already a root admin — idempotent no-op
      await client.query('COMMIT');
      return {
        exitCode: 0,
        kind: 'stdout',
        message: `Root admin '${handle}' already exists; no change.`,
      };
    }

    // Row exists but is_root=false
    if (force) {
      // Branch B: promote
      await client.query(
        'UPDATE admin_users SET is_root = true WHERE github_handle = $1',
        [handle],
      );
      await client.query('COMMIT');
      return {
        exitCode: 0,
        kind: 'stdout',
        message: `Promoted '${handle}' to root admin.`,
      };
    }

    // Branch C: existing non-root, no --force
    await client.query('ROLLBACK');
    return {
      exitCode: 1,
      kind: 'stderr',
      message: `cleargate: error: '${handle}' exists but is not a root admin; pass --force to promote`,
    };
  }

  // No row for this handle — check if another root exists
  if (!force) {
    const rootCount = await client.query(
      'SELECT count(*) AS cnt FROM admin_users WHERE is_root = true',
    );
    const cnt = Number((rootCount.rows[0] as { cnt: string })['cnt'] ?? 0);

    if (cnt >= 1) {
      // Branch D: refuse second root without --force
      await client.query('ROLLBACK');
      return {
        exitCode: 1,
        kind: 'stderr',
        message:
          'cleargate: error: refusing to create a second root admin; pass --force to override',
      };
    }
  }

  // Branch E: insert (first root, or --force allows a second root)
  await client.query(
    `INSERT INTO admin_users (github_handle, is_root)
     VALUES ($1, true)
     ON CONFLICT (github_handle) DO UPDATE SET is_root = EXCLUDED.is_root`,
    [handle],
  );
  await client.query('COMMIT');
  return {
    exitCode: 0,
    kind: 'stdout',
    message: `Bootstrapped root admin '${handle}'.`,
  };
}
