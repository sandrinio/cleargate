# STORY-066-21 Architect post-flight (runtime lane): role: architect

**Scope of the review**
- Tree: `.worktrees/STORY-066-21/cleargate-cli`, branch `story/STORY-066-21`.
- Diff: `5198aaa..a22e6b2`, which is seal 376c831 plus Developer commit a22e6b2. The Dev diff `376c831..a22e6b2` changes 9 files and no test file.
- Checked against: `plans/STORY-066-21.md` (D-1..D-13, ratified in the sprint-context Mid-Sprint Amendments, last two lines), `plans/iteration-4-scoping.md`, the dev report, and the QA-Verify report (PASS, including the replay-v2 evidence).

**Verdict**

STORY: STORY-066-21
POST-FLIGHT: FAIL (arch bounce 1)
BLOCKING FINDINGS: F-1. The cause is in the plan, not in a Developer deviation. The fix is plan Amendment A, appended to `plans/STORY-066-21.md`.

## Plan conformance

| Item | Where (story tree) | Result |
|---|---|---|
| D-1 `sprintRoot` | `scaffold/core/.cleargate/scripts/lib/sprint-root.mjs:1-61` | Byte-for-byte the plan's block. (a) The `.worktrees` basename is checked first, so a non-matching path spawns no git. (b)/(c) `isTop` on owner and d. (d) The realpath'd `--git-common-dir` values must be equal. It strips `GIT_DIR`/`GIT_WORK_TREE`/`GIT_INDEX_FILE`, never throws and never reads `.active`. CLI: exit 2 with usage when no argument is given. |
| D-2 consumers | `seal_red.mjs:20,23`; `pre_gate_runner.sh:349-353` | Only these two. `CONFIG_FILE`, `CONFIG_YML` (`:248`) and `REPORT_DIR` keep `SCRIPT_DIR` roots. `merge_story.mjs`, `validate_bounce_readiness.mjs`, `prep_qa_context.mjs`, `run_script.sh` and `wave_runner.js` are untouched (by diff). |
| D-3 seal line | `seal_red.mjs:239-245` | Key order `ts, mode, item, exit, raw_exit, flagged_checks, sealed_sha` (+`expected_red`). It sits after the report block and in try/catch. A failure before the scan exits via `fail()` before this point, so no line is written. |
| D-4 trailer | `seal_red.mjs:25-30,224` | Verbatim text. It is written only on a classified seal and before the move. The raw `[FAIL] typecheck` stays. |
| D-5 no sprint | `seal_red.mjs:201-202,226-236` | A single `.active` read at ROOT. An empty or absent `.active` still deletes the report, and the line goes to `_off-sprint`. |
| D-6 residue | `merge_story.mjs:81-88,98` | As planned. `plans/**` is not residue (`inner.includes('/')`). Incident paths are not double-counted. **The carry set is wrong (F-1).** |
| D-7 carry | `merge_story.mjs:276-301,347-349` | As planned. Same relative path. `.jsonl` is appended. Other files are copied only when absent, skipped silently when byte-identical, and kept with the root's copy when they differ. A root file is never overwritten. **`events.jsonl` is in the append set (F-1).** |
| D-8 `.active` | `merge_story.mjs:76` | Tracked only. An untracked `.active` stays `ignore`. |
| D-9 check (d) | `validate_bounce_readiness.mjs:20,25,87-109` | `execFileSync`, `-z --untracked-files=all`, and rename/copy skip as in `merge_story.mjs`. It drops the three prefixes, and the stderr names only the remaining entries. |
| D-10/D-11 prose | qa.md:50,60; SKILL.md:280,310,382,492 | Verbatim; placement is checked below. No Safeguard edit and no §C.6 edit. |
| D-12 unchanged | diff | `MERGE_EXIT`, `buildResult`, `judgeTestFailure`, `DERIVED_SPRINT_RUN_FILES`, the incident carry, `parseScanReport` and `classifyExpectedRed` are untouched. The only new export is `sprintRoot`. |
| D-13 reds | 4 files, 8 tests | The QA report shows 8/8 green. The Dev commit touches no test file. |

## Requested checks

**R1 misfire.** I ran `node lib/sprint-root.mjs` from the story tree against scratch fixtures, with absolute paths:

