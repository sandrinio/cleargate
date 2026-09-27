role: devops

# BUG-101 DevOps report (SPRINT-41 M7)

```
STORY: BUG-101
STATUS: done
MERGE_SHA: cli 8c981774210fa25fcbd7e84123059b1a30e0be98
TESTS: 3659 tests / 3657 pass / 0 fail / 2 skipped (full suite); plus 6 solo post-BD witness files, all green (see §Post-Merge Tests)
MIRROR_PARITY: clean (RS-M7a applied; doctor 0 scaffold-drift lines; canonical-live-parity 11/11)
STATE: Done
WORKTREE: removed
BRANCH: kept (story/BUG-101 in both repos — dispatch does not list a branch-delete step for M7)
flashcards_flagged:
  - "2026-09-27 · #devops #payload · precopy templates/scaffold too, not just cleargate-planning, for step 6 diff."
```

## Preflight

- Read `sprint-context.md` (Sprint Goal, Cross-Cutting Rules, Mid-Sprint Amendments through the 2026-09-27 M7 entries).
- Read `plans/M7.md` §2.3 (D4 row: BUG-101 +6, 3659/3657), §5 Boundary steps (BUG-101 row: BD ✓, verify-pack counts unchanged, `--check` ✓, M2 pair ✓ BUG-085 row, RS-M7a `hooks/pending-task-sentinel.sh`, extra witness `hooks-claude-parity` integration tier), §3 BUG-101 blueprint, and the TPV101-A1..A4 amendments (append at ~L1022) plus the 2026-09-27T09:55Z orchestrator note confirming the re-seal keeps D4 at +6.
- Read `reports/BUG-101-qa.md` (QA-Verify PASS, 41/41 own-run tests, relied on INTEGRATE's harness-lane numbers per Rule 20's one-machine-wide-run cap), `reports/BUG-101-integrate.md` (Developer's own INTEGRATE of cli main `0e5b0ac` onto `story/BUG-101` at `94fa6e6`; 296/296 tests, test 46 1/1, scripted codex-loop 2/2), `reports/BUG-101-prescan.txt` (arch-mode pre-gate scan, 4/4 passed — this is the "post-flight scan clean" artifact; no separate Architect post-flight report exists for this item by design), and `reports/BUG-101-dev.md` (fix at `26bdf84`).
- `command grep` of `.cleargate/FLASHCARD.md` for `#devops #merge #rule-14 #resync #test-order #pre-gate`: applied the rule-14 revert-scope card, the `--no-commit`-to-hold-a-clean-merge card (not needed — the merge below was a single clean auto-merge), the `checkout HEAD -- .` (not bare `checkout --`) card, and the `command grep`-is-not-gitignore-shimmed card.

## Where

- OUTER main checkout `/Users/ssuladze/Documents/Dev/ClearGate`, `sprint/S-41`.
- CLI main checkout `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli`, `main`.
- `<cw>` = `OUTER/.worktrees/BUG-101/cleargate-cli`, `story/BUG-101` @ `94fa6e6` (Developer's own INTEGRATE tip) — removed at teardown.
- `<ow>` = `OUTER/.worktrees/BUG-101`, detached @ `7db0e89e` — removed at teardown.

## 0. Pre-merge

- Payload pre-copy: `cleargate-cli/templates/cleargate-planning` copied to my own scratch dir `/private/tmp/cg-s41-devops101-<utc>/precopy-templates-cleargate-planning` (removed at teardown, per exact path).
- `git -C OUTER status --short` before starting: only the 4 ledger files (`.session-totals.json`, `events.jsonl`, `state.json`, `token-ledger.jsonl`).
- `git -C CLI merge-base --is-ancestor main story/BUG-101` → exit 0 (`main` is already an ancestor: the Developer's own `94fa6e6` INTEGRATE commit already merged cli `main` into the story branch).
- `git -C CLI merge-tree --write-tree main story/BUG-101` → clean tree `5fea94af2171095a564e1eedbd94e69187033353`, no conflicted path printed.

## 1. State (QA Passed → Architect Passed)

`CLEARGATE_STATE_FILE=.../state.json node .../update_state.mjs BUG-101 "Architect Passed"` → `state="Architect Passed"` confirmed by reading `state.json`.

## 2–3. Cli merge

```
git -C CLI merge --no-ff story/BUG-101 -m "merge(story/BUG-101): Codex dispatch attribution — task_name, dispatch marker (mv claim), plaintext message; source= in the codex sentinel line"
```

Clean, single-parent-fast auto-merge (no conflicts — `story/BUG-101` already carried cli `main` via the Developer's own INTEGRATE step). Result: `Merge made by the 'ort' strategy`, tree `5fea94af...` matching the pre-merge preview exactly.

- **Merge commit:** `8c981774210fa25fcbd7e84123059b1a30e0be98`
- **Diff stat:** 8 files changed, 562 insertions(+), 15 deletions(-) — `CHANGELOG.md`, `scaffold/core/.agents/skills/sprint-execution/SKILL.md` (generated), `scaffold/hosts/claude/.claude/hooks/pending-task-sentinel.sh` (canonical), `scaffold/hosts/codex/.codex/hooks/pending-task-sentinel.sh` (generated), `scripts/build-codex-payload.mjs`, `test/helpers/init-fixture.ts`, `test/hooks/codex-dispatch-attribution.red.node.test.ts` (new), `test/scripts/codex-sprint-execution-render.red.node.test.ts`. Matches the brief's declared scope and both the Developer and QA-Verify reports exactly.

## Post-Merge Tests

**Full suite (`npm test`, cli main checkout), run once:**

```
ℹ tests 3659
ℹ pass 3657
ℹ fail 0
ℹ skipped 2
ℹ duration_ms 689363.576
```

Exactly the M7 plan's projected total for the first merge (§2.3: 3653 + 6 = 3659/3657/0/2). Exit code 0. No transient red to re-run solo.

**Rule-14 revert.** `git -C OUTER diff --name-only` after the full suite listed 6 tracked paths; of those, exactly the **48** under `.cleargate/delivery/pending-sync/**` were reverted with `git checkout HEAD -- .cleargate/delivery` (per the flashcard: `HEAD --`, not bare `checkout --`, to avoid restoring a stale index copy). The other 2 (`.cleargate/FLASHCARD.md`, `.cleargate/sprint-runs/SPRINT-41/close-followups.md`) and the 4 ledger files were left untouched — none of those are delivery paths, and `state.json` in particular carries my own step-1 transition and must not be reverted. Post-revert `git status --short` under `.cleargate/delivery/` = empty.

**BD (cli main checkout):**
- `npm run prebuild` → payload 88 files, split-view 107 files, manifest 82 files (all unchanged counts).
- `npm run build` → exit 0 (tsup CJS+ESM+DTS all succeeded).
- `npm run typecheck` → exit 0.

**Post-BD witnesses (each run solo):**

| Witness | Result |
|---|---|
| `hooks-claude-parity.red.integration` | 19/19 |
| `codex-dispatch-attribution.red` | 6/6 |
| M2 pair, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline` (compare-only; baseline dir untouched) | `claude-adapter-init-parity` 5/5 + `init-host-parity` 15/15 |
| `node scripts/verify-pack.mjs` | `OK — 232 files, payload 88, version 0.26.1` (unchanged) |
| `node scripts/build-codex-payload.mjs --check` | exit 0 |

## Mirror Parity Audit

**Payload identity (`diff -r` against the step-0 pre-copy of `templates/cleargate-planning`):** exactly 3 files differ — `.agents/skills/sprint-execution/SKILL.md`, `.claude/hooks/pending-task-sentinel.sh`, `MANIFEST.json`. (`.codex/hooks/pending-task-sentinel.sh` is not part of this compat payload — `templates/cleargate-planning` composes core + hosts/claude only, never hosts/codex — so it cannot appear in this diff regardless of the merge; confirmed no `.codex` dir exists under `templates/cleargate-planning` at all.) No file outside this set differs. Clean.

**`templates/scaffold/**` equivalents:** the dispatch's step 0 pre-copy instruction named only `templates/cleargate-planning`, so no pre-merge snapshot of `templates/scaffold/**` was taken and a literal pre/post `diff -r` there was not possible. As a substitute cross-check, I `cmp`'d the current split-view copies directly against their git-tracked canonical/generated sources: `templates/scaffold/hosts/claude/.claude/hooks/pending-task-sentinel.sh`, `templates/scaffold/hosts/codex/.codex/hooks/pending-task-sentinel.sh`, and `templates/scaffold/core/.agents/skills/sprint-execution/SKILL.md` are all byte-identical to their tracked sources — internally consistent, and reinforced by `build-codex-payload.mjs --check` exiting 0. Flagged below as a process gap for future BUG-style DevOps dispatches (flashcards_flagged).

**Doctor, pre-RS:** `node dist/cli.js doctor --cwd OUTER` printed exactly 1 `scaffold drift:` line: `.claude/hooks/pending-task-sentinel.sh (content-mismatch)` — matches expectation exactly.

**RS-M7a (`b0-live-resync.mjs`):**
- Dry run: drift list = exactly `hooks/pending-task-sentinel.sh` (before `ca2fa2ba...`, after `6d2e9b38...`). No other path listed.
- `--apply`: backup written to `.cleargate/sprint-runs/SPRINT-41/b0/claude-live-backup-2026-09-27T10-57-23-795Z.tgz`; applied; `post_condition: "live == canonical (pin-substituted) for every canonical file"`.
- Pin-tolerant verification: live pin `0.20.0` (from `.claude/hooks/stamp-and-gate.sh`); `canonical.replace('__CLEARGATE_VERSION__', '0.20.0') == live` → **MATCH** (verified with a direct byte compare, not just the script's self-report).
- Doctor, post-RS: 0 `scaffold drift:` lines.
- `canonical-live-parity` witness, run solo: 11/11 pass.

Overall: **clean** — no unresolved drift anywhere in the live/canonical/generated surface after RS-M7a.

## Smoke (codex install, mktemp dir, one call)

```
(cd <mktemp> && git init -q && node .../dist/cli.js init --yes --pin 0.0.0-m7 --host codex && node .../dist/cli.js verify-install --json > out.json; grep -c 'source=' .codex/hooks/pending-task-sentinel.sh)
```

- `init` exit 0; `verify-install --json` exit 0, `ok: true`, 15 checks total (8 codex-owned), 0 non-pass/skip.
- `grep -c 'source='` on the generated `.codex/hooks/pending-task-sentinel.sh` → 1 (≥ 1 satisfied).

Smoke dir removed by exact path at teardown; no writes reached the meta-repo or `OUTER`.

## State Transition

- `Done` confirmed via `state.json`: `{"state":"Done", ..., "updated_at":"2026-09-27T10:57:50.796Z"}`.
- Transitioned at: 2026-09-27T10:57:50.796Z (QA Passed → Architect Passed → Done, both real transitions via `update_state.mjs`).

## Cleanup

- `git -C CLI worktree remove .worktrees/BUG-101/cleargate-cli` → exit 0 (was clean).
- `git -C OUTER worktree remove .worktrees/BUG-101` → exit 0 (was clean).
- `git -C CLI worktree list` / `git -C OUTER worktree list`: BUG-101 absent from both; BUG-047/BUG-100/BUG-103 lanes untouched.
- Branches `story/BUG-101` (both repos) kept — the M7 dispatch's Step 10 names only worktree removal, not `git branch -d`, unlike the generic template.
- My own scratch dirs (`/private/tmp/cg-s41-devops101-<utc>/` and the mktemp smoke dir) removed by exact path; the shared `/private/tmp/cg-s41-m2-init-baseline` compare-only baseline was read-only and untouched.

## Final outer status

```
git -C OUTER status --short
 M .cleargate/FLASHCARD.md
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/close-followups.md
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
?? .cleargate/sprint-runs/SPRINT-41/.processed-* (29 files)
?? .cleargate/sprint-runs/SPRINT-41/reports/BUG-047-integrate.md
?? .cleargate/sprint-runs/SPRINT-41/reports/BUG-100-dev.md
?? .cleargate/sprint-runs/SPRINT-41/reports/BUG-100-integrate.md
```

Beyond the 4 expected ledger files, `FLASHCARD.md` (+2 lines) and `close-followups.md`, plus the 29 untracked `.processed-*` flashcard-gate markers and 3 untracked reports (`BUG-047-integrate.md`, `BUG-100-dev.md`, `BUG-100-integrate.md`), appeared **during** my ~12-minute full-suite run and BD — none present at my pre-merge `git status` (§0). These are the concurrent BUG-047/BUG-100/BUG-103 build lanes (rule 20: up to 4 build lanes run alongside the one merge lane) writing their own reports and consuming their own flagged flashcards into the shared outer main checkout. I did not author, edit, or revert any of them — verified none fall under `.cleargate/delivery/**` (the only scope the rule-14 revert and my dispatch authorize me to touch) and none are BUG-101 artifacts. Reporting per Step 11's "report anything else."

## Script Incidents

None. `run_script.sh` invocations (`b0-live-resync.mjs` dry-run and `--apply`) both exited 0; no `.script-incidents/` entries were written for this dispatch.
