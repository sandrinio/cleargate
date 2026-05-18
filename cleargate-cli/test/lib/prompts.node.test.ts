import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * prompts.test.ts — BUG-007 regression tests.
 *
 * The previous implementation wrote `question + '\n'`, putting the cursor on a
 * fresh line below the prompt. In a terminal that looks identical to a status
 * log line and users don't realize the CLI is waiting. The fix writes
 * `question + ' '` so the cursor sits inline with the prompt. These tests pin
 * that behavior.
 */
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
  test('writes question with a trailing space, not a trailing newline', async () => {
    const capture = makeCapture();
    const stdin = new PassThrough();
    const promise = promptYesNo('Continue? [Y/n]', true, {
      stdin,
      stdout: capture.stdout,
    });
    stdin.write('\n');
    stdin.end();
    await promise;

    assert.deepStrictEqual(capture.writes, ['Continue? [Y/n] ']);
    assert.doesNotMatch(String(capture.writes[0]), /\n$/);
    assert.match(String(capture.writes[0]), / $/);
  });
});

describe('promptEmail render', () => {
  test('writes question with a trailing space, not a trailing newline', async () => {
    const capture = makeCapture();
    const stdin = new PassThrough();
    const promise = promptEmail('Participant email [user@host]:', 'user@host', {
      stdin,
      stdout: capture.stdout,
    });
    stdin.write('\n');
    stdin.end();
    await promise;

    assert.deepStrictEqual(capture.writes, ['Participant email [user@host]: ']);
    assert.doesNotMatch(String(capture.writes[0]), /\n$/);
    assert.match(String(capture.writes[0]), / $/);
  });

  test('returns the default when user presses Enter on empty input', async () => {
    const capture = makeCapture();
    const stdin = new PassThrough();
    const promise = promptEmail('Participant email [user@host]:', 'user@host', {
      stdin,
      stdout: capture.stdout,
    });
    stdin.write('\n');
    stdin.end();
    const result = await promise;
    assert.strictEqual(result, 'user@host');
  });

  test('returns the typed value, trimmed', async () => {
    const capture = makeCapture();
    const stdin = new PassThrough();
    const promise = promptEmail('Participant email [user@host]:', 'user@host', {
      stdin,
      stdout: capture.stdout,
    });
    stdin.write('  alice@example.com  \n');
    stdin.end();
    const result = await promise;
    assert.strictEqual(result, 'alice@example.com');
  });
});
