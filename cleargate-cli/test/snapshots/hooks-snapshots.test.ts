/**
 * Byte-equality snapshot regression lock for hook scripts.
 *
 * BUG-009 (2026-04-26): Locks the post-fix state of token-ledger.sh.
 * If the live cleargate-planning/.claude/hooks/token-ledger.sh drifts beyond
 * the BUG-009 fix surface, this test fails and QA reviews the diff.
 *
 * Pattern: copy-on-fix — snapshot was taken immediately after BUG-009 fix.
 * To update the snapshot intentionally: cp <live-hook> <snapshot-path>
 * then document the change in a new BUG/CR/STORY.
 *
 * DO NOT modify the snapshot file without a corresponding work item —
 * that would defeat the purpose of the regression lock.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

describe('hook snapshot regression locks', () => {
  it('token-ledger.sh matches BUG-009 snapshot byte-for-byte', () => {
    const livePath = path.join(
      REPO_ROOT,
      'cleargate-planning',
      '.claude',
      'hooks',
      'token-ledger.sh'
    );
    const snapshotPath = path.join(
      __dirname,
      'hooks',
      'token-ledger.bug-009.sh'
    );

    expect(fs.existsSync(livePath), `live hook not found: ${livePath}`).toBe(true);
    expect(fs.existsSync(snapshotPath), `snapshot not found: ${snapshotPath}`).toBe(true);

    const live = fs.readFileSync(livePath);
    const snapshot = fs.readFileSync(snapshotPath);

    expect(live.equals(snapshot)).toBe(true);
  });
});