| Fixture | Returns |
|---|---|
| Worktree of the same repo at `r/.worktrees/S1` | `r` |
| Claude-managed layout `p/.claude/worktrees/s/.worktrees/ST` | `s` |
| Relative `.worktrees/S1/` | `r` |
| `GIT_DIR`/`GIT_WORK_TREE` leaked to another repo | `r` (the env is stripped) |
| Plain subdir `.worktrees/X` | unchanged |
| Independent clone at `.worktrees/X` | unchanged |
| Another repo's worktree placed at `r4/.worktrees/X` | unchanged |
| Submodule at `.worktrees/X` | unchanged (its common dir is `.git/modules/…`) |
| Owner is a subdir of the repo (`r5/sub/.worktrees/X`) | unchanged |
| Owner is not a git repo | unchanged |
| Dir below a worktree (`S1/sub`) | unchanged |
| Nonexistent path | unchanged |
| Session top itself | unchanged |

- The rule cannot pick a different repository, because the common dirs must match.
- It cannot pick a plain directory, because `isTop(d)` is required.
- It cannot pick a nested repo's parent, for the same `isTop(d)` reason.
- A target's own non-ClearGate worktrees at `<root>/.worktrees/<x>` of the same repo do resolve to `<root>`. That is the checkout holding `.active`, so it is the right root for the only two consumers.
- Meta-repo outer hosts (`OUTER/.worktrees/<ID>`) resolve to `OUTER`, which is correct.
- The nested cli worktree's `scaffold/core` copies are unaffected (their parent is `scaffold`).

**`pre_gate_runner.sh` fallback** (`:350-353`, under `set -euo pipefail`, `:12`). I ran the exact snippet in three cases:

| Case | Result |
|---|---|
| A `scripts/` dir with no `lib/` | today's `cd ../.. && pwd` |
| `PATH` without `node` | the same: `command not found` goes to `/dev/null` and `|| true` |
| A story worktree copy with `lib/` | the owner |

A module-not-found, a node crash or a missing node all give empty stdout, and the fallback runs.

**R2 carry**
- It never overwrites a root file:
  - non-jsonl files are copied only when the destination is absent (`:292`);
  - a differing file is pushed to `kept` (`:295`);
  - `.jsonl` files are appended, which is the planned behaviour.
- It never carries `plans/**`: `isSprintRunOutput` returns false for any inner path with a `/` other than `reports/` (`:86`).
- The sealed `merge-story.red.node.test.ts:74` pin holds.
- It carries more than the ratified scope: see F-1.

**R3 user files.**
- Only the three `.cleargate/` prefixes are dropped (`validate_bounce_readiness.mjs:103`).
- Untracked `cmd/new.go` and a modified `src/a.txt` still fail (R3-T1).
- Edge: a staged rename *into* a runtime prefix reports only its destination, so the source deletion is hidden. Porcelain v1 shows renames only for index changes, so this does not occur in practice.

**SKILL sentences.**
- Each is in its pinned section:
  - §C.0.1 step 5 (`SKILL.md:280`);
  - §C.1 (`:310`);
  - §C.3.5, new paragraph after the "flagged" definition and before "Conditional TPV dispatch" (`:382`);
  - §C.7 `**Script-owned.**` (`:492`).
- They do not contradict either Safeguard (`:389`, `:488`), for two reasons:
  - The sentence defines an expected red as *not a flag*, so "ANY pre-gate flag" does not reach it.
  - §C.6 defines its trigger as "the same seal scan as §C.3.5" (`:477`), so the carve-out carries through.
- The S3 loose pins are untouched. One wording risk is noted in F-2.

**Codex twins.**
- `node scripts/build-codex-payload.mjs --check` (read-only) exits 0 in the story tree, and `git status` is clean.
- The Codex SKILL keeps the §C.1, §C.3.5 and §C.7 inserts. §C.0.1 is stripped by design.
- `qa.toml` matches qa.md.

**Helper importers.**
- In the cli repo (excluding `node_modules/`, `templates/`, `dist/`), only `seal_red.mjs:20` and `pre_gate_runner.sh:350` use the helper.
- The `sprintRoot` names in `src/lib/{sync-log,intake}.ts` and `src/commands/{push,pull,sync,sync-log,sync-work-items}.ts` are unrelated local variables.
- The composed payload has `templates/cleargate-planning/.cleargate/scripts/lib/sprint-root.mjs`, and `MANIFEST.json:454` lists it.

## Findings

