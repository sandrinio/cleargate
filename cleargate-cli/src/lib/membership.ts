/**
 * membership.ts — CR-011
 *
 * Single source of truth for ClearGate membership state detection.
 * Cheap-path: reads ~/.cleargate/auth.json, decodes the stored refresh JWT
 * (introspection only — no signature verification), checks expiry.
 *
 * Returns 'pre-member' on: file missing | malformed JSON | malformed JWT | exp <= now.
 * Returns 'member' with decoded claims otherwise.
 *
 * No network call. Used by whoami --json, preAction gating hook, doctor --session-start banner.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Buffer } from 'node:buffer';

// ─── Public types ─────────────────────────────────────────────────────────────

export type MembershipState =
  | { state: 'member'; email: string; project_id: string; expires_at: string }
  | { state: 'pre-member' };

export interface GetMembershipStateOpts {
  /** Profile name (default: 'default'). */
  profile?: string;
  /** Test seam: override the ~/.cleargate home directory. */
  cleargateHome?: string;
  /** Test seam: clock for expiry comparison (ms epoch). */
  now?: () => number;
}

// ─── JWT decode helper (extracted from whoami.ts) ─────────────────────────────

/**
 * Decode a JWT payload without verifying the signature (introspection only).
 * Returns null if the token is malformed.
 */
export function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  const parts = jwt.split('.');
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(parts[1]!, 'base64url').toString('utf8');
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ─── Auth file schema (mirrors src/auth/file-store.ts without Zod) ────────────

interface AuthFile {
  version: number;
  profiles: Record<string, { refreshToken: string }>;
}

function readAuthFile(authFilePath: string): AuthFile | null {
  let raw: string;
  try {
    raw = fs.readFileSync(authFilePath, 'utf8');
  } catch {
    // ENOENT or permission error → pre-member
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      (parsed as Record<string, unknown>)['version'] !== 1 ||
      typeof (parsed as Record<string, unknown>)['profiles'] !== 'object'
    ) {
      return null;
    }
    return parsed as AuthFile;
  } catch {
    return null;
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Detect membership state locally.
 *
 * Algorithm:
 *  1. Resolve auth file path: <cleargateHome>/auth.json  (default: ~/.cleargate/auth.json)
 *  2. Read & parse the file as an AuthFile { version, profiles }.
 *  3. Look up the profile's refreshToken.
 *  4. Decode the refreshToken as a JWT (base64url, no sig verify).
 *  5. Extract exp, sub (= email proxy), project_id.
 *  6. If exp <= now (ms) → pre-member.
 *  7. Otherwise → member.
 */
export function getMembershipState(opts?: GetMembershipStateOpts): MembershipState {
  const profile = opts?.profile ?? 'default';
  const nowMs = (opts?.now ?? Date.now)();

  // Resolve the auth file path
  const home = opts?.cleargateHome ?? path.join(os.homedir(), '.cleargate');
  const authFilePath = path.join(home, 'auth.json');

  // Read the auth file
  const authFile = readAuthFile(authFilePath);
  if (authFile === null) {
    return { state: 'pre-member' };
  }

  // Look up the profile
  const profileEntry = authFile.profiles[profile];
  if (!profileEntry || typeof profileEntry.refreshToken !== 'string') {
    return { state: 'pre-member' };
  }

  // Decode the stored refresh token as a JWT
  const claims = decodeJwtPayload(profileEntry.refreshToken);
  if (claims === null) {
    return { state: 'pre-member' };
  }

  // Check expiry (exp is in seconds per JWT spec)
  const exp = claims['exp'];
  if (typeof exp !== 'number' || !Number.isFinite(exp)) {
    return { state: 'pre-member' };
  }
  const expMs = exp * 1000;
  if (expMs <= nowMs) {
    return { state: 'pre-member' };
  }

  // Extract claims for member state
  // sub is the member UUID; we use it as the email proxy since the JWT
  // doesn't carry a separate email field (flashcard: sub = member UUID, not email).
  const sub = claims['sub'];
  const email = typeof sub === 'string' ? sub : '';
  const projectId = typeof claims['project_id'] === 'string' ? claims['project_id'] : '';
  const expiresAt = new Date(expMs).toISOString();

  return { state: 'member', email, project_id: projectId, expires_at: expiresAt };
}
