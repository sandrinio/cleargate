# DevOps Report — CR-087

role: devops

## Preflight

Read `.cleargate/sprint-runs/SPRINT-38/sprint-context.md`. Sprint Goal: make every "always enforced" ClearGate gate actually block again after the CR-070/CR-074 `execution_mode` retirement — no dead vocabulary, no silent no-ops, and a guard so canonical↔live drift cannot recur. CR-087 (wave 7, last merge of the sprint) is squarely in-scope: it guards the shipped no-vitest chain on prefix existence, closing a residual silent-no-op path in `pre-commit-surface-gate.sh`.

Report prerequisite waived per dispatch: verdicts (QA-Verify PASS, Architect post-flight PASS) were recorded by the orchestrator ahead of transcription; `CR-087-*.md` source reports were not required before merge for this dispatch.

## Merge Result
- Sprint branch: `sprint/S-38`
- Story/CR branch: `cr/CR-087`
- Pre-merge tree check: dirty with 4 pre-existing tracked-but-uncommitted files (`.session-totals.json`, `token-ledger.jsonl`, `plans/M3.md`, `cleargate-planning/MANIFEST.json` — a stale timestamp diff from an earlier, uncommitted prebuild run) plus the long-standing `_off-sprint/.script-incidents/*` untracked backlog in the `cleargate-cli` repo. None of these paths overlap the 3 files `cr/CR-087` touches (confirmed via `git diff sprint/S-38...cr/CR-087 --stat`), so the merge was safe to proceed without disturbing them. They remain untouched/uncommitted — out of this dispatch's scope.
- HEAD verification pre-merge: `sprint/S-38` = `164c5adf` (matches dispatch), `cr/CR-087` = `d0617984` (matches dispatch).
- Merge commit SHA: `50214ca2bfe5a1b15dbb240579efe30cbebc9221`
- Diff stat: 3 files changed, 24 insertions(+), 1 deletion(-)
  - `.cleargate/knowledge/cleargate-enforcement.md` (+3)
  - `cleargate-planning/.claude/hooks/pre-commit-surface-gate.sh` (+19/-1)
  - `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` (+3)
- QA-Red commit `51521f7` already lived in the `cleargate-cli` repo's own `sprint/S-38` branch (per dispatch) — no separate merge needed there. Confirmed post-prebuild that `cleargate-cli`'s working tree shows zero diff on `templates/cleargate-planning/**` (content already matched), so nothing additional needed committing in that repo for this wave.

## Prebuild (canonical scaffold touched)
- `cd cleargate-cli && npm run prebuild` → `build-manifest.ts` (76 files → `cleargate-planning/MANIFEST.json`) + `copy-planning-payload.mjs` (90 files → `cleargate-cli/templates/cleargate-planning`). Exit 0.
- Guard propagation verified:
  - `diff cleargate-planning/.claude/hooks/pre-commit-surface-gate.sh cleargate-cli/templates/cleargate-planning/.claude/hooks/pre-commit-surface-gate.sh` → empty (byte-identical). PASS.
  - `grep -n 'check:no-vitest' cleargate-cli/templates/cleargate-planning/.claude/hooks/pre-commit-surface-gate.sh` → guarded form present: `if ! npm run check:no-vitest --prefix "${_cg_dir}"; then` — no `-s` flag, no `2>/dev/null` on that invocation (the only nearby `2>&1` redirect is on the unrelated `command -v npm` PATH probe, which is expected). PASS.
- Meta-repo commit: `38df9b76` — `chore(SPRINT-38): wave7 prebuild — payload + manifest regen`, staged/committed `cleargate-planning/MANIFEST.json` only (the 3 other pre-existing dirty files from the preflight tree check were deliberately left unstaged — they are hook-owned ledger artifacts and an in-flight Architect plan file, not prebuild output, and out of this dispatch's scope).

## Post-Merge Tests
- Test files run:
  - `cleargate-cli/test/scaffold/pre-commit-downstream-safe.node.test.ts` → 12/12 passed, exit 0
  - `cleargate-cli/test/scaffold/file-surface-gate-e2e.node.test.ts` → 21/21 passed, exit 0
  - `.cleargate/scripts/test/test_file_surface.sh` → 6/6 passed, exit 0
- All run from repo root with no `CLEARGATE_META_ROOT` override, per dispatch.
- Result: 39/39 passed (12 + 21 + 6). Exit code: 0 across all three.

## Mirror Parity Audit
- `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` vs `.cleargate/knowledge/cleargate-enforcement.md` (canonical vs live-root) — diff empty (clean, byte-identical).
- `cleargate-planning/.claude/hooks/pre-commit-surface-gate.sh` vs `.claude/hooks/pre-commit-surface-gate.sh` (canonical vs **gitignored live tier**) — **drift detected, EXPECTED, do NOT fix**: live is still the old 31-line version, missing the CR-087 guard block entirely (the added `for _cg_pkg in mcp cleargate-cli admin; do ... done` loop, lines 26-44 in canonical). Deliberate Gate-4 hand-port item per dispatch.
- `.claude/hooks/pre-commit.sh` (gitignored live tier) — **drift detected, EXPECTED, do NOT fix**: confirmed it still lacks CR-086's symlink-walk block (canonical carries the `while [ -L "${SOURCE}" ]; do ... readlink ... done` chain-resolution logic at lines ~11-19; live tier has none). Deliberate Gate-4 hand-port item per dispatch.
- Live re-sync needed via `cleargate init` (or hand-port) for both live-tier files above — deferred to Gate-4 per dispatch instruction; not auto-fixed here.

## State Transition
- **Skipped per dispatch.** CR-087 is a Change Request, not a story — it has no `state.json` entry in `SPRINT-38`. The orchestrator records its terminal status in the CR's own frontmatter at sprint close, not via `update_state.mjs`. No state-file write performed by DevOps for this item.

## Cleanup
- Worktree `.worktrees/CR-087`: removed (`git worktree remove` exit 0; confirmed absent from `git worktree list`).
- Branch `cr/CR-087`: deleted (`git branch -d cr/CR-087` → `Deleted branch cr/CR-087 (was d0617984).`).

## Script Incidents
None. All script/bash invocations in this dispatch completed with exit 0; no `run_script.sh` wrapper failures to report.
