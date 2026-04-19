/**
 * merge-helper.test.ts — STORY-010-03
 *
 * 5 tests:
 *   10 — keep-mine
 *   11 — take-theirs
 *   12 — edit (stubbed editor writes resolved content)
 *   13 — abort (a) + Ctrl-C (stream close without newline)
 *   14 — fixture-render snapshot (80-col readable diff)
 */

import { describe, it, expect } from 'vitest';
import { Readable } from 'node:stream';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { promptThreeWayMerge } from '../../src/lib/merge-helper.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Make an in-memory Readable that emits `input` then ends.
 */
function makeStdin(input: string): Readable {
  const r = new Readable({ read() {} });
  r.push(input);
  r.push(null);
  return r;
}

/**
 * Capture stdout lines emitted by the prompt.
 */
function makeCapture(): { lines: string[]; fn: (s: string) => void } {
  const lines: string[] = [];
  return { lines, fn: (s: string) => lines.push(s) };
}

const LOCAL = 'local version of body\nline two\n';
const REMOTE = 'remote version of body\nline two changed\n';
const BASE = 'original base body\nline two\n';
const ITEM_ID = 'STORY-042-01';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('merge-helper promptThreeWayMerge()', () => {
  it('Scenario: merge helper keep-mine — stdin k\\n → resolution keep, body === local', async () => {
    const stdin = makeStdin('k\n');
    const { fn: stdout } = makeCapture();

    const result = await promptThreeWayMerge({
      local: LOCAL,
      remote: REMOTE,
      base: BASE,
      itemId: ITEM_ID,
      stdin,
      stdout,
    });

    expect(result.resolution).toBe('keep');
    expect(result.body).toBe(LOCAL);
  });

  it('Scenario: merge helper take-theirs — stdin t\\n → resolution take, body === remote', async () => {
    const stdin = makeStdin('t\n');
    const { fn: stdout } = makeCapture();

    const result = await promptThreeWayMerge({
      local: LOCAL,
      remote: REMOTE,
      base: BASE,
      itemId: ITEM_ID,
      stdin,
      stdout,
    });

    expect(result.resolution).toBe('take');
    expect(result.body).toBe(REMOTE);
  });

  it('Scenario: merge helper edit — editor writes resolved content, temp file unlinked', async () => {
    const stdin = makeStdin('e\n');
    const { fn: stdout } = makeCapture();

    // Stub editor: a shell script that overwrites the file with resolved content.
    // Must be a standalone executable — spawn() does not do shell splitting.
    const resolvedBody = 'resolved content\nno markers here\n';
    let capturedTmpFile = '';

    // Write the resolved content to a known temp location, then the shell script copies it
    const resolvedBodyFile = path.join(os.tmpdir(), `cg-test-resolved-${Date.now()}.txt`);
    fs.writeFileSync(resolvedBodyFile, resolvedBody, 'utf-8');

    const editorScript = path.join(os.tmpdir(), `cg-test-editor-${Date.now()}.sh`);
    fs.writeFileSync(
      editorScript,
      `#!/bin/sh\ncp ${JSON.stringify(resolvedBodyFile)} "$1"\n`,
    );
    fs.chmodSync(editorScript, 0o755);

    const now = () => {
      const ts = `test-${Date.now()}`;
      capturedTmpFile = path.join(os.tmpdir(), `cleargate-merge-${ITEM_ID}-${ts}.md`);
      return ts;
    };

    try {
      const result = await promptThreeWayMerge({
        local: LOCAL,
        remote: REMOTE,
        base: BASE,
        itemId: ITEM_ID,
        stdin,
        stdout,
        editor: editorScript,
        now,
      });

      expect(result.resolution).toBe('edited');
      expect(result.body).toBe(resolvedBody);

      // Temp file must be cleaned up
      expect(fs.existsSync(capturedTmpFile)).toBe(false);
    } finally {
      fs.rmSync(editorScript, { force: true });
      fs.rmSync(resolvedBodyFile, { force: true });
    }
  });

  it('Scenario: merge helper abort — stdin a\\n → resolution aborted, no changes written', async () => {
    const stdin = makeStdin('a\n');
    const { fn: stdout } = makeCapture();

    const result = await promptThreeWayMerge({
      local: LOCAL,
      remote: REMOTE,
      base: BASE,
      itemId: ITEM_ID,
      stdin,
      stdout,
    });

    expect(result.resolution).toBe('aborted');
    expect(result.body).toBe(LOCAL);
  });

  it('Scenario: merge helper abort via Ctrl-C (stream close without newline) → resolution aborted', async () => {
    // Emit nothing then end the stream — simulates Ctrl-C / stream close
    const stdin = new Readable({ read() {} });
    const { fn: stdout } = makeCapture();

    // End the stream immediately (no data) to trigger the 'end' event
    setImmediate(() => stdin.push(null));

    const result = await promptThreeWayMerge({
      local: LOCAL,
      remote: REMOTE,
      base: BASE,
      itemId: ITEM_ID,
      stdin,
      stdout,
    });

    expect(result.resolution).toBe('aborted');
    expect(result.body).toBe(LOCAL);
  });
});
