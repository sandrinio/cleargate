# STORY-066-22 Architect post-flight (role: architect, mode POST-FLIGHT, lane runtime)

result: PASS

Reviewed: cli worktree `.worktrees/STORY-066-22/cleargate-cli`, branch `story/STORY-066-22`, base 71b57d9, seal 4c3ae6f, Dev d61eaed.
- cli `main` is still 71b57d9, so the merge needs no re-integration.
- Plan of record: `plans/STORY-066-22.md` (D-1..D-9), plus scoping OD-1..OD-5.
- Inputs: dev and QA reports, `evidence/STORY-066-22/` and `before/`.
- Flashcards checked: `#qa-red`, `#scripts`, `#worktree`.

Independent checks run for this report (no code or test edits, no full suite):
- Targeted test runs, private TMPDIR `/private/tmp/pf22t`:
  - the three new reds: 2/1/1 pass;
  - `seal-red.integration`: 7 pass;
  - `qa-red-lint-volume`: 3 pass.
- `node scripts/build-codex-payload.mjs --check` exits 0, and the story tree is clean afterwards.
- A scratch vm harness ran the story's `wave_runner.js` and `segment_stages.mjs`: 2 lanes × the run-6 sequence, a first-pass backstop, and 10 negative variants per lane.
- A scratch git fixture exercised the count edges (E4–E10, Q1). Both harnesses sit in the session scratchpad, and the fixture ran under `/private/tmp/pf22e`.

## 1. D-n / R-n against the diff

| Item | Status | Evidence |
|---|---|---|
| D-1 count rule, base = merge-base after the re-seal check | as planned | `seal_red.mjs:168-171`; env set only when `scenarios > 0` and base non-empty, `:196-205` |
| D-2 `readBaseText` (strip GIT_*, 64 MiB, `''` on failure), static import | verbatim | `qa_red_lint.mjs:428-443`; `seal_red.mjs:19` |
| D-3 relative POSIX `CLEARGATE_RED_FILES`; `git add`/`commit` keep args as given | as planned | `seal_red.mjs:171,173,177,197` |
| D-4 suffix only with a base, prefix unchanged | verbatim | `qa_red_lint.mjs:508` |
| D-5 JSON `tests` = per-file delta, else whole count | verbatim | `seal_red.mjs:184-190` |
| D-6 lint-only backstop, `spec_gap` dropped, `st.issue = ''` | verbatim | `wave_runner.js:138-147` |
| D-7 prose verbatim (qa.md :49/:50/:64, SKILL §C.3, runner :65) | verbatim | diff; banned words absent (T-D1) |
| D-8 untouched surfaces | held | diff stat: no change to `pre_gate_runner.sh`, `segment_stages.mjs`, `wave_runner_args.mjs`, `countTests`/`countScenarios`/`collectRedTestFiles`/R-enum/R-query, `classifyExpectedRed`, `scanFlagged`, red schema |
| D-9 three red files, 4 tests | held | 4c3ae6f adds 3 files; the Dev commit touches no test |
| Codex regeneration | held | qa.toml and `core/.agents/.../SKILL.md` match their sources; `--check` exit 0 |

Deviations: none.

## 2. Count logic (`qa_red_lint.mjs` / `seal_red.mjs`)

All cases ran on a scratch fixture shaped like T-V1, using the story's scripts.

