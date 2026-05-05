/**
 * merge-ui.ts — STORY-009-05
 *
 * Diff renderer + 3-choice interactive prompt for `cleargate upgrade`.
 *
 * No top-level await (FLASHCARD #tsup #cjs #esm).
 */

import { createPatch } from 'diff';
import type { DriftState } from './manifest.js';

// ─── Public types ─────────────────────────────────────────────────────────────

export type MergeChoice = 'k' | 't' | 'e';

// ─── Diff renderer ────────────────────────────────────────────────────────────

/**
 * Render an inline unified diff of `ours` vs `theirs` for the given `filePath`.
 * Uses the `diff` npm package's `createPatch`.
 *
 * BUG-028: when `createPatch` produces no hunk lines (e.g. whitespace/EOL-only
 * divergences that the line-diff algorithm cannot surface), append a fallback
 * annotation so the user has a signal before choosing k/t/e.
 */
export function renderInlineDiff(ours: string, theirs: string, filePath: string): string {
  const patch = createPatch(filePath, ours, theirs, 'installed', 'upstream');

  // Detect empty-body patch: no lines starting with + or - (excluding +++ / --- headers).
  const hasHunkLines = patch
    .split('\n')
    .filter((l) => l.startsWith('+') || l.startsWith('-'))
    .filter((l) => !l.startsWith('+++') && !l.startsWith('---'))
    .length > 0;

  if (!hasHunkLines) {
    const ourBytes = Buffer.byteLength(ours, 'utf-8');
    const theirBytes = Buffer.byteLength(theirs, 'utf-8');
    const byteNote =
      ourBytes !== theirBytes
        ? `${Math.abs(theirBytes - ourBytes)} bytes changed`
        : 'same byte count';
    return patch + `(whitespace/EOL-only differences — ${byteNote})\n`;
  }

  return patch;
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

/**
 * Print file info + inline diff, then prompt the user for a merge choice.
 * Returns one of: 'k' (keep mine), 't' (take theirs), 'e' (edit in $EDITOR).
 *
 * Test seam: pass `stdin` to drive from a buffer instead of process.stdin.
 * Test seam: pass `stdout` to capture output instead of process.stdout.write.
 */
export async function promptMergeChoice(opts: {
  path: string;
  state: DriftState;
  ours: string;
  theirs: string;
  stdin?: NodeJS.ReadableStream;
  stdout?: (s: string) => void;
}): Promise<MergeChoice> {
  const { path: filePath, state, ours, theirs } = opts;
  const stdout = opts.stdout ?? ((s: string) => process.stdout.write(s));
  const stdin = opts.stdin ?? process.stdin;

  // Print file header
  stdout(`\n[merge] ${filePath}  state=${state}\n`);

  // Print diff
  const patch = renderInlineDiff(ours, theirs, filePath);
  stdout(patch + '\n');

  // Prompt
  stdout('[k]eep mine / [t]ake theirs / [e]dit in $EDITOR: ');

  return new Promise<MergeChoice>((resolve, reject) => {
    let buf = '';

    const onData = (chunk: Buffer | string) => {
      buf += typeof chunk === 'string' ? chunk : chunk.toString('utf-8');
      const newline = buf.indexOf('\n');
      if (newline !== -1) {
        const answer = buf.slice(0, newline).trim().toLowerCase();
        stdin.removeListener('data', onData);
        stdin.removeListener('error', onError);
        if (answer === 'k' || answer === 't' || answer === 'e') {
          resolve(answer as MergeChoice);
        } else {
          // Default to 'k' (keep mine) for unrecognised input
          stdout(`Unknown choice '${answer}'; defaulting to [k]eep mine.\n`);
          resolve('k');
        }
      }
    };

    const onError = (err: Error) => {
      stdin.removeListener('data', onData);
      reject(err);
    };

    stdin.on('data', onData);
    stdin.once('error', onError);
  });
}
