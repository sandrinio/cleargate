role: architect

# ARCH-POSTFLIGHT — STORY-043-01 (Flashcard Sentinel Fail-Closed)

Mode: POST-FLIGHT REVIEW (read-only design/structural). Dev commit `4821ee52` on `story/STORY-043-01`.
QA-Verify already PASSED 4/4. Pre-gate `typecheck` FAIL pre-adjudicated as structural false-positive (shell-only story; cleargate-cli gitignored/absent from worktree) — not re-flagged.

## Verdict

```
ARCH-POSTFLIGHT: PASS
```

## Review dimensions (all verified against the post-edit canonical hook + harness, not memory)

1. **Fail-closed inversion correct.** Canonical hook `pending-task-sentinel.sh:126-151`: when `${#UNPROCESSED_CARDS[@]} -gt 0`, the `else` arm (default, no advisory) prints `FLASHCARD GATE BLOCKED` to real stderr and `exit 1` (line 149). The `if [[ "${CLEARGATE_ADVISORY:-0}" == "1" ]]` arm prints `FLASHCARD GATE WARNING` and falls through (no exit). Exactly one `exit 1` in the gate block (line 149). No second downgrade path: grep confirms the only conditional escape is `CLEARGATE_ADVISORY`. The arms swapped polarity vs. the old v2/v1 branch and the per-card `card:`/`mark processed:` loops are duplicated identically into both arms (behavior-preserving).

2. **`execution_mode`/`EXEC_MODE` fully removed from canonical.** `grep -nE 'execution_mode|EXEC_MODE'` on the worktree canonical hook → ZERO matches. The `EXEC_MODE="v1"` init + `jq -r '.execution_mode // "v1"'` read (old lines 54-58) deleted; the `(mode=%s)` suffix + `"${EXEC_MODE}"` printf arg dropped from the log line (now `pending-task-sentinel.sh:127-128`). No dangling consumer — `EXEC_MODE` was referenced only in the deleted read and the log line; both gone.

3. **Bypass precedence intact.** Outer guard unchanged at `:53`: `[[ "${TOOL_NAME_EARLY}" == "Task" && "${SKIP_FLASHCARD_GATE:-0}" != "1" && "${SPRINT_ID}" != "_off-sprint" ]]`. So `SKIP_FLASHCARD_GATE=1` (skip entirely) > `_off-sprint` (skip) > `CLEARGATE_ADVISORY=1` (warn, continue) > default (block, exit 1) — matches the M1 binding precedence. The `flashcards_flagged` YAML+markdown parsing loop (`:64-124`) is byte-untouched. The `{ … } 2>> "${HOOK_LOG}"` token-ledger / sentinel-write block (`:155-207`, incl. STORY-033-02 RUN_ID keying + BUG-029 uniquify) is below the gate and behaviorally untouched.

4. **Harness retarget sound.** `test_flashcard_enforcement.sh` deleted `_find_git_root`/`GIT_ROOT`/`LIVE_HOOK` (old lines 21-37) and resolves `CANONICAL_HOOK="${REPO_ROOT}/cleargate-planning/.claude/hooks/pending-task-sentinel.sh"` script-relative (REPO_ROOT = `SCRIPT_DIR/../../..`), with a `PENDING_TASK_SENTINEL_HOOK` env override (mechanism (a) primary + (b) fallback per M1). Hard `exit 2` guard if the canonical hook is missing — fail-loud, no silent wrong-target. `grep '\.claude/hooks'` on the harness shows the string only in comments describing what is NOT targeted; the live gitignored hook is never invoked. `mk_sprint` drops `execution_mode` and emits `schema_version:3`. New `invoke_hook_advisory` exports `CLEARGATE_ADVISORY=1` for S3. Sealed Red shell test `test_flashcard_fail_closed.red.sh` (QA-Red commits `6b683e23`+`eb4c7bfc`) resolves to the same canonical sibling (lines 30/71/77/208/223) — both test scripts target the identical in-worktree canonical hook. No silent wrong-hook hazard.

5. **Diff-scope discipline clean.** Dev commit `4821ee52` touches exactly two files: the canonical hook + the harness. Confirmed: NO `cleargate-cli/templates/...` payload edit, NO live `.claude/hooks/...` edit, no off-surface files. Main-repo live + payload hooks still carry `execution_mode` (verified) — correctly deferred, not touched mid-sprint. Worktree has one untracked file `.cleargate/reports/pre-arch-scan.txt` (a scan artifact, not staged, not in the commit) — out of the committed diff, no action. Adversarial-core / gate-semantics invariant honored: `CLEARGATE_ADVISORY=1` is the SOLE downgrade lever (SDR §2.5) — no second toggle, no new env flag, no config key.

6. **Deferred live re-sync — one structural risk, see GATE4_NOTES.** Canonical now diverges from live + payload (both still inert). `cleargate init` rewrites the live tree from the **npm payload**, NOT from canonical directly — so the propagation chain is canonical → (`npm run prebuild` regenerates payload) → (`cleargate init` rewrites live from payload). Running `cleargate init` BEFORE `npm run prebuild` would re-sync live from the STALE payload and silently reinstate the inert hook. Ordering is load-bearing.

## ISSUES

none

## GATE4_NOTES

DevOps / Gate-4 live re-sync must run in this strict order, or the fix silently fails to reach the running orchestrator:
1. **First** `cd cleargate-cli && npm run prebuild` (regenerates `cleargate-cli/templates/cleargate-planning/.claude/hooks/pending-task-sentinel.sh` from the merged canonical). Then `diff -q` canonical ↔ payload → must be empty.
2. **Then** `cleargate init` from repo root (rewrites live `/.claude/` from the now-fresh payload). Re-running init before prebuild would re-sync live from the stale payload and reinstate the inert `execution_mode` read (BUG-024 class).
3. Post-sync verify: `grep -c 'execution_mode' .claude/hooks/pending-task-sentinel.sh` → 0, AND `diff -q .claude/hooks/pending-task-sentinel.sh cleargate-planning/.claude/hooks/pending-task-sentinel.sh` → empty (live == canonical).
4. Note for the orchestrator: once live re-syncs, the gate becomes fail-closed for THIS repo's own loop. Any pending flagged flashcards at that moment will block the next Task dispatch unless processed or `CLEARGATE_ADVISORY=1` is exported — expected, but be ready to process cards at Gate-4 rather than be surprised by a blocked dispatch.

flashcards_flagged: ["2026-06-01 · #dogfood #scaffold #sync-order · canonical→live propagation is canonical→(npm run prebuild regenerates payload)→(cleargate init rewrites live from PAYLOAD); init before prebuild re-syncs live from STALE payload (BUG-024 class). Always prebuild THEN init."]
