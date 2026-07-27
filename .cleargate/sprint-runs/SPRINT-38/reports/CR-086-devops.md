# DevOps Report — CR-086

## Merge Result
- Sprint branch: sprint/S-38
- Story/CR branch: cr/CR-086
- Merge commit SHA: `d8733937b1585a0fe75b0326f07edf94bc3efdb2`
- Diff stat: 5 files changed, 257 insertions(+), 45 deletions(-)
  - `.cleargate/knowledge/cleargate-enforcement.md`
  - `.cleargate/scripts/file_surface_diff.sh`
  - `cleargate-planning/.claude/hooks/pre-commit.sh`
  - `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md`
  - `cleargate-planning/.cleargate/scripts/file_surface_diff.sh`
- Merge was clean — no conflicts, `git merge --ort` strategy, single no-ff commit.

## Prebuild (canonical scaffold touched — YES)
- `cd cleargate-cli && npm run prebuild` run: `build-manifest.ts` (76 files → `cleargate-planning/MANIFEST.json`) + `copy-planning-payload.mjs` (90 files → `cleargate-cli/templates/cleargate-planning`).
- `cleargate-cli/templates/**` working tree: **no diff** — the npm payload mirror was already byte-identical post-merge (dev's commit already carried the canonical-side change in sync with the mirror), so prebuild's payload-copy step was a no-op on `templates/`. Nothing to note/flag there.
- Meta-repo side: `cleargate-planning/MANIFEST.json` regenerated (4 insertions/4 deletions — hash/size deltas for the touched canonical files). Committed separately (not folded into the merge commit):
  - Commit SHA: `53218578`
  - Message: `chore(SPRINT-38): wave6 prebuild — payload + manifest regen`

## Post-Merge Tests
- Test files run (no `CLEARGATE_META_ROOT` override):
  - `npx tsx --test cleargate-cli/test/scaffold/file-surface-gate-e2e.node.test.ts` → **21 passed, 0 failed** (4 suites, incl. legs 1–8 covering positive control, worktree-linked gate firing, §3.1 path parsing, SKIP_ token isolation, symlink dispatcher unit, canonical/live-root parity, and doc-truth assertions).
  - `bash .cleargate/scripts/test/test_file_surface.sh` → **6/6 passed** (off-surface block, on-surface pass, MANIFEST.json whitelist admission, SKIP_SURFACE_GATE=1 bypass ×2).
- Exit code: 0 (both suites clean).

## Mirror Parity Audit
- `file_surface_diff.sh` — diff empty (clean): live-root `.cleargate/scripts/file_surface_diff.sh` ↔ canonical `cleargate-planning/.cleargate/scripts/file_surface_diff.sh` byte-identical.
- `cleargate-enforcement.md` — diff empty (clean): live-root `.cleargate/knowledge/cleargate-enforcement.md` ↔ canonical `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` byte-identical.
- `pre-commit.sh` — **drift present, deliberate, NOT fixed by DevOps.** Live gitignored `.claude/hooks/pre-commit.sh` still carries the pre-fix single-line `HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"`, while canonical `cleargate-planning/.claude/hooks/pre-commit.sh` now carries the symlink-chain-walking resolution (multi-line, handles `.git/hooks/pre-commit` symlink indirection, no `readlink -f`/`realpath` dependency for bash 3.2 portability). Per dispatch instruction, arming the live hook is a deliberate Gate-4 step, not a DevOps action — this pre-commit.sh drift is left as-is intentionally. Live re-sync (when authorized) would be via `cleargate init` or a manual hand-port of the fixed `HOOK_DIR` resolution block.

## State Transition
- **Skipped.** CR-086 is a Change Request, not one of the nine STORY items tracked in `.cleargate/sprint-runs/SPRINT-38/state.json`. `update_state.mjs` has no entry for `CR-086` and would reject the ID. Per dispatch instruction, the orchestrator records CR-086's terminal status in its own frontmatter at sprint close; no `state.json` write was made by DevOps for this item.

## Cleanup
- Worktree `.worktrees/CR-086`: removed (`git worktree remove` succeeded; `git worktree list` no longer lists it — confirmed clean list containing only the main checkout).
- Branch `cr/CR-086`: deleted (`git branch -d cr/CR-086` → "Deleted branch cr/CR-086 (was 65ce9cf8)"; `git branch --list cr/CR-086` now empty).

## Notes
- Working tree confirmed clean both before the merge (`git status` → "nothing to commit, working tree clean") and after all steps completed.
- Required-reports prerequisite (`CR-086-dev.md`/`-qa.md`/`-arch.md`) was explicitly waived by this dispatch; verdicts (QA-Verify PASS 5/5 acceptance + 21/21 e2e, Architect post-flight PASS) were supplied inline in the dispatch payload and are reflected in the Post-Merge Tests section above (independently re-verified by DevOps, not merely trusted).

## Post-consolidation regen

Mechanical-only dispatch, no merge — Phase D.5 consolidation pass (`8d69ae12`) edited two canonical scaffold scripts after the last prebuild ran, leaving the derived tiers stale by design. This dispatch re-ran prebuild and regenerated the manifest to close the gap.

**Step 1 — dirty-tree check (before touching anything).**
Confirmed on `sprint/S-38`. `git status` showed exactly the three expected dirty paths and nothing else:
- `cleargate-planning/MANIFEST.json` (stale `generated_at`-only bump from an earlier run — superseded below)
- `.cleargate/sprint-runs/SPRINT-38/.session-totals.json` (runtime, hook-owned)
- `.cleargate/sprint-runs/SPRINT-38/token-ledger.jsonl` (runtime, hook-owned)

No other paths dirty — proceeded.

**Step 2 — prebuild.**
`cd cleargate-cli && npm run prebuild` →
```
[build-manifest] 76 files → cleargate-planning/MANIFEST.json
[prebuild] cleargate-planning payload copied: 90 files → cleargate-cli/templates/cleargate-planning
```
Clean run, no errors.

**Step 3 — four verifications (all passed):**
1. `diff cleargate-planning/.cleargate/scripts/file_surface_diff.sh cleargate-cli/templates/cleargate-planning/.cleargate/scripts/file_surface_diff.sh` → empty, exit 0 (byte-identical).
2. `diff cleargate-planning/.cleargate/scripts/close_sprint.mjs cleargate-cli/templates/cleargate-planning/.cleargate/scripts/close_sprint.mjs` → empty, exit 0 (byte-identical).
3. `grep -c "close_sprint.deferred-verify.red.node.test.ts" cleargate-planning/MANIFEST.json` → `0` (stale test entry no longer listed).
4. `find cleargate-cli/templates/cleargate-planning -name '*.node.test.ts'` → no output (no stray test files in the npm payload).

No mismatches — nothing to blocker-report.

**MANIFEST.json diff (the only substantive change):** `generated_at` timestamp bump + `sha256` updates for the two touched scripts only (`.cleargate/scripts/close_sprint.mjs`, `.cleargate/scripts/file_surface_diff.sh`) — 3 lines changed (6 total incl. timestamp), consistent with a D.5-edit-driven regen and nothing else drifting.

**Step 4 — commit (meta-repo side only).**
Staged and committed only `cleargate-planning/MANIFEST.json` on `sprint/S-38` (the two runtime files — `.session-totals.json`, `token-ledger.jsonl` — were left uncommitted/untouched, hook-owned):
- Commit SHA: `25f359f2`
- Message: `chore(SPRINT-38): post-consolidation prebuild — payload + manifest regen`
- Diff stat: 1 file changed, 3 insertions(+), 3 deletions(-)

**`cleargate-cli/templates/**` side (separate gitignored repo) — dirtiness check:**
Checked `cleargate-cli`'s own git status and diff. Finding: `templates/cleargate-planning/` is entirely **gitignored inside the `cleargate-cli` repo itself** (`.gitignore:5` → `templates/cleargate-planning/`, confirmed via `git check-ignore -v`), and has been since STORY-002-05 (commit `3f1149a`, "gitignored as a build artifact"). `git ls-files templates/cleargate-planning/...` returns nothing — the directory is untracked and untrackable by design; it is a prebuild-regenerated artifact shipped to npm purely via `package.json` `files[]`, not via git history. `git diff --stat -- templates/cleargate-planning` and `git status --porcelain -- templates/cleargate-planning` both returned empty. So: **no dirty state to report there** — this is expected repo hygiene, not a gap. (`cleargate-cli`'s own working tree does carry unrelated pre-existing untracked debris — `test/dashboard/serve.node.test.ts` and a batch of `.script-incidents/*.json` under `_off-sprint` — none of which this dispatch touched or is responsible for.)

**Not done (per dispatch instruction, deliberately out of scope):** no touch to live gitignored `/.claude/**`; no `dist` rebuild; no merge to `main`; no `close_sprint.mjs` invocation.

STATUS=done
- MERGE_SHA: N/A (no merge performed this dispatch — regen-only)
- COMMIT_SHA: `25f359f2`
- VERIFICATIONS: file_surface_diff.sh diff-empty (pass) · close_sprint.mjs diff-empty (pass) · manifest stale-test-entry absent (pass) · payload contains zero `*.node.test.ts` (pass)
