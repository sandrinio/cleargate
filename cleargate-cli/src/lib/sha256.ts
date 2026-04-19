/**
 * sha256.ts — STORY-009-01
 *
 * Deterministic SHA256 hasher with cross-platform content normalization.
 * Node built-ins only: crypto, fs/promises, path.
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Hash normalized content (string or Buffer) — 64 hex chars.
 *
 * Normalization steps applied in order:
 *  1. Convert Buffer to UTF-8 string.
 *  2. Strip leading BOM (U+FEFF).
 *  3. Normalize CRLF → LF.
 *  4. Enforce trailing newline (append `\n` if missing).
 */
export function hashNormalized(content: string | Buffer): string {
  let text: string =
    Buffer.isBuffer(content) ? content.toString('utf-8') : content;

  // 1. Strip leading BOM
  if (text.startsWith('\ufeff')) {
    text = text.slice(1);
  }

  // 2. CRLF → LF
  text = text.replace(/\r\n/g, '\n');

  // 3. Enforce trailing newline
  if (!text.endsWith('\n')) {
    text += '\n';
  }

  return createHash('sha256').update(text, 'utf-8').digest('hex');
}

/**
 * Read a file, normalize its content, and return the SHA256 hex digest.
 */
export async function hashFile(filePath: string): Promise<string> {
  const raw = await readFile(filePath);
  return hashNormalized(raw);
}

/**
 * Return the first 8 hex characters of a full SHA256 digest for human-readable output.
 */
export function shortHash(full: string): string {
  return full.slice(0, 8);
}
