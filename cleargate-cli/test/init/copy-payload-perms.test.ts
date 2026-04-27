/**
 * copy-payload-perms.test.ts — BUG-018 regression: `.sh` files must land 0o755.
 *
 * Cross-platform: Windows file modes don't carry +x; skip there.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { copyPayload } from '../../src/init/copy-payload.js';

const SKIP = process.platform === 'win32';

let payload: string;
let target: string;

beforeEach(() => {
  payload = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-payload-perms-src-'));
  target = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-payload-perms-dst-'));
  // Build a minimal payload tree: one .sh hook (with +x), one regular file.
  fs.mkdirSync(path.join(payload, '.claude', 'hooks'), { recursive: true });
  const hookPath = path.join(payload, '.claude', 'hooks', 'session-start.sh');
  fs.writeFileSync(hookPath, '#!/bin/bash\necho hi\n');
  if (!SKIP) fs.chmodSync(hookPath, 0o755);

  fs.writeFileSync(path.join(payload, 'CLAUDE.md'), '# claude\n');

  fs.mkdirSync(path.join(payload, '.cleargate', 'scripts'), { recursive: true });
  const scriptPath = path.join(payload, '.cleargate', 'scripts', 'pre_gate_runner.sh');
  fs.writeFileSync(scriptPath, '#!/bin/bash\nexit 0\n');
  if (!SKIP) fs.chmodSync(scriptPath, 0o755);
});

afterEach(() => {
  fs.rmSync(payload, { recursive: true, force: true });
  fs.rmSync(target, { recursive: true, force: true });
});

describe('copyPayload — BUG-018 executable-bit preservation', () => {
  it.skipIf(SKIP)('hooks land with +x bits set', () => {
    copyPayload(payload, target, { force: false });
    const hook = fs.statSync(path.join(target, '.claude', 'hooks', 'session-start.sh'));
    expect((hook.mode & 0o111) !== 0).toBe(true);
  });

  it.skipIf(SKIP)('scripts under .cleargate/scripts land with +x bits set', () => {
    copyPayload(payload, target, { force: false });
    const script = fs.statSync(path.join(target, '.cleargate', 'scripts', 'pre_gate_runner.sh'));
    expect((script.mode & 0o111) !== 0).toBe(true);
  });

  it.skipIf(SKIP)('idempotent re-copy still leaves +x set', () => {
    copyPayload(payload, target, { force: false });
    // Manually drop +x to simulate a user mistake or a tar extraction
    fs.chmodSync(path.join(target, '.claude', 'hooks', 'session-start.sh'), 0o644);
    copyPayload(payload, target, { force: false });
    const hook = fs.statSync(path.join(target, '.claude', 'hooks', 'session-start.sh'));
    expect((hook.mode & 0o111) !== 0).toBe(true);
  });
});