| Case | Result |
|---|---|
| File absent at base | Counts in full (T-V1's new file = 3; replay A/B). |
| Invalid commit in `CLEARGATE_RED_BASE` | No crash; every base read is `''`, so whole count (12). Suffix still prints `since nonexis` (F-2). |
| Non-git target dir with a base | No crash; whole count. |
| Blank base (`'   '`) | Trimmed to empty, so no suffix and today's count. |
| Shrunk file (inherited 5→3, new +2) | Delta floored at 0; JSON `tests` 2, exit 0 (E4). `rVolume` floor also pinned by T-V2. |
| Suffix only when base set | Holds: no-base stderr is `R-volume: 12 … (limit 6)` with no suffix. |
| merge-base fails in `seal_red` (orphan `--sprint-branch`, merge-base exit 1), with a stale `CLEARGATE_RED_BASE` in the caller env | Whole count 8, flagged, no suffix; the stale variable is deleted from the scan env (E5). Risk 1 behaves as planned. An unresolvable branch never reaches merge-base: `git log <branch>..HEAD` already exits 2 (`:156-157`). |
| Absolute file args | rels become relative, base is read; `tests` 3 (E6). |
| Directory with a space | `tests` 3 (E7). |
| Path handling (D-3) | `pre_gate_runner.sh:50` keeps the caller's path form (`cd && pwd`, logical), so `path.resolve(targetDir, rel)` round-trips against the same `wt` string. `\`→`/` happens only on Windows (`path.sep`); on POSIX a literal backslash is left alone. `git show <base>:./<rel>` is cwd-relative under `-C`, so it also works when `--worktree` is a repo subdirectory. |
| Mixed symlink prefix (`--worktree /tmp/...`, file `/private/tmp/...`) | The rel climbs out of the repo, `git show` fails, and the file counts whole: 8, flagged, but the suffix claims a delta (E10, F-1). Same count as 71b57d9, so no regression. |
| Re-seal / integration | merge-base stays the cut point across re-seals. After a rule-15 `merge main` it moves to the integrated tip, so upstream tests are not counted. |
| JSON `tests` | Per-file delta: story tree A1/B1 = 3, `before` = 9/8. |

## 3. `wave_runner.js` backstop

The harness ran the story's runner with `stagesFor()` from the story's `segment_stages.mjs`.

**Run-6 sequence** (WRITTEN clean → Developer `Red-Test` → BLOCKED `b842a61`/1/`['qa_red_lint']` with a `spec_gap`):

| Lane | `stages_run` |
|---|---|
| runtime | `[story-plan, qa-red, developer, qa-red, architect-tpv, developer, qa-verify, architect-review]` |
| standard | `[qa-red, developer, qa-red, architect-tpv, developer, qa-verify, architect-review]` |

- Both lanes end GREEN with `qaSha` b842a61, and the log line fires once.
- TPV runs because `scanFlagged(st.lastRed)` (`:48`) sees `scan_exit 1`. Both lanes declare `['architect-tpv', 'scan-flagged']` (`segment_stages.mjs:46,55`).
- The Wiring prompt carries `qa_red_lint` (`:74`).

**First-pass backstop (runtime):** `[story-plan, qa-red, architect-tpv, developer, qa-verify, architect-review]`, GREEN.

**Real BLOCKED still ends the segment.** Each variant halted `BLOCKED`/`spec-contradiction` after exactly one QA-Red call, in both lanes. The variants were:
- no `sealed_sha`, and `sealed_sha: ''`;
- `scan_exit` 0, 2, and the string `'1'`;
- `flags ['typecheck']`, `['qa_red_lint','typecheck']`, `[]`, the string `'qa_red_lint'`, and absent.

**D-6 leak check:**
- The `spec_gap` text appears in no later prompt.
- No prompt after the backstop carries `Rework input`, so the Developer's pass-2 prompt is clean.

**Unchanged path:** a WRITTEN lint-flagged seal still reaches TPV and review.

## 4. Release blast radius

- **`qa_red_lint.mjs` exports.** The only importer is `seal_red.mjs:19`. `pre_gate_runner.sh:311` spawns the CLI; behaviour is unchanged without the new variable. Nothing else sets `CLEARGATE_RED_*`.
- **Seal JSON `tests`.** No script reads it:
  - the seal line in `pre-gate.jsonl` has no `tests` key (`seal_red.mjs:251`);
  - `sprint_metrics.mjs` and `prep_reporter_context.mjs` read no seal records;
  - `prep_qa_context.mjs:605,842` reads the Developer report's `TESTS:`;
  - the runner keeps `lastRed` only for `scan_exit`/`flags`.
  - Tests pinning a value: `seal-red.integration` Sc1 (`4`, base empty, unchanged) and the new reds.
  - The number-vs-array schema mismatch predates this story (scoping §7).
- **Gate 4 copy list (F-3).** The 066-22 note (plan "Gate 4 re-sync", sprint-context :141) names `qa_red_lint.mjs`, `seal_red.mjs` and `wave_runner.js`.
  - `seal_red.mjs` also imports `lib/sprint-root.mjs`, which is absent live and named only by 066-21's list at :136. It imports `lib/work-item-id.mjs` too (live copy identical).
  - Nine canonical scripts are absent live: `assign_lane.mjs`, `lib/sprint-finish.mjs`, `lib/sprint-root.mjs`, `merge_story.mjs`, `record_baseline.mjs`, `seal_red.mjs`, `segment_stages.mjs`, `wave_runner.js`, `wave_runner_args.mjs`.
  - `wave_runner_args.mjs` imports `sprintBranchFor` and `resolveRepoRoot` from `dispatch_serial.mjs`, and live `dispatch_serial.mjs` exports only one of the two.
  - So the per-story lists, unioned, still miss transitive imports.

## 5. Run 7 ("Run 7 must show")

Nothing in the code blocks run 7. On the run-5a/run-6 trees the shipped scripts give `tests 3`, `[PASS] qa_red_lint`, exit 0. On the run-6 journal the runner goes GREEN. Criterion 4's `[qa-red, developer, qa-red, developer, qa-verify]` follows: the clean re-seal replaces `lastRed`, so TPV and review skip.

Three procedural hazards (N-1..N-3):
- **N-1 (would fail the rc.7 replays).** Replay B checks out 9c34251 and b842a61 from `cg-sandbox-s46-3b`, and replay A uses 162763d/3dfcedf from `cg-sandbox-s46`; all exist today. Run 7 uses a *fresh* `cg-sandbox-s46-3b`. Before re-creating it, keep the run-6 repo (`git clone --mirror` or `git bundle` to a `cg-sandbox-s46-run6` path), or run the rc.7 replays first. Do not delete it in a sandbox clean-up.
- **N-2.** `replay.sh` reads `$CLI/scaffold/core/.cleargate/scripts/`, but an unpacked rc.7 tarball has `package/templates/cleargate-planning/.cleargate/scripts/`. Point `CLI` at a shim dir whose `scaffold/core/.cleargate/scripts` is a symlink to that path.
- **N-3.** Criterion 3 says "no `qa_red_lint` in `flagged_checks`". R-enum/R-query still scan every red-named file in the worktree (scoping §7), so another item's merged red file could add `qa_red_lint` without any `R-volume` line. Judge criterion 3 by the report's `R-volume` line. The risk is low: replays A/B show `[PASS] qa_red_lint` on the 5a and run-6 trees.

## Findings

No blocker, high or medium.

- **F-1 (low, code, intake).**
  - Where: `seal_red.mjs:171` computes rels against the `--worktree` string.
  - Scenario: an absolute file argument under another symlink prefix (`--worktree /tmp/x/wt`, file `/private/tmp/x/wt/...`). The rel climbs out of the repo, `readBaseText` returns `''`, and the inherited file counts whole while the flag says `counted: tests added since …` (E10).
  - Effect: same count as 71b57d9 with a wrong suffix; after this story it costs a TPV pass, not a halt.
  - Fix: compute rels from realpaths: `path.relative(fs.realpathSync(wt), fs.realpathSync(path.resolve(wt, f)))`.
- **F-2 (low, code, intake).**
  - Where: `qa_red_lint.mjs:494` accepts any `CLEARGATE_RED_BASE`.
  - Scenario: an invalid value counts whole but prints `since <garbage>`, and a value starting with `-` reaches `git show` as an option.
  - Effect: only `seal_red` sets it, from merge-base output, so this is not reachable in the loop.
  - Fix: use the base only when it matches `/^[0-9a-f]{7,64}$/i`, else treat it as unset.
- **F-3 (low, orchestrator, Gate 4 note).**
  - Where: plan "Gate 4 re-sync" and sprint-context :141 list three files. See §4 for the missing imports.
  - Scenario: a partial copy leaves live `seal_red.mjs` failing at import (`lib/sprint-root.mjs`), so QA-Red returns BLOCKED on exit 2 in SPRINT-47. Likewise `wave_runner_args.mjs` fails on live `dispatch_serial.mjs`.
  - Fix:
    - At Gate 4, byte-copy the whole canonical `scaffold/core/.cleargate/scripts/` tree to live, keeping the meta-repo `gate-checks.json` exception and BUG-114 OD-4's `test/**` copies.
    - Then confirm `doctor` prints no `.cleargate/scripts` drift line.

## Intake (not blocking)

- F-1 and F-2 above.
- `scaffold/core/.cleargate/scripts/test/cr081_qa_red_lint.red.sh` Scenario 6 reads `scaffold/core/cleargate-planning/.claude/agents/qa.md`, a path absent since STORY-058-01. It fails identically at 71b57d9 (dev and QA reports).
- Scoping §7's three lines are not yet in `intake.md`:
  - R-enum/R-query scope;
  - QA-Red BLOCKED on exit 2 labelled `spec-contradiction`;
  - seal JSON `tests` number vs runner schema array.

## Script Incidents

None. All script runs were scratch fixtures and vm harnesses, not `run_script.sh` invocations in the sprint tree.
