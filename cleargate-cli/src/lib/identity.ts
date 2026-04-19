/**
 * identity.ts — participant identity resolver.
 *
 * STORY-010-01: resolveIdentity precedence ladder + writeParticipant atomic write.
 *
 * Resolution order (highest-priority first):
 *   1. .cleargate/.participant.json
 *   2. CLEARGATE_USER env var
 *   3. git config user.email (via child_process.spawnSync — NOT simple-git; see flashcard #cli #simple-git #deps)
 *   4. "{username}@{hostname}" host fallback
 *
 * All external sources (env, git, host) are injectable as opts for test hermetics.
 * Do NOT reach into process.env / os.hostname() directly in the happy path.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as fsPromises from 'node:fs/promises';
import * as os from 'node:os';
import { spawnSync } from 'node:child_process';

// ── Types ─────────────────────────────────────────────────────────────────────

export type IdentitySource = 'participant-json' | 'env' | 'git' | 'host';

export interface Identity {
  email: string;
  source: IdentitySource;
}

export interface ParticipantFile {
  email: string;
  set_at: string;
  source: 'prompted' | 'inferred';
}

// ── Read participant file ─────────────────────────────────────────────────────

/**
 * Read .cleargate/.participant.json.
 * Returns null on ENOENT or malformed JSON — caller decides what to do.
 */
export function readParticipant(projectRoot: string): ParticipantFile | null {
  const filePath = path.join(projectRoot, '.cleargate', '.participant.json');
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as ParticipantFile;
  } catch {
    return null;
  }
}

// ── Write participant file ────────────────────────────────────────────────────

/**
 * Write .cleargate/.participant.json atomically (tmp + rename).
 * Creates .cleargate/ directory if it does not exist.
 */
export async function writeParticipant(
  projectRoot: string,
  email: string,
  source: 'prompted' | 'inferred',
  now: () => string = () => new Date().toISOString(),
): Promise<void> {
  const cleargateDir = path.join(projectRoot, '.cleargate');
  await fsPromises.mkdir(cleargateDir, { recursive: true });

  const filePath = path.join(cleargateDir, '.participant.json');
  const tmpPath = filePath + '.tmp.' + Date.now();

  const content: ParticipantFile = {
    email,
    set_at: now(),
    source,
  };

  await fsPromises.writeFile(tmpPath, JSON.stringify(content, null, 2) + '\n', 'utf8');
  await fsPromises.rename(tmpPath, filePath);
}

// ── Resolve identity ──────────────────────────────────────────────────────────

export interface ResolveIdentityOpts {
  /** Override process.env for test hermetics */
  env?: NodeJS.ProcessEnv;
  /** Override git config user.email resolution. Return null when git unavailable. */
  gitEmail?: () => string | null;
  /** Override os.hostname() */
  hostname?: () => string;
  /** Override os.userInfo().username */
  username?: () => string;
  /** Override new Date().toISOString() (unused here; reserved for callers) */
  now?: () => string;
}

/**
 * Resolve caller identity via precedence ladder.
 * All external lookups go through opts test seams — never reach process.env
 * or os.hostname() directly so tests can assert precedence without env pollution.
 */
export function resolveIdentity(
  projectRoot: string,
  opts: ResolveIdentityOpts = {},
): Identity {
  // 1. participant-json
  const participant = readParticipant(projectRoot);
  if (participant !== null && participant.email) {
    return { email: participant.email, source: 'participant-json' };
  }

  // 2. env
  const envValue = (opts.env ?? process.env)['CLEARGATE_USER'];
  if (envValue && envValue.trim()) {
    return { email: envValue.trim(), source: 'env' };
  }

  // 3. git
  const gitEmailFn =
    opts.gitEmail ??
    (() => {
      const result = spawnSync('git', ['config', 'user.email'], {
        encoding: 'utf8',
        timeout: 3000,
      });
      if (result.status === 0 && result.stdout) {
        const trimmed = result.stdout.trim();
        if (trimmed) return trimmed;
      }
      return null;
    });

  const gitEmail = gitEmailFn();
  if (gitEmail && gitEmail.trim()) {
    return { email: gitEmail.trim(), source: 'git' };
  }

  // 4. host fallback
  const hostnameFn = opts.hostname ?? (() => os.hostname());
  const usernameFn =
    opts.username ??
    (() => {
      try {
        return os.userInfo().username;
      } catch {
        return 'user';
      }
    });

  const hostname = hostnameFn();
  const username = usernameFn();
  return { email: `${username}@${hostname}`, source: 'host' };
}
