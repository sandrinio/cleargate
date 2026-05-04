/**
 * Byte-equality snapshot regression locks for hook scripts.
 *
 * BUG-009 (2026-04-26): Historical baseline — PROP↔PROPOSAL normalization fix.
 *   Snapshot: token-ledger.bug-009.sh
 *   NOTE: After BUG-010, the live hook diverges from the BUG-009 snapshot.
 *   The BUG-009 snapshot is kept as a historical baseline for audit purposes
 *   but the live-vs-bug-009 equality test is INTENTIONALLY SKIPPED (it would
 *   always fail post BUG-010 fix). The BUG-010 snapshot is the authoritative
 *   current baseline.
 *
 * BUG-010 (2026-04-26): Locks the post-fix state of token-ledger.sh.
 *   Fix: line-anchored dispatch-marker detection — SessionStart reminder text
 *   is no longer scanned (it contains "- BUG-002:" bullets that polluted
 *   work_item_id for all SPRINT-14 rows).
 *   Snapshot: token-ledger.bug-010.sh (historical; superseded by CR-016)
 *
 * CR-016 (2026-04-30): Dispatch-marker attribution layer.
 *   Fix: hook now reads .dispatch-<session-id>.json as highest-priority
 *   attribution source, before the pending-task sentinel and transcript-scan.
 *   Snapshot: token-ledger.cr-016.sh (historical; superseded by CR-018)
 *
 * CR-018 (2026-04-30): Per-turn delta math + new row schema.
 *   Fix: hook maintains .session-totals.json keyed by session_id; each fire
 *   computes delta = current_session_total - prior_session_total and writes
 *   delta + session_total blocks (drops flat input/output/cache_* fields).
 *   Snapshot: token-ledger.cr-018.sh (historical; superseded by CR-026)
 *
 * CR-026 (2026-05-02): Token-ledger attribution fix.
 *   Fix 1 (Defect 1): Replace session-id-keyed dispatch-file lookup with
 *     newest-file lookup (ls -t .dispatch-*.json | head -1) — the old key
 *     caused 100% lookup failure since SPRINT-15 (BUG-024 §3.1).
 *   Fix 2 (Defect 2): Add BANNER_SKIP_RE constant + banner-skip in the
 *     legacy transcript-grep fallback — prevents SessionStart blocked-items
 *     banner from poisoning work_item_id attribution.
 *   Snapshot: token-ledger.cr-026.sh (historical; superseded by CR-036)
 *
 * CR-036 (2026-05-04): Reporter token budget warnings.
 *   Fix: After row write, when agent_type == "reporter", compute
 *     total = DELTA_IN + DELTA_OUT + DELTA_CC + DELTA_CR and emit:
 *     - total > 200k: stdout "⚠️ Reporter token budget exceeded: <total> > 200000 (soft warn)"
 *     - total > 500k: same + best-effort cleargate flashcard record via CLI
 *   Snapshot: token-ledger.cr-036.sh (current authoritative baseline)
 *
 * Pattern: copy-on-fix — snapshot was taken immediately after each fix.
 * To update the active snapshot intentionally: cp <live-hook> <snapshot-path>
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
  it('BUG-009 snapshot file exists (historical baseline — not asserted against live after BUG-010)', () => {
    // BUG-009 snapshot is retained for audit/forensic purposes.
    // After BUG-010, the live hook is intentionally different from the BUG-009 snapshot.
    // We assert the snapshot file exists but do NOT assert live == bug-009.
    const snapshotPath = path.join(
      __dirname,
      'hooks',
      'token-ledger.bug-009.sh'
    );
    expect(fs.existsSync(snapshotPath), `BUG-009 snapshot not found: ${snapshotPath}`).toBe(true);
  });

  it('BUG-010 snapshot file exists (historical baseline — superseded by CR-016)', () => {
    // BUG-010 snapshot is retained for audit/forensic purposes.
    // After CR-016, the live hook is intentionally different from the BUG-010 snapshot.
    // We assert the snapshot file exists but do NOT assert live == bug-010.
    const snapshotPath = path.join(
      __dirname,
      'hooks',
      'token-ledger.bug-010.sh'
    );
    expect(fs.existsSync(snapshotPath), `BUG-010 snapshot not found: ${snapshotPath}`).toBe(true);
  });

  it('CR-016 snapshot file exists (historical baseline — superseded by CR-018)', () => {
    // CR-016 snapshot is retained for audit/forensic purposes.
    // After CR-018, the live hook is intentionally different from the CR-016 snapshot.
    const snapshotPath = path.join(
      __dirname,
      'hooks',
      'token-ledger.cr-016.sh'
    );
    expect(fs.existsSync(snapshotPath), `CR-016 snapshot not found: ${snapshotPath}`).toBe(true);
  });

  it('CR-018 snapshot file exists (historical baseline — superseded by CR-026)', () => {
    // CR-018 snapshot is retained for audit/forensic purposes.
    // After CR-026, the live hook is intentionally different from the CR-018 snapshot.
    const snapshotPath = path.join(
      __dirname,
      'hooks',
      'token-ledger.cr-018.sh'
    );
    expect(fs.existsSync(snapshotPath), `CR-018 snapshot not found: ${snapshotPath}`).toBe(true);
  });

  it('CR-026 snapshot file exists (historical baseline — superseded by CR-036)', () => {
    // CR-026 snapshot is retained for audit/forensic purposes.
    // After CR-036, the live hook is intentionally different from the CR-026 snapshot.
    // We assert the snapshot file exists but do NOT assert live == cr-026.
    const snapshotPath = path.join(
      __dirname,
      'hooks',
      'token-ledger.cr-026.sh'
    );
    expect(fs.existsSync(snapshotPath), `CR-026 snapshot not found: ${snapshotPath}`).toBe(true);
  });

  it('token-ledger.sh matches CR-036 snapshot byte-for-byte', () => {
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
      'token-ledger.cr-036.sh'
    );

    expect(fs.existsSync(livePath), `live hook not found: ${livePath}`).toBe(true);
    expect(fs.existsSync(snapshotPath), `CR-036 snapshot not found: ${snapshotPath}`).toBe(true);

    const live = fs.readFileSync(livePath);
    const snapshot = fs.readFileSync(snapshotPath);

    expect(live.equals(snapshot)).toBe(true);
  });
});
