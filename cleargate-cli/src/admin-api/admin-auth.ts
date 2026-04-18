/**
 * Loads an admin JWT for use with cleargate-admin CLI commands.
 *
 * Load order:
 *  1. CLEARGATE_ADMIN_TOKEN env var (wins immediately — file is not read)
 *  2. ~/.cleargate/admin-auth.json (shape: { version: 1, token: string })
 *
 * DISTINCT from FileTokenStore: that file holds user profile → refresh-token maps.
 * This file holds a single admin JWT acquired out-of-band via dev-issue-token.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { z } from 'zod';

export const AdminAuthFileSchema = z
  .object({
    version: z.literal(1),
    token: z.string().min(1),
  })
  .strict();

export interface LoadAdminAuthOptions {
  env?: NodeJS.ProcessEnv;
  filePath?: string;
  homedir?: () => string;
  warn?: (msg: string) => void;
}

export interface AdminAuth {
  token: string;
  source: 'env' | 'file';
}

const MISSING_TOKEN_ERROR =
  'No admin token. Set CLEARGATE_ADMIN_TOKEN or write ~/.cleargate/admin-auth.json (chmod 600). See README §admin-jwt.';

export function loadAdminAuth(opts?: LoadAdminAuthOptions): AdminAuth {
  const env = opts?.env ?? process.env;
  const warn = opts?.warn ?? ((msg: string) => process.stderr.write(msg + '\n'));

  // Env wins — file is not read at all when env is set
  const envToken = env['CLEARGATE_ADMIN_TOKEN'];
  if (envToken) {
    return { token: envToken, source: 'env' };
  }

  // Resolve file path
  const homedirFn = opts?.homedir ?? os.homedir;
  const filePath =
    opts?.filePath ?? path.join(homedirFn(), '.cleargate', 'admin-auth.json');

  // Try file
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(MISSING_TOKEN_ERROR);
    }
    throw new Error(`Failed to read admin-auth file at ${filePath}: ${String(err)}`);
  }

  // Check file permissions (warn if too permissive)
  try {
    const stat = fs.statSync(filePath);
    const mode = stat.mode & 0o777;
    if (mode & 0o077) {
      warn(
        `cleargate-admin: warning: ${filePath} is group/world readable (mode ${(mode).toString(8).padStart(3, '0')}). Run: chmod 600 ${filePath}`,
      );
    }
  } catch {
    // If we can't stat the file, ignore — the read already succeeded
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Failed to parse admin-auth file at ${filePath}: invalid JSON`);
  }

  // Validate with strict schema
  const result = AdminAuthFileSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Invalid admin-auth file at ${filePath}: ${result.error.message}`,
    );
  }

  return { token: result.data.token, source: 'file' };
}
