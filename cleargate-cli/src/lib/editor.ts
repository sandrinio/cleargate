/**
 * editor.ts — STORY-009-05
 *
 * Safely spawn $EDITOR for the `cleargate upgrade` edit-in-editor flow.
 * Uses child_process.spawn with stdio: 'inherit' — does NOT use execSync
 * (would block the event loop and prevent test injection).
 *
 * No top-level await (FLASHCARD #tsup #cjs #esm).
 */

import { spawn } from 'node:child_process';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Spawn $EDITOR for `filePath`, waiting for the editor process to exit.
 *
 * Returns the editor's exit code.
 * If `opts.editor` is provided, uses it instead of $EDITOR.
 * If neither is set, returns `{ exitCode: -1 }` with an error (handled by caller).
 *
 * Uses `stdio: 'inherit'` so the terminal is fully connected to the editor.
 * Do NOT use execSync — it blocks the event loop and breaks tests.
 */
export async function openInEditor(
  filePath: string,
  opts?: { editor?: string; env?: NodeJS.ProcessEnv }
): Promise<{ exitCode: number }> {
  const env = opts?.env ?? process.env;
  const editor = opts?.editor ?? env['EDITOR'] ?? env['VISUAL'];

  if (!editor) {
    throw new Error('$EDITOR not set; cannot [e]dit option. Set the EDITOR environment variable.');
  }

  return new Promise<{ exitCode: number }>((resolve, reject) => {
    const child = spawn(editor, [filePath], {
      stdio: 'inherit',
      env: { ...env },
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to start editor '${editor}': ${err.message}`));
    });

    child.on('close', (code) => {
      resolve({ exitCode: code ?? 0 });
    });
  });
}

/**
 * Return true if `content` contains unresolved conflict markers.
 *
 * Checks for any of:
 *   <<<<<<< ours
 *   =======
 *   >>>>>>> theirs
 */
export function containsConflictMarkers(content: string): boolean {
  return (
    content.includes('<<<<<<< ours') ||
    content.includes('>>>>>>> theirs') ||
    // Also catch generic git-style markers in case user merged manually
    /^<<<<<<< /m.test(content) ||
    /^>>>>>>> /m.test(content)
  );
}
