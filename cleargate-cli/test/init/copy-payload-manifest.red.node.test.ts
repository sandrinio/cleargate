/**
 * copy-payload-manifest.red.node.test.ts — CR-053 regression test.
 *
 * RED: fails against clean baseline (SKIP_FILES does not yet contain 'MANIFEST.json').
 * GREEN: passes after fix (add 'MANIFEST.json' to SKIP_FILES in copy-payload.ts).
 *
 * Scenario: copyPayload with a payload that has MANIFEST.json at payload root
 * must NOT copy it to targetCwd. Legitimate planning content (cleargate-planning/
 * skeleton) must still be copied.
 *
 * Naming: *.red.node.test.ts — immutable post-QA-Red (per FLASHCARD 2026-05-04 #naming #red-green).
 */
import * as assert from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { copyPayload } from '../../src/init/copy-payload.js';

let payloadDir: string;
let targetDir: string;

before(() => {
  // Build a fixture payload that mirrors the real npm payload structure:
  //   MANIFEST.json          ← at payload root (this is the bug: it should be skipped)
  //   cleargate-planning/    ← legitimate planning skeleton
  //     CLAUDE.md
  //     .cleargate/
  //       FLASHCARD.md
  payloadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-cp-manifest-src-'));
  targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-cp-manifest-dst-'));

  // MANIFEST.json at payload root — the file that MUST NOT land in targetCwd
  fs.writeFileSync(
    path.join(payloadDir, 'MANIFEST.json'),
    JSON.stringify({ version: '0.10.0', files: [] }, null, 2),
  );

  // Legitimate planning skeleton
  fs.mkdirSync(path.join(payloadDir, 'cleargate-planning', '.cleargate'), { recursive: true });
  fs.writeFileSync(
    path.join(payloadDir, 'cleargate-planning', 'CLAUDE.md'),
    '# ClearGate scaffold\n',
  );
  fs.writeFileSync(
    path.join(payloadDir, 'cleargate-planning', '.cleargate', 'FLASHCARD.md'),
    '# ClearGate Flashcards\n',
  );
});

after(() => {
  fs.rmSync(payloadDir, { recursive: true, force: true });
  fs.rmSync(targetDir, { recursive: true, force: true });
});

describe('copyPayload — CR-053 MANIFEST.json skip regression', () => {
  it('does NOT copy MANIFEST.json from payload root to targetCwd', () => {
    copyPayload(payloadDir, targetDir, { force: false });

    const manifestAtTarget = path.join(targetDir, 'MANIFEST.json');
    // PRE-FIX this assertion FAILS because copyPayload copies MANIFEST.json.
    // POST-FIX this assertion PASSES because SKIP_FILES contains 'MANIFEST.json'.
    assert.equal(
      fs.existsSync(manifestAtTarget),
      false,
      `MANIFEST.json must NOT be written to targetCwd (found at ${manifestAtTarget})`,
    );
  });

  it('still copies legitimate planning content (cleargate-planning/ skeleton)', () => {
    // Run again (idempotent) or rely on the state from the previous test.
    copyPayload(payloadDir, targetDir, { force: false });

    assert.ok(
      fs.existsSync(path.join(targetDir, 'cleargate-planning', 'CLAUDE.md')),
      'cleargate-planning/CLAUDE.md must be copied to targetCwd',
    );
    assert.ok(
      fs.existsSync(path.join(targetDir, 'cleargate-planning', '.cleargate', 'FLASHCARD.md')),
      'cleargate-planning/.cleargate/FLASHCARD.md must be copied to targetCwd',
    );
  });
});
