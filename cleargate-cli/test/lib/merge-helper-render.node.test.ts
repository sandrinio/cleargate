import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * merge-helper-render.test.ts — STORY-010-03
 *
 * Test 14: fixture-render snapshot.
 * Asserts that a 5-line conflict diff renders within 80 columns.
 */

import { renderInlineDiff } from '../../src/lib/merge-ui.js';

describe('merge-helper fixture diff render', () => {
  test('Scenario: 5-line conflict renders within 80-col width', () => {
    const local = [
      'line 1 unchanged',
      'line 2 local edit here',
      'line 3 unchanged',
      'line 4 local change',
      'line 5 unchanged',
    ].join('\n') + '\n';

    const remote = [
      'line 1 unchanged',
      'line 2 remote edit here with some extra words',
      'line 3 unchanged',
      'line 4 unchanged',
      'line 5 unchanged',
    ].join('\n') + '\n';

    const diff = renderInlineDiff(local, remote, 'STORY-042-01');

    assert.ok(diff);

    // Every line in the diff must be <= 80 characters
    const lines = diff.split('\n');
    const longLines = lines.filter((l) => l.length > 80);

    // Allow up to 0 lines exceeding 80 cols (snapshot-style assertion)
    assert.strictEqual((longLines).length, 0);
  });
});