**F-1. Blocking (data integrity on the shared merge path)**
- Location: `merge_story.mjs:87` (`isSprintRunOutput` admits every `DERIVED_SPRINT_RUN_FILES` basename) together with `:285-291` (any `.jsonl` is appended).
- What happens: a story worktree's untracked `.cleargate/sprint-runs/<seg>/events.jsonl` is appended to the root's event log. The `state` step (`:362`, `update_state.mjs` `checkFoldDrift`) then fails on fold drift, and the merge has already landed.
- Reproduced twice in scratch with the story tree's scripts:
  - Run (a): the root had a real `events.jsonl`, and the worktree held an untracked state pair. The result was `step: state`, exit 2. A re-run printed the same drift error, so it stayed stuck. Recovery is a hand delete of the root's `events.jsonl`, which loses the log history.
  - Run (b) (the R2-T3 shape): the result was the same, and the root `events.jsonl` held only the worktree's line.
- Before this story, the same worktree was refused at `precondition` with nothing changed. So the failure mode regressed, in the one path this story exists to make hands-free.
- `state.json` is copied when the root has none, and kept otherwise. `metrics.json` and `.session-totals.json` (the token-ledger hook's running totals) would be copied into a root that lacks them. Neither is a ledger.
- Cause: plan D-6/D-7 (mine). The ratified scope (OD-1) says "derived ledger files". The trigger is rare, because it needs a worktree-side state write, but the cost is a stuck merge.
- Fix: plan Amendment A.
  - Carry only `reports/**`, `.qa-context-*.md`, and the three append-only ledgers (`pre-gate.jsonl`, `token-ledger.jsonl`, `subagent-ledger.jsonl`).
  - Leave the per-checkout state files as residue. They are removed with the worktree, and each gets the tail line `not carried (per-checkout state, removed with the worktree): <rel>`.
  - Add one new red (R2-T3, QA-Red seal 2).
  - No sealed file changes, no prose change, no `gen:codex`.

**F-2. Low (wording, intake)**
- Location: `SKILL.md:382`, "No Architect pass runs for it".
- Read with "it" as the item, it would skip a `runtime` item's always-on `architect-review` (`segment_stages.mjs:52-59`; SKILL.md:477 "always on a `runtime` item").
- The runner path is unaffected, because stages come from `stagesFor` and step 5 makes `stages_run` final.
- I am not changing it now: the sealed R4-T1 `TRAILER` uses the same "no Architect pass" phrasing.
- Intake wording: "It triggers no Architect pass; a `runtime` item's `architect-review` still runs."

**F-3. Low (intake note)**
- Location: `merge_story.mjs:76` with `:239-262`. A tracked, modified `.active` (the sprint-2 shape) is set aside to HEAD's empty content for the merge, prebuild and post-merge window (up to 20 min).
- A concurrent reader of `.active` in that window resolves no sprint.
- No impact today:
  - Merges run serially at the barrier, with no agent running.
  - The meta-repo's `.active` is untracked (`git ls-files` is empty), so SPRINT-47 is unaffected.

**F-4. Info**
- Location: `sprint-root.mjs:42-44` on git older than 2.31. `rev-parse` echoes `--path-format=absolute` instead of failing (flashcards 2026-11-15 `#git`). Both values carry the same echoed line:
  - Plain layout: the main checkout prints `.git` and the worktree prints an absolute path. They differ, so the result is today's root.
  - Claude layout: both print the same absolute path, so the result is the owner, which is correct.
- No wrong root is possible.
- The plan's Risks line ("the call fails") is inaccurate. No action.

**F-5. Info**
- Location: `seal_red.mjs:224`. The trailer append is not in try/catch.
- An I/O error there, after the commit, ends the seal with no JSON. §C.3.5 reads "no seal result" as flagged, so TPV is dispatched. This fails toward dispatch. No action.

**F-6. Info (run-5 watch)**
- Story-worktree residue still excludes `.cleargate/wiki/**` and `.cleargate/hook-log/**` (`merge_story.mjs:94-101`).
- A wiki-ingest hook firing on a delivery edit inside a worktree would still be refused at `precondition`.
- This was not seen in runs 3 or 4a. It is outside 066-21 (scoping §6).

## Gate 4 re-sync list (final)

**066-21 increment.** Copy these together, because `seal_red.mjs` imports the helper statically and crashes at import without it:
- `.cleargate/scripts/lib/sprint-root.mjs`, which is new live;
- `.cleargate/scripts/seal_red.mjs`, new live;
- `.cleargate/scripts/merge_story.mjs`, new live, including Amendment A;
- `.cleargate/scripts/pre_gate_runner.sh`, which `init` skips, so byte-copy it;
- `.cleargate/scripts/validate_bounce_readiness.mjs`, which `init` skips, so byte-copy it;
- `/.claude/agents/qa.md` and `/.claude/skills/sprint-execution/SKILL.md`, through `init` (rule 11).

The list is complete for importers of the helper. Those five files are not enough on their own, because their import and spawn closure also differs live:
- `merge_story.mjs` needs `record_baseline.mjs` (absent live), `dispatch_serial.mjs` (and so `launch_wave.mjs` / `segment_stages.mjs`), `lib/work-item-id.mjs` and `update_state.mjs`;
- `update_state.mjs` needs `state-events.mjs`, `constants.mjs` and `validate_state.mjs`;
- `seal_red.mjs` needs `qa_red_lint.mjs`;
- `pre_gate_runner.sh` needs `pre_gate_common.sh` and `init_gate_config.sh`.

Today `diff -rq cleargate-cli/scaffold/core/.cleargate/scripts .cleargate/scripts` prints 49 lines.

**Completeness check for the whole scripts re-sync.** After the re-sync, that `diff -rq` may print only these:
- `gate-checks.json`, the meta-repo exception;
- the 18 `Only in .cleargate/scripts…` legacy lines:
  - 14 under `test/`;
  - `backfill_hierarchy.mjs`, `pre-gate.test.sh`, `state-scripts.test.mjs` and `test-hierarchy-keys.sh`.

Any other line is a missed copy. The live `.codex/agents/qa.toml` is gitignored, dev-only, and already differs; it is not in rule 11's list.

## Run 5 must show (scoping §8, updated)

0. **RC.**
   - RC 0.31.0-rc.5 is built from cli `main` after 066-21 merges, including Amendment A.
   - The smoke list (`sandbox-e2e.md:34`) gains `lib/sprint-root.mjs` and `lib/sprint-finish.mjs`. Check both are installed after `upgrade --yes`.
1. **Pre-run replay, on the RC's installed scripts** (not the story tree), in both layouts.
   - Use `evidence/STORY-066-21/replay-v2.sh`, whose `state()` removes `events.jsonl` before hand-writing `state.json`. The verbatim `replay.sh` fails C/D at `state` because of its own helper.
   - Pass conditions are plan Proof 1–4, plus case E: the R2-T3 shape (an untracked state pair in a worktree). E passes when:
     - the merge exits 0 at `done`;
     - the root `events.jsonl` has no worktree line;
     - the tail has two `not carried (per-checkout state, removed with the worktree):` lines.
2. **Run 3's bar again, in 5a and 5b.**
   - Run 3's criteria 1–10 and the section C bar pass in both 5a (worktree session) and 5b (plain).
   - Dispatches are 1 / 3 / 5 / 3.
   - Architect dispatches per item equal `stages_run`, and no `post-flight`/`TPV` description appears outside the runner.
3. **Seal records for every sealed item.**
   - `reports/<ID>-pre-arch-scan.txt` and a `"mode":"seal","item":"<ID>"` line are in the session (5a) or checkout (5b) sprint dir.
   - For the Go item with an expected red, all three show it:
     - the report's `[INFO] expected_red:` trailer;
     - the seal line's `expected_red`;
     - QA-Red's `EXPECTED_RED:` line, which is not `none`.
4. **Merges.**
   - No `merge_story.mjs` exit 2 at `precondition`.
   - No orchestrator `mv`/`cp`/`cat >>` on `.worktrees/*/.cleargate` (transcript grep).
   - Record every `carried from the worktree:` tail. Treat any `not carried (per-checkout state…)` line as a finding: something wrote sprint state inside a worktree.
5. **§C.1.** If an orchestrator runs §C.1 `validate_bounce_readiness.mjs`, it passes. Before close there is no `git add`/`commit` of `.cleargate/sprint-runs` or `.cleargate/wiki` (transcript grep).
6. **State log.** `validate_state.mjs` passes, with no fold drift, at the walkthrough and before close in both layouts. This is the replay-v2 lesson, made visible in the real run.
7. **Fresh sandboxes.** None of the 4a orchestrator flashcards are present.
8. **Watch (F-6).** A precondition refusal naming `.cleargate/wiki/` or `hook-log/` inside a worktree goes to intake. It is not a 066-21 regression.
9. **Sprint-2 `.active` (R3 merge half).** It is proven only by R3-T2 and replay D. Watch it at the dispenser field trial, in its first 0.31.0 sprint after a 0.31.0 close.

## Open decisions for the orchestrator

- **OD-A.** Ratify plan Amendment A (A1–A4) as CR:spec-clarifications.
  - Route: QA-Red seal 2 (R2-T3), then the Developer (A1), then QA-Verify (A4).
  - Record the arch bounce: `update_state.mjs STORY-066-21 --arch-bounce`.
- **Intake lines:** F-2 (wording), F-3 (set-aside window), F-6 (wiki/hook-log worktree residue).

## Script Incidents

None. The direct `node` calls (`sprint-root.mjs`, `merge_story.mjs`, `update_state.mjs`) ran only inside scratch fixtures under the session scratchpad, as `replay.sh` does. `build-codex-payload.mjs --check` is read-only.

flashcards_flagged:
- `2026-11-15 · #scripts #merge · merge carry: never append a worktree's events.jsonl to the root; fold drift strands the merge at step state`
- `2026-11-15 · #git #test-harness · git -C <repo> worktree add <rel> resolves <rel> against <repo>, not the shell cwd; pass absolute paths`

## Re-check (Amendment A, ac8f0c0)

role: architect (post-flight re-check, closes arch bounce 1)

STORY: STORY-066-21
POST-FLIGHT: PASS
BLOCKING FINDINGS: none. F-1 is closed.

**1. Diff scope (`a22e6b2..ac8f0c0`)**
- Seal 2 `3ad3d7f` adds only `test/scripts/merge-story-carry-state.red.integration.node.test.ts` (142 lines).
- Dev commit `ac8f0c0` changes only `scaffold/core/.cleargate/scripts/merge_story.mjs` (+17/-2).
- `git diff --quiet` on every other path in that range: no changes. The worktree is clean.
- The code is A1 plus A′ verbatim:
  - `CARRIED_LEDGERS` and `isCarriedOutput` (`merge_story.mjs:90-99`);
  - the A′ loop head (`:292-294`);
  - `dropped` and the new return (`:290,314`);
  - the tail line with the exact pinned text (`:364`).
- `isSprintRunOutput`, `isWorktreeResidue` (`:105-112`), `DERIVED_SPRINT_RUN_FILES` (`:38-46`), the incident carry (`:353-360`) and the `.jsonl` append and copy-when-absent branches are byte-unchanged.
- **F-1 is closed.** A per-checkout file can reach the only two write calls (`appendFileSync`, `copyFileSync`) only by passing `:293`, and `:293` always `continue`s for it. The status does not matter:
  - an untracked `events.jsonl` is caught by A1;
  - a tracked `events.jsonl` was never carried, because the `??` gate stood even at a22e6b2.
- That the merge finishes and the tail names the file is shown in three places:
  - sealed R2-T3 (exit 0, `done`, `Done`, no `wt-event` line, both tail lines);
  - QA case E1 (untracked, `amendA/caseE/E1-merge.json`);
  - QA case E2 (tracked ` M` `state.json`; `E2-merge.json` lists `state.json` before `events.jsonl`, which is porcelain order, so the ` M` path was reported).

**2. A′ status-blind drop**
- **Nothing carried before is now dropped or reported.**
  - At a22e6b2 the carried set was `??` ∩ `isSprintRunOutput`. At ac8f0c0 it is `??` ∩ `isSprintRunOutput` ∩ `isCarriedOutput`.
  - `CARRIED_LEDGERS` ⊆ `DERIVED_SPRINT_RUN_FILES`. `isCarriedOutput`'s `.qa-context-.+\.md` regex could match a `/`, but it only runs after `isSprintRunOutput` has rejected nested paths.
  - So the difference is exactly the four per-checkout names (`state.json`, `events.jsonl`, `metrics.json`, `.session-totals.json`). That is A1's intent.
  - For every carried output, `:293` falls through to the same `??` gate as before.
- **The discard set is unchanged.**
  - The `--force` gate is `real = entries.filter(!isWorktreeResidue)` (`:351`), and the predicate is untouched.
  - A′ adds notice lines only. It changes no file operation.
- **No user file can be lost silently.**
  - `dropped` is reachable only after `isSprintRunOutput` is true, which means only `.cleargate/sprint-runs/<seg>/` paths: `reports/**`, `.qa-context-*.md` and the seven derived basenames.
  - A user file is still refused at precondition and at teardown (`:352`, `:414`).
  - The payload `.gitignore` ignores only `sprint-runs/*/dashboard.html` (`scaffold/core/.gitignore:65`). So no runtime file is hidden from porcelain and removed unreported.
- **The `D` exclusion is correct.** ` D`, `D `, `AD` and `MD` all mean the file is gone from the worktree, so `--force` loses nothing worth naming. A rename into a per-checkout path (`R `) names its destination.

**3. Gate 4 re-sync list:** holds unchanged. Amendment A and A′ touch only `merge_story.mjs`, which is already on the list, and add no import. One addition:
- Copy `merge_story.mjs` live from cli `main` after the 066-21 merge. Do not copy it from the run-5 sandbox's installed scripts, which are rc.5 = a22e6b2 and predate A1.

**3 (cont.). Run 5 must show: amended**

The sprint-context ruling sets rc.5 = a22e6b2 (before A1). Items 0, 1 and 4 assumed the RC included Amendment A, so they change as follows. Items 2, 3 and 5–9 stand.

0. **RC.**
   - Run 5 runs on rc.5 = a22e6b2.
   - The shipping 0.31.0 is cli `main` after 066-21 merges, with A1 and A′.
   - The `sandbox-e2e.md:34` smoke-list addition still applies to both builds. Those are `lib/sprint-root.mjs` and `lib/sprint-finish.mjs`, installed after `upgrade --yes`.
1. **Replay.**
   - Run replay-v2 A–D on rc.5's installed scripts, in both layouts.
   - Run replay-v2 A–E on the shipping build's installed scripts, in both layouts. This is what proves A1 and A′ ship.
   - Case E passes when, for both E1 (untracked) and E2 (sprint dir committed, ` M` `state.json`):
     - the merge exits 0 at `done`;
     - the root `events.jsonl` has no worktree line;
     - `validate_state.mjs` passes on the root;
     - the tail has one `not carried (per-checkout state, removed with the worktree):` line each for `events.jsonl` and `state.json`.
   - Case E fails at `state` on rc.5 by design. Do not run it there.
4. **Merges.**
   - The `precondition`, `mv`/`cp`/`cat >>` and `carried from the worktree:` checks are as before.
   - The per-checkout signal on rc.5 is different. rc.5 cannot print the A′ line. Any of these is a finding that sprint state was written inside a worktree:
     - a `merge_story.mjs` exit 2 at step `state` (fold drift);
     - a tail line `not carried (the sprint dir has its own): …/{state.json,events.jsonl,metrics.json,.session-totals.json}`;
     - item 6 fold drift.
   - Each such finding also confirms that A1 was needed. It is not a new hand step and does not need a run 6.
   - On the shipping build, the signal is the A′ line.

**Findings (re-check)**

**F-7. Low (intake; predates A′, from D-6/D-7 at a22e6b2; A′ names it out of scope)**
- Location: `merge_story.mjs:108` together with `:294`.
- A tracked, modified carried output in a story worktree is residue, so `--force` removes it. Examples are ` M reports/<ID>-qa.md` and a committed `_off-sprint/pre-gate.jsonl`.
- It is never carried, and the tail gives it no line. At 5198aaa the same worktree was refused at `precondition`.
- When it can happen: a report or ledger committed before the worktree was cut and then rewritten inside it.
- Why it is not blocking:
  - SKILL forbids committing `.cleargate/sprint-runs` before close (run-5 item 5), so the current sprint's outputs are untracked during the loop;
  - R1 sends seal and scan writes to the root.
- Intake fix: after `:294`, push a non-`??`, non-`D` carried output to `kept`, which prints the existing `not carried (the sprint dir has its own)` line. Or give it a line of its own.

**Script Incidents:** none. This re-check ran only `git` reads and read-only greps. No test or script was run, because QA's per-file runs and case E evidence cover A4.

flashcards_flagged: none new. Both lessons are already on top of FLASHCARD.md: the `' M' not '??'` gate card and the events.jsonl carry card.
