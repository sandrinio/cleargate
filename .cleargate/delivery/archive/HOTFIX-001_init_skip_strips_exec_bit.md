---
hotfix_id: "HOTFIX-001"
status: "Verified"
severity: "P2"
originating_signal: "user-report"
created_at: "2026-04-30T08:00:40.505Z"
created_at_version: "cleargate@0.8.2"
merged_at: "2026-04-30T08:05:40Z"
commit_sha: "4ceff09"
verified_by: "qa"
lane: "hotfix"
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: null
  failing_criteria: []
  last_gate_check: null
# Sync attribution. Optional; stamped by `cleargate push` / `cleargate pull`.
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: "local-authored"
last_synced_status: null
last_synced_body_sha: null
---

# HOTFIX-001: copy-payload re-asserts +x on no-force content-divergence skip (BUG-018 follow-up)

## 1. Anomaly

**Expected Behavior:** When `cleargate init` (or upgrade) runs against a live `.claude/hooks/*.sh` file whose content has drifted from the canonical bundled payload AND `--force` is not set, the hook should remain executable. The "skip-because-different-no-force" branch should re-assert `+x` for the same reason the "skip-because-identical" branch does (line 117-121 of `copy-payload.ts`): the user may have lost the bit via copy/chmod outside our control.

**Actual Behavior:** `cleargate-cli/src/init/copy-payload.ts:126-131` skips the write AND skips the `chmodSync(0o755)` call. Result: any drifted hook silently loses its +x on the next `init`. Observed in this repo today on `.claude/hooks/pending-task-sentinel.sh` — the live body had a hardcoded `REPO_ROOT` path (drifted from canonical), `cleargate init` ran without `--force`, `+x` was stripped, every subsequent PreToolUse:Agent hook fired "Permission denied" and the gate (block subagent spawns while a pending task exists) was silently bypassed. BUG-018 only patched the new-file and overwrite branches; this gap covered the no-force-skip branch.

## 2. Files Touched

Hotfix discipline: ≤2 files, ≤30 LOC net (EPIC-022 §3).

- `cleargate-cli/src/init/copy-payload.ts` — add the existing `if (needsExec && process.platform !== 'win32') fs.chmodSync(dstPath, 0o755);` block to the no-force-skip branch (between line 130 `report.actions.push(...)` and the `continue;`). ~3 LOC.
- `cleargate-cli/test/init/copy-payload-perms.test.ts` — extend the existing perms suite with one new scenario: drifted live hook (different content) + no-force init → +x preserved. ~10 LOC.

## 3. Verification Steps

> Rule: §3 must be non-empty before merging. An empty §3 blocks merge at review time.

1. - [ ] `cd cleargate-cli && npm run typecheck && npm test` — full suite green; new scenario in `copy-payload-perms.test.ts` covers drifted-content + no-force → +x preserved.
2. - [ ] Reproduce locally: in a scratch dir, run `cleargate init`, hand-edit `.claude/hooks/pending-task-sentinel.sh`, run `cleargate init` again (no `--force`), `ls -la` confirms `-rwxr-xr-x` survives.
3. - [ ] No regression on the other three branches: identical-content skip still re-asserts +x; new-file branch still chmods; force-overwrite branch still chmods. Existing tests in `copy-payload-perms.test.ts` continue passing unchanged.

## 4. Rollback

If the hotfix introduces a regression, revert by running `git revert <commit-sha>` on main. The original anomaly (silent +x strip on drifted hooks) will reappear; users will have to manually `chmod +x` until a structural fix lands. No data migrations.

## 5. Related

- **BUG-018** (commit `aaf0ef2`, shipped SPRINT-14) — original `init` +x preservation fix. Covered new-file + force-overwrite branches; missed this no-force-skip path.
- **Live `.claude/hooks/pending-task-sentinel.sh`** in this repo was already restored manually via `chmod +x` (gitignored, no commit). The hotfix fixes the upstream code so future `cleargate init` runs cannot reproduce the failure.
