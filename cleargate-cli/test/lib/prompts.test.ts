/**
 * prompts.test.ts — BUG-007 regression tests.
 *
 * The previous implementation wrote `question + '\n'`, putting the cursor on a
 * fresh line below the prompt. In a terminal that looks identical to a status
 * log line and users don't realize the CLI is waiting. The fix writes
 * `question + ' '` so the cursor sits inline with the prompt. These tests pin
 * that behavior.
 */
import { describe, it, expect } from 'vitest';
import { PassThrough } from 'node:stream';
import { promptYesNo, promptEmail } from '../../src/lib/prompts.js';

function makeCapture(): { writes: string[]; stdout: (s: string) => void } {
  const writes: string[] = [];
  return {
    writes,
    stdout: (s: string) => {
      writes.push(s);
    },
  };
}

describe('promptYesNo render', () => {
  it('writes question with a trailing space, not a trailing newline', async () => {
    const capture = makeCapture();
    const stdin = new PassThrough();
    const promise = promptYesNo('Continue? [Y/n]', true, {
      stdin,
      stdout: capture.stdout,
    });
    stdin.write('\n');
    stdin.end();
    await promise;

    expect(capture.writes).toEqual(['Continue? [Y/n] ']);
    expect(capture.writes[0]).not.toMatch(/\n$/);
    expect(capture.writes[0]).toMatch(/ $/);
  });
});

describe('promptEmail render', () => {
  it('writes question with a trailing space, not a trailing newline', async () => {
    const capture = makeCapture();
    const stdin = new PassThrough();
    const promise = promptEmail('Participant email [user@host]:', 'user@host', {
      stdin,
      stdout: capture.stdout,
    });
    stdin.write('\n');
    stdin.end();
    await promise;

    expect(capture.writes).toEqual(['Participant email [user@host]: ']);
    expect(capture.writes[0]).not.toMatch(/\n$/);
    expect(capture.writes[0]).toMatch(/ $/);
  });

  it('returns the default when user presses Enter on empty input', async () => {
    const capture = makeCapture();
    const stdin = new PassThrough();
    const promise = promptEmail('Participant email [user@host]:', 'user@host', {
      stdin,
      stdout: capture.stdout,
    });
    stdin.write('\n');
    stdin.end();
    const result = await promise;
    expect(result).toBe('user@host');
  });

  it('returns the typed value, trimmed', async () => {
    const capture = makeCapture();
    const stdin = new PassThrough();
    const promise = promptEmail('Participant email [user@host]:', 'user@host', {
      stdin,
      stdout: capture.stdout,
    });
    stdin.write('  alice@example.com  \n');
    stdin.end();
    const result = await promise;
    expect(result).toBe('alice@example.com');
  });
});
