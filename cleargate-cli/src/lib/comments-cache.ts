/**
 * comments-cache.ts — STORY-010-06
 *
 * Atomic read/write for comment cache files at
 *   .cleargate/.comments-cache/<remote_id>.json
 *
 * Contents = raw RemoteComment[] array from cleargate_pull_comments.
 * Write is atomic via .tmp + rename (mirrors sync.ts:writeAtomic).
 *
 * No top-level await (FLASHCARD #tsup #cjs #esm).
 */

import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import type { RemoteComment } from './mcp-client.js';

// ── Cache directory ───────────────────────────────────────────────────────────

function cacheDir(projectRoot: string): string {
  return path.join(projectRoot, '.cleargate', '.comments-cache');
}

function cachePath(projectRoot: string, remoteId: string): string {
  return path.join(cacheDir(projectRoot), `${remoteId}.json`);
}

// ── Write ──────────────────────────────────────────────────────────────────────

/**
 * Atomically write a RemoteComment[] array to the cache for `remoteId`.
 * Creates the cache directory if absent.
 */
export async function writeCommentCache(
  projectRoot: string,
  remoteId: string,
  comments: RemoteComment[],
): Promise<void> {
  const dir = cacheDir(projectRoot);
  await fsPromises.mkdir(dir, { recursive: true });

  const filePath = cachePath(projectRoot, remoteId);
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  const content = JSON.stringify(comments, null, 2) + '\n';

  await fsPromises.writeFile(tmpPath, content, 'utf8');
  await fsPromises.rename(tmpPath, filePath);
}

// ── Read ───────────────────────────────────────────────────────────────────────

/**
 * Read cached comments for `remoteId`.
 * Returns null if the cache file is absent or contains malformed JSON.
 */
export async function readCommentCache(
  projectRoot: string,
  remoteId: string,
): Promise<RemoteComment[] | null> {
  const filePath = cachePath(projectRoot, remoteId);

  let raw: string;
  try {
    raw = await fsPromises.readFile(filePath, 'utf8');
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }

  try {
    return JSON.parse(raw) as RemoteComment[];
  } catch {
    return null;
  }
}
