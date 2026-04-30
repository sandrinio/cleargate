/**
 * admin-url.ts — STORY-023-04
 *
 * Resolves the ClearGate admin UI base URL with optional project-scoped sub-path.
 *
 * Priority order:
 *  1. CLEARGATE_ADMIN_URL env var (highest)
 *  2. Default: https://admin.cleargate.soula.ge/
 *
 * Optional project suffix: if ~/.cleargate/config.json contains `project_id`,
 * appends `/projects/<project_id>` when no explicit `path` argument is given.
 *
 * NOTE: intentionally does NOT use loadConfig() from config.ts — that schema is
 * .strict() and does not include project_id. We read the raw JSON file directly
 * to pluck project_id without triggering a Zod strict-mode validation error.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const DEFAULT_BASE = 'https://admin.cleargate.soula.ge/';

export interface AdminUrlOpts {
  /** Inject a custom env-var map (default: process.env). Useful in tests. */
  env?: NodeJS.ProcessEnv;
  /**
   * Inject a custom config reader (default: reads ~/.cleargate/config.json).
   * Must return the parsed JSON object (or throw on failure — callers catch).
   */
  configReader?: () => unknown;
}

/**
 * Returns the admin UI URL, optionally scoped to a project or an explicit sub-path.
 *
 * @param path  Optional URL sub-path (e.g. "/items"). When provided, overrides the
 *              project-scoped default. Leading slash is normalised — the return value
 *              always has exactly one slash between base and path.
 * @param opts  Optional injection seams for testing.
 */
export function adminUrl(urlPath?: string, opts?: AdminUrlOpts): string {
  const env = opts?.env ?? process.env;

  // Resolve base URL from env or default; normalise trailing slash.
  const rawBase = env['CLEARGATE_ADMIN_URL'] ?? DEFAULT_BASE;
  const base = rawBase.endsWith('/') ? rawBase : rawBase + '/';

  // Explicit path argument takes precedence over project-scoped default.
  if (urlPath !== undefined) {
    const suffix = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
    return base + suffix;
  }

  // Try to read project_id from config and append project-scoped sub-path.
  try {
    const cfg = opts?.configReader ? opts.configReader() : readLocalConfig();
    const projectId =
      cfg !== null &&
      cfg !== undefined &&
      typeof cfg === 'object' &&
      'project_id' in cfg
        ? (cfg as Record<string, unknown>)['project_id']
        : undefined;
    if (typeof projectId === 'string' && projectId.length > 0) {
      return base + 'projects/' + projectId;
    }
  } catch {
    // Config read or parse failure — fall back silently; no stderr, no throw.
  }

  return base;
}

/**
 * Reads ~/.cleargate/config.json directly (raw JSON, no Zod validation).
 * Returns null when the home directory is unavailable or the file does not exist.
 * Throws on JSON parse errors so the caller's catch block can fall back.
 */
function readLocalConfig(): unknown {
  const home = os.homedir();
  if (!home) return null;

  const configPath = path.join(home, '.cleargate', 'config.json');
  const raw = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(raw);
}
