/**
 * merge-helper.ts — STORY-010-03
 *
 * Three-way merge prompt for `cleargate sync` content-content conflicts.
 * Reuses EPIC-009 primitives: renderInlineDiff (merge-ui.ts), openInEditor +
 * containsConflictMarkers (editor.ts).
 *
 * Adds the fourth [a]bort branch on top of merge-ui's k/t/e set.
 * Never writes to the caller's file — returns MergeResult; caller applies.
 *
 * No top-level await (FLASHCARD #tsup #cjs #esm).
 */

import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { renderInlineDiff } from './merge-ui.js';
import { openInEditor, containsConflictMarkers } from './editor.js';

// ─── Public types ─────────────────────────────────────────────────────────────

export type MergeResolution = 'keep' | 'take' | 'edited' | 'aborted';

export interface MergeResult {
  resolution: MergeResolution;
  body: string;  // the chosen/edited body
}

export interface PromptThreeWayMergeOpts {
  local: string;
  remote: string;
  base: string;       // merge-base body; used to construct git-merge-markers on [e]dit
  itemId: string;     // for diff header + temp-file name
  stdin?: NodeJS.ReadableStream;
  stdout?: (s: string) => void;
  editor?: string;    // override $EDITOR for tests
  now?: () => string; // temp-file name determinism seam
}

// ─── Four-choice prompt (extends merge-ui's k/t/e with [a]bort) ──────────────

type FourChoice = 'k' | 't' | 'e' | 'a';

/**
 * promptFourChoice — renders the four-option prompt and reads one line from stdin.
 * Ctrl-C (stream 'close' without data) and 'a' both resolve to 'a' (abort).
 */
function promptFourChoice(opts: {
  stdin: NodeJS.ReadableStream;
  stdout: (s: string) => void;
}): Promise<FourChoice> {
  const { stdin, stdout } = opts;

  stdout('[k]eep mine / [t]ake theirs / [e]dit in $EDITOR / [a]bort: ');

  return new Promise<FourChoice>((resolve) => {
    let buf = '';

    const onData = (chunk: Buffer | string) => {
      buf += typeof chunk === 'string' ? chunk : chunk.toString('utf-8');
      const newline = buf.indexOf('\n');
      if (newline !== -1) {
        cleanup();
        const answer = buf.slice(0, newline).trim().toLowerCase();
        if (answer === 'k' || answer === 't' || answer === 'e' || answer === 'a') {
          resolve(answer as FourChoice);
        } else {
          stdout(`Unknown choice '${answer}'; treating as [a]bort.\n`);
          resolve('a');
        }
      }
    };

    // Ctrl-C or stdin close without data → abort
    const onClose = () => {
      cleanup();
      resolve('a');
    };

    const onEnd = () => {
      cleanup();
      resolve('a');
    };

    const onError = () => {
      cleanup();
      resolve('a');
    };

    function cleanup() {
      stdin.removeListener('data', onData);
      stdin.removeListener('close', onClose);
      stdin.removeListener('end', onEnd);
      stdin.removeListener('error', onError);
    }

    stdin.on('data', onData);
    stdin.once('close', onClose);
    stdin.once('end', onEnd);
    stdin.once('error', onError);
  });
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * promptThreeWayMerge — interactive three-way merge UX.
 *
 * Flow:
 *  1. Renders unified diff of local vs remote.
 *  2. Prompts [k]eep / [t]ake / [e]dit / [a]bort.
 *  3. On [e]dit: writes a temp file with git-merge-marker content, spawns $EDITOR,
 *     re-reads on close, re-prompts if conflict markers remain.
 *     Temp file is always unlinked (finally block).
 *  4. On [a]bort or Ctrl-C: returns { resolution: 'aborted', body: local }.
 *  5. Never writes to caller's file.
 */
export async function promptThreeWayMerge(opts: PromptThreeWayMergeOpts): Promise<MergeResult> {
  const {
    local,
    remote,
    itemId,
    stdin = process.stdin,
    editor,
  } = opts;

  const stdout = opts.stdout ?? ((s: string) => process.stdout.write(s));
  const now = opts.now ?? (() => Date.now().toString());

  // 1. Render diff
  const patch = renderInlineDiff(local, remote, itemId);
  stdout(`\n[merge] ${itemId}\n`);
  stdout(patch + '\n');

  // 2–3. Prompt loop (re-prompt if editor leaves unresolved markers)
  for (;;) {
    const choice = await promptFourChoice({ stdin, stdout });

    switch (choice) {
      case 'k':
        return { resolution: 'keep', body: local };

      case 't':
        return { resolution: 'take', body: remote };

      case 'a':
        return { resolution: 'aborted', body: local };

      case 'e': {
        const tmpFile = path.join(os.tmpdir(), `cleargate-merge-${itemId}-${now()}.md`);
        const markerContent = `<<<<<<< local\n${local}\n=======\n${remote}\n>>>>>>> remote\n`;

        try {
          await fs.writeFile(tmpFile, markerContent, 'utf-8');

          await openInEditor(tmpFile, { editor: editor ?? process.env['EDITOR'] ?? 'vi' });

          const edited = await fs.readFile(tmpFile, 'utf-8');

          if (containsConflictMarkers(edited)) {
            stdout('File still contains conflict markers — please resolve all conflicts.\n');
            // re-prompt
            continue;
          }

          return { resolution: 'edited', body: edited };
        } finally {
          // Always clean up temp file even on error
          await fs.unlink(tmpFile).catch(() => {/* already gone — ignore */});
        }
      }
    }
  }
}
