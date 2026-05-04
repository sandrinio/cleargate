/**
 * run-script-utf8-truncation.red.node.test.ts — CR-054 Red test (QA-Red authored, immutable post-Red).
 *
 * Acceptance scenario (CR-054 §4 #3):
 *   Scenario 1 (UTF-8 truncation — byte-vs-char regression):
 *     A script writing 5000 cyrillic 'р' characters (2 bytes each = 10000 bytes total) to
 *     stderr exits non-zero. The wrapper writes an incident JSON file. After invocation:
 *       - Buffer.byteLength(incident.stderr, 'utf8') ≤ MAX_STREAM_BYTES + Buffer.byteLength(TRUNCATION_SUFFIX) + 4
 *       - JSON.parse on the raw incident file succeeds (no broken UTF-8 escaping)
 *     ASCII-only fixture (Scenario 2) still produces incident.stderr within the byte budget.
 *
 * BASELINE FAIL CONTRACT:
 *   Scenario 1 MUST FAIL on the clean baseline because run_script.sh uses ${content:0:$MAX_BYTES}
 *   (char-index, not byte-count). For 5000 cyrillic 'р' chars (2 bytes each = 10000 bytes):
 *     bash captures content as a string of 5000 chars.
 *     bash slices to chars 0..4096 → 4096 chars × 2 bytes = 8192 bytes.
 *     Buffer.byteLength(incident.stderr) ≈ 8192, which exceeds 4096+15+4=4115.
 *     → assertion fails RED.
 *   Scenario 2 passes on baseline (ASCII: 1 byte = 1 char → char-truncation = byte-truncation).
 *
 * IMMUTABILITY: this file is sealed post-Red per CR-043 protocol. Devs must NOT modify it.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { wrapScript } from '../helpers/wrap-script.js';
import { MAX_STREAM_BYTES, TRUNCATION_SUFFIX } from '../../src/lib/script-incident.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve live wrapper: cleargate-cli/test/scripts/ → up 3 → repo root → .cleargate/scripts/run_script.sh
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const LIVE_WRAPPER = path.join(REPO_ROOT, '.cleargate', 'scripts', 'run_script.sh');

// ---------------------------------------------------------------------------
// Scenario 1: UTF-8 multi-byte truncation — byte-vs-char regression (MUST FAIL on baseline)
// ---------------------------------------------------------------------------

describe('CR-054 run_script.sh — Scenario 1: UTF-8 byte-correct truncation (MUST FAIL on baseline)', () => {
  it('incident.stderr byte-length ≤ MAX_STREAM_BYTES + TRUNCATION_SUFFIX bytes + 4 slack', async () => {
    // Use `node -e` to write 5000 cyrillic 'р' chars (U+0440, 2 UTF-8 bytes each)
    // = 10000 bytes total — to stderr, then exit 1.
    // This embeds the payload generation in the command itself, no fixture file needed.
    // Node is always on PATH in this project (Node 24 LTS, per sprint-context locked versions).
    const result = await wrapScript({
      wrapper: LIVE_WRAPPER,
      args: [
        'node',
        '-e',
        "process.stderr.write('р'.repeat(5000)); process.exit(1)",
      ],
      env: {
        AGENT_TYPE: 'qa',
        WORK_ITEM_ID: 'CR-054',
      },
    });

    assert.ok(
      result.incidentJson !== undefined,
      'Expected an incident JSON file to be written (node exits 1). ' +
        'If no incident written, the wrapper may have failed to invoke node — check LIVE_WRAPPER path.'
    );

    const incident = result.incidentJson!;
    const stderrByteLen = Buffer.byteLength(incident.stderr, 'utf8');
    const suffixByteLen = Buffer.byteLength(TRUNCATION_SUFFIX, 'utf8');
    const maxAllowed = MAX_STREAM_BYTES + suffixByteLen + 4;

    assert.ok(
      stderrByteLen <= maxAllowed,
      `Buffer.byteLength(incident.stderr) = ${stderrByteLen} exceeds allowed max ` +
        `${maxAllowed} (MAX_STREAM_BYTES=${MAX_STREAM_BYTES} + suffix=${suffixByteLen} + slack=4). ` +
        `BASELINE BUG: bash \${content:0:N} truncates by char-index (4096 chars × 2 bytes = 8192 bytes), ` +
        `not byte-count. Fix: use head -c \$MAX_BYTES.`
    );
  });

  it('incident JSON raw file is valid JSON (no broken UTF-8 escaping)', async () => {
    let rawJson: string | undefined;

    const result = await wrapScript({
      wrapper: LIVE_WRAPPER,
      args: [
        'node',
        '-e',
        "process.stderr.write('р'.repeat(5000)); process.exit(1)",
      ],
      env: {
        AGENT_TYPE: 'qa',
        WORK_ITEM_ID: 'CR-054',
      },
      _tmpdirCallback: (tmpdir) => {
        // Walk sprint-runs for the first .json incident file and read raw text
        const sprintRunsDir = path.join(tmpdir, '.cleargate', 'sprint-runs');
        if (!fs.existsSync(sprintRunsDir)) return;
        for (const entry of fs.readdirSync(sprintRunsDir)) {
          const incidentsDir = path.join(sprintRunsDir, entry, '.script-incidents');
          if (!fs.existsSync(incidentsDir)) continue;
          const jsonFiles = fs.readdirSync(incidentsDir).filter((f) => f.endsWith('.json'));
          if (jsonFiles.length > 0) {
            rawJson = fs.readFileSync(path.join(incidentsDir, jsonFiles[0]!), 'utf8');
            break;
          }
        }
      },
    });

    assert.ok(
      result.incidentJson !== undefined,
      'Expected an incident JSON file to be written (node exits 1).'
    );

    // If rawJson captured, parse it directly (strongest assertion)
    if (rawJson !== undefined) {
      assert.doesNotThrow(
        () => JSON.parse(rawJson!),
        'JSON.parse of raw incident file must succeed (no broken UTF-8 escaping in wrapper output)'
      );
    } else {
      // incidentJson was already successfully parsed by wrapScript — round-trip via stringify
      assert.doesNotThrow(
        () => JSON.parse(JSON.stringify(result.incidentJson)),
        'JSON round-trip on incident object must succeed'
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: ASCII-only — must pass on baseline AND on fixed implementation
// ---------------------------------------------------------------------------

describe('CR-054 run_script.sh — Scenario 2: ASCII-only truncation still correct (must pass baseline too)', () => {
  it('incident.stderr byte-length ≤ MAX_STREAM_BYTES + TRUNCATION_SUFFIX bytes + 4 slack (ASCII input)', async () => {
    // 10000 ASCII 'x' chars = 10000 bytes. For ASCII, char-index == byte-index,
    // so the baseline ${content:0:4096} truncation produces exactly 4096 bytes.
    // This scenario must pass both on the buggy baseline AND on the fixed implementation.
    const result = await wrapScript({
      wrapper: LIVE_WRAPPER,
      args: [
        'node',
        '-e',
        "process.stderr.write('x'.repeat(10000)); process.exit(1)",
      ],
      env: {
        AGENT_TYPE: 'qa',
        WORK_ITEM_ID: 'CR-054',
      },
    });

    assert.ok(
      result.incidentJson !== undefined,
      'Expected an incident JSON file to be written (node exits 1).'
    );

    const incident = result.incidentJson!;
    const stderrByteLen = Buffer.byteLength(incident.stderr, 'utf8');
    const suffixByteLen = Buffer.byteLength(TRUNCATION_SUFFIX, 'utf8');
    const maxAllowed = MAX_STREAM_BYTES + suffixByteLen + 4;

    assert.ok(
      stderrByteLen <= maxAllowed,
      `ASCII: Buffer.byteLength(incident.stderr) = ${stderrByteLen} exceeds allowed max ${maxAllowed}. ` +
        `ASCII truncation must work on both baseline and fixed implementation.`
    );
  });
});
