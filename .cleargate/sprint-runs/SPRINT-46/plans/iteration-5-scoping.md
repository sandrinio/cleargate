# SPRINT-46 iteration 5: scoping (sandbox run 6 finding S41)

role: architect · 2026-11-15 · code read at cli `main` 71b57d9 (rc.6, read only). Evidence: run-6 session
`~/.claude/projects/-Users-ssuladze-Documents-Dev-cg-sandbox-s46-3b/1f09c2f8-….jsonl` L300 (wave verdict) and its wave journal
`…/subagents/workflows/wf_d05eeb95-72e/journal.jsonl` (three agent results); sandbox `cg-sandbox-s46-3b` (read only: `git log`,
`pre-gate.jsonl`); run-5a session worktree `cg-sandbox-s46/.claude/worktrees/sprint-S-01` for comparison.

Bar: owner's section C (halts only at plan confirmation, walkthrough, Gate 4; 0 hand steps). Run 6 halted once outside
those gates. Proposed: **one story, STORY-066-22, four requirements.**

## Prior work

[[STORY-066-07]] (R-volume and the seal; its §1 qa.md requirement says "on exit 1 QA-Red trims or fixes the set and seals
again, and does not return `QA-RED: WRITTEN`": the clause that produced this halt; R2 below amends it). [[STORY-066-13]]
(Developer `Red-Test` → QA-Red route, which worked here). [[EPIC-065]] (owns what red assertions may pin; untouched).
Intake S36 (Developer edits another item's sealed test), S40 (R-volume cost two Architect passes in 5a), S41 (this halt).
No item covers counting inherited tests.

---

## 1. What happened (verified)

Journal results, in order:
1. QA-Red pass 1: `WRITTEN`, `sealed_sha` 67b65e3, `scan_exit` 0, `flags` [], `tests` [`cmd/tally/main_top_red_test.go`], 3 scenarios.
2. Developer: `blocked`, `Red-Test`: STORY-001-03's `TestRedBadArguments` (`main_red_test.go:83`) pins the old usage line.
3. QA-Red pass 2: one-line edit to `main_red_test.go`, re-seal of both files as b842a61. Seal line `exit 1`,
   `flagged_checks ["qa_red_lint"]`. Return: `status: "BLOCKED"`, `sealed_sha` b842a61, `scan_exit` 1, `flags ["qa_red_lint"]`,
   `spec_gap` "… 8 tests against 3 scenarios … includes the 5 tests inherited from STORY-001-03 … Orchestrator decision needed".
4. Verdict `BLOCKED`, `blocker.type` `spec-contradiction`, `qaSha` 67b65e3 (the BLOCKED return never set `st.qaSha`).

Per-file count at b842a61 against `sprint/S-01`: `main_red_test.go` 5 → 5 (+0), `main_top_red_test.go` 0 → 3 (+3). The item
added 3 tests for 3 scenarios.

**5a had the same count defect.** 001-04's seals 2ba8585 and 3dfcedf listed `cmd/tally/main_test.go` (6 inherited) plus 3
new tests: 9 for 3 scenarios, flagged twice. That QA-Red returned `WRITTEN` with the flag, so TPV and post-flight ran (S40)
instead of a halt. The same prompt gave opposite returns in 5a and 6.

## 2. Root cause (file:line)

**(a) Inherited count.** `seal_red.mjs:188` sets `CLEARGATE_RED_FILES = files.join('\n')` (every listed file).
`qa_red_lint.mjs:474-482` reads each listed file at the worktree's HEAD. `rVolume` (`:405-421`) sums `countTests` over the
whole file (`:414`). No base is consulted, so a file another item sealed contributes all its tests. `seal_red.mjs:178-181`
computes the JSON `tests` the same way. Listing that file is required: the seal commits exactly the listed files
(`:167-171`), and the edited assertion has to be sealed.

**(b) BLOCKED/spec escalation. The prompt owns it; the runner passes the label through without checking it.**
- `qa.md:50` (and `qa.toml:47`, generated): "when FLAGS contains `qa_red_lint`, trim or fix the set and seal again (at most 2
  re-seals …), and **do not return `QA-RED: WRITTEN` until the seal is clean**". It gives no permitted exit when the set
  cannot be trimmed: shrinking it means deleting another item's sealed tests or merging this item's own scenarios. The output
  shape (`qa.md:54`) offers only `WRITTEN | BLOCKED`, so BLOCKED is the only legal return left. `qa.md:64` frames BLOCKED as
  "ambiguity that prevents writing tests", so the agent wrote a decision request into `spec_gap`.
- `wave_runner.js:65` (red prompt): "status WRITTEN, or BLOCKED with spec_gap". Nothing tells the agent the runner routes a
  flagged seal.
- `wave_runner.js:138`: every QA-Red `BLOCKED` becomes `blocked('spec-contradiction', …)`, even when the return carries a
  `sealed_sha` and a lint-only flag. `scanFlagged` (`:48`) and the `scan-flagged` stages (`:112`) would have taken the flagged
  seal to `architect-tpv` with no halt, as in 5a.
- SKILL §C.3 (`SKILL.md:370`): "On `QA-RED: BLOCKED`: surface Spec-Gap to human". That is the same rule for the Codex serial
  path, which has no runner.

## 3. Fix (candidate confirmed; one runner backstop added)

**R1: R-volume counts the tests the item adds.**
- `qa_red_lint.mjs`: `rVolume({ files, scenarios })` accepts an optional `baseText` per file and counts
  `max(0, countTests(name, text) - countTests(name, baseText ?? ''))`. The function stays pure.
  - `main()`: when `CLEARGATE_RED_BASE` is non-empty, read each listed file's base text with
    `spawnSync('git', ['-C', targetDir, 'show', `${base}:./${rel}`])`, with `GIT_DIR`/`GIT_WORK_TREE`/`GIT_INDEX_FILE` removed
    from env as `seal_red.mjs:37-43` does. A non-zero exit (file absent at base) gives `baseText ''`. With the variable unset,
    behaviour is exactly today's.
  - With a base, the flag text gets a suffix after today's text: `R-volume: <T> tests for <S> scenarios (limit <2S>); counted:
    tests added since <base:7>`. The prefix is unchanged, so the pinned regexes still match.
  - The header doc (`:31-37`) gains one sentence.
- `seal_red.mjs`: after the re-seal check, `git(wt, ['merge-base', branch, 'HEAD'])`. On status 0, set
  `scanEnv.CLEARGATE_RED_BASE = <sha>` beside `:188-189` (and delete it in the `else`). On failure, leave it unset (today's
  count). The JSON `tests` (`:178-181`) uses the same per-file delta, so the seal JSON matches the lint.
  - Paths: `rel = path.relative(wt, path.resolve(wt, f))` with POSIX separators. `pre_gate_runner.sh:311` already passes env
    through to `node qa_red_lint.mjs`, so it needs no change.
- Base = `merge-base(--sprint-branch, HEAD)`. That is the cut point for a sprint-branch base and the contract tip for a CR-124
  contract base (`wave_runner.js:65` passes `item.base`), and it is stable across re-seals.

**R2: A lint flag is never a block (prompts and playbook).**
- `qa.md` RED step 8, rewritten: "… The lint counts only the tests this item adds: a sealed file of another item that you
  edit and list counts only the tests you add to it. More than twice the scenario count is flagged (`R-volume`)." Keep the
  phrase `one test per acceptance scenario` (pinned).
- `qa.md` step 9: replace the clause from "when FLAGS contains `qa_red_lint`" through "the Architect TPV path runs" with:
  > "Exit 1 is a flagged scan, and a flag is never a reason to return `QA-RED: BLOCKED`. When FLAGS contains `qa_red_lint`,
  > fix the set and seal again if you can without deleting or merging tests another item sealed (at most 2 re-seals; the script
  > refuses a re-seal once the Developer has committed). Then return `QA-RED: WRITTEN` with the seal's FLAGS, clean or not;
  > the runner sends a flagged seal to Architect TPV."

  Keep "Exit 2 means the script could not run: return `QA-RED: BLOCKED`."
- `qa.md:64`: "Return `QA-RED: BLOCKED` only when an acceptance scenario cannot be expressed as a test (emit a `Spec-Gap:`
  sentence naming it) or the seal could not run (exit 2)."
- Add a step-9 sentence for the inherited case: "When the item changes behaviour another item's sealed test pins, edit that
  test, list its file in the seal, and return WRITTEN." This is QA-Red's half of S36. The surface gate (S36 proper) stays in
  intake.
- `wave_runner.js:65`: "… plus status WRITTEN, also when the seal is flagged (the runner sends a flagged seal to Architect
  TPV); status BLOCKED with spec_gap only when a scenario cannot be expressed as a test or the seal could not run."
- SKILL §C.3 after `:370`: "A flagged seal is not BLOCKED: QA-Red returns `WRITTEN` with its FLAGS and §C.3.5 runs. A
  `BLOCKED` return that carries a `SEALED_SHA` and only `qa_red_lint` in FLAGS is handled the same way."
- Regenerate with `npm run gen:codex`, then prebuild `--check`. This updates `qa.toml` and `core/.agents/…/SKILL.md`.

**R3: Runner backstop (OD-2).** At `wave_runner.js:138`, a QA-Red return with `status 'BLOCKED'`, a non-empty `sealed_sha`,
`scan_exit === 1`, and non-empty `flags` that are all `qa_red_lint` is handled as `WRITTEN`:
- `st.lastRed = res`, `st.qaSha = res.sealed_sha`, `st.issue = ''`, `i++`.
- One `log('wave_runner: <ID> QA-Red BLOCKED on a qa_red_lint-only seal; routed as a flagged seal')`.

Any other BLOCKED keeps `spec-contradiction`. This applies with no sealed SHA, a `typecheck` flag, or `scan_exit` 0 or 2.
The `spec_gap` text is not forwarded: the TPV prompt (`:74`) already names the report and the flags, and a non-empty
`st.issue` would leak into the Developer prompt after an APPROVED TPV (`:174` does not clear it). About 5 LOC.

**R4: no stage-table change.** `segment_stages.mjs` stays the same: the standard lane already has `architect-tpv`
`scan-flagged`.

**Sealed tests that pin current behaviour: none break, so no QA-Red amendment is needed.**
- `seal-red.integration.node.test.ts` (066-07):
  - Sc1 `tests === 4`.
  - Sc2: 11 flagged, then 8 clean, regex `/11 tests for 4 scenarios/`.
  - Sc4: bare runner, no base variable.

  The fixture's base commit holds only `tracked.txt`, so the per-file base count is 0 and every value is unchanged.
- `qa-red-lint-volume.node.test.ts`: non-git dir, no `CLEARGATE_RED_BASE`, so unchanged.
- `qa-red-seal-content.node.test.ts` REQUIRED needles (`seal_red.mjs`, `run_script.sh`, `-- `, `SEALED_SHA`, `SCAN_EXIT`,
  `FLAGS`, `one test per acceptance scenario`, `*.red.integration.node.test.ts`): keep them all.
- `expected-red-not-a-flag.red` (066-21): `EXPECTED_RED:` and `[INFO] expected_red:` stay in the RED slice. P1–P4 stay in
  §C.3.5/§C.0.1/§C.7/§C.1. R2 edits §C.3 only.
- `wave-runner-sandbox-fixes.red` U2 (runtime red prompt includes `plans/STORY-R.md` and the no-redeclare rule) and U4 (a
  Developer Spec-Gap → `spec-contradiction`): untouched.
- `wave-runner.red` (`:153`): no prompt may match `/\b(approved|confirmed|authori[sz]ed)\b/i`. The new prompt text must avoid
  those words; the wording above does.
- No test pins QA-Red `BLOCKED` → `spec-contradiction`. A grep for `status: 'BLOCKED'` under `test/` finds nothing. The only
  copy of `On \`QA-RED: BLOCKED\`` is the frozen fixture `test/fixtures/skill-pre-058-12/SKILL.md`.

## 4. Draft: STORY-066-22 (EPIC-066)

**Title:** QA-Red counts only the tests it adds, and a flagged seal never halts the wave.

**§1.2 Requirements**
- **R1** `qa_red_lint.mjs`:
  - `rVolume` counts, per listed file, `max(0, tests at HEAD − tests in that file at CLEARGATE_RED_BASE)`. A file absent at
    the base counts in full.
  - With `CLEARGATE_RED_BASE` unset, the count is today's.
  - With a base, the flag text ends `; counted: tests added since <base:7>`.
- **R2** `seal_red.mjs` sets `CLEARGATE_RED_BASE` to `git merge-base <--sprint-branch> HEAD` (unset when that fails). The seal
  JSON `tests` uses the same per-file count.
- **R3** `qa.md` RED (and the generated `qa.toml`):
  - A flag is never a reason for BLOCKED. After any re-seals, QA-Red returns `WRITTEN` with the seal's FLAGS.
  - BLOCKED only for a scenario that cannot be expressed as a test, or exit 2.
  - An edited sealed file of another item is listed in the seal and counts only its added tests.
  - The same rule appears in the `wave_runner.js` red prompt and in SKILL §C.3 (Codex SKILL regenerated).
- **R4** `wave_runner.js` treats a QA-Red `BLOCKED` that carries a `sealed_sha`, `scan_exit` 1 and only `qa_red_lint` flags
  as a flagged `WRITTEN` seal, and continues to the next stage. Every other QA-Red `BLOCKED` stays `spec-contradiction`.

**§1.3 Out of scope:**
- S36 surface gate.
- S38 story-plan path wording.
- R-enum/R-query scanning other items' red files (§7).
- A re-seal with no staged change (4a intake).
- `tests` type mismatch between seal JSON (number) and runner schema (array).

**§2.1 Gherkin**
```gherkin
Feature: QA-Red volume counts its own tests and a lint flag never halts

  Scenario: A sealed file of another item counts only the tests this item adds
    Given a sprint branch where "cmd/tally/main_red_test.go" holds 5 Go tests sealed by an earlier item
    And an item with 3 scenarios whose story branch edits one assertion in that file and adds "cmd/tally/main_top_red_test.go" with 3 tests
    When QA-Red seals both files with seal_red.mjs
    Then the seal exits 0 with flags [] and tests 3
    And the scan report has "[PASS] qa_red_lint" and the seal line in pre-gate.jsonl has exit 0

  Scenario: Tests the item adds are still capped, inherited file included
    Given the same sprint branch
    And the story branch adds 1 test to "cmd/tally/main_red_test.go" and 6 tests in a new red file
    When QA-Red seals both files
    Then the seal exits 1 with flags ["qa_red_lint"] and tests 7
    And the scan report contains "R-volume: 7 tests for 3 scenarios (limit 6); counted: tests added since "

  Scenario: A QA-Red BLOCKED on a lint-only flagged seal goes to TPV, not to the owner
    Given a standard item whose QA-Red returns BLOCKED with sealed_sha "b842a61", scan_exit 1 and flags ["qa_red_lint"]
    When the wave runner runs the item
    Then the next dispatch is "Architect <ID>" in phase Wiring and the verdict is not BLOCKED
    And a QA-Red BLOCKED with no sealed_sha, or with flags ["typecheck"], still ends the segment BLOCKED with blocker type "spec-contradiction" and no further dispatch

  Scenario: The prompts say a flag is never a block
    Given qa.md and qa.toml Mode: RED, the wave runner's QA-Red prompt, and the canonical and Codex sprint-execution SKILL §C.3
    Then each says a flagged seal is returned as WRITTEN with its FLAGS and BLOCKED is only for a scenario that cannot be expressed as a test or a seal that could not run
    And qa.md and qa.toml no longer say "do not return `QA-RED: WRITTEN` until the seal is clean"
    And no wave runner prompt matches approved, confirmed or authorized
```

**§3.1 File surface** (cli repo, base `main` 71b57d9, no upstream, no contract)

| File | Change |
|---|---|
| `scaffold/core/.cleargate/scripts/qa_red_lint.mjs` | R1 |
| `scaffold/core/.cleargate/scripts/seal_red.mjs` | R2 |
| `scaffold/core/.cleargate/scripts/wave_runner.js` | R3 prompt `:65`; R4 `:138` |
| `scaffold/hosts/claude/.claude/agents/qa.md` | R3 (steps 8, 9, BLOCKED line) |
| `scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md` | R3 (§C.3) |
| `scaffold/hosts/codex/.codex/agents/qa.toml` | generated (`gen:codex`) |
| `scaffold/core/.agents/skills/sprint-execution/SKILL.md` | generated (`gen:codex`) |
| `test/scripts/r-volume-added-tests.red.integration.node.test.ts` | red: Sc1, Sc2. Real git; fixture copies `scripts/**` incl. `lib/` (FLASHCARD #qa-red #scripts); `arch.typecheck ''`, `qa_red_lint true`; Go files (regex count, no toolchain); item file with 3 scenarios |
| `test/scripts/wave-runner-flagged-seal.red.node.test.ts` | red: Sc3 (stub-agent harness as in `wave-runner-sandbox-fixes.red`) |
| `test/docs/flag-is-not-a-block.red.node.test.ts` | red: Sc4 (RED slices, runner prompt via a stub run, SKILL §C.3 canonical + Codex) |

About 40 LOC of code and 6 lines of prose. No dependency (Node built-ins and git only).

**Lane / complexity.** `assign_lane.mjs` computes **runtime**: two subsystems (`scaffold/core`, `scaffold/hosts`); rule
`subsystems >= 2` (`assign_lane.mjs:16`). The computed lane is the floor; keep it. Complexity **L2**.
`expected_bounce_exposure: med` (runner routing plus agent prose). `parallel_eligible: y`. Merges alone.

## 5. Open decisions (orchestrator ratifies under the owner's delegation)

1. **OD-1: count rule.** Per-file `max(0, HEAD − base)` against `merge-base(--sprint-branch, HEAD)`, not a diff of added
   declarations. Limitation: deleting an inherited test while adding one nets 0 (undercount). The cap is a volume
   heuristic, so this is accepted. **Recommend: yes.**
2. **OD-2: runner backstop.** Treat a QA-Red BLOCKED that cites only lint flags as a flagged seal. The structural test is
   `sealed_sha` + `scan_exit 1` + flags ⊆ {`qa_red_lint`}; the runner cannot read free text. A prompt-only fix is not
   deterministic: the same prompt returned WRITTEN in 5a and BLOCKED in 6. A real spec gap that QA-Red sealed around still
   surfaces at the Developer (`Spec-Gap`) or QA-Verify (`defect_in spec`). **Recommend: yes, in this story.**
3. **OD-3: S38 story-plan path wording (`wave_runner.js:62`).** Wording alone does not fix S38. Under the background-session
   guard the Architect cannot write the shared checkout whatever the prompt says (a halt instead of a hand `mv`). Without
   the guard the relative path already resolves to the session checkout. Run 6, with `--settings`, did not hit it.
   **Recommend: leave S38 to next sprint**, with SKILL A.2 guidance and preflight detection of the guard.
4. **OD-4: amend STORY-066-07's decision.** 066-07 §1.2 ("does not return `QA-RED: WRITTEN`" on exit 1) is superseded by R3.
   The EPIC-066 §6 owner decision ("flagged above twice the scenario count") stands: the flag stays, only its routing
   changes. **Recommend: record a Mid-Sprint Amendment line for STORY-066-22 in sprint-context and a §6 roster line (rule 9)
   before drafting.**
5. **OD-5: release.** 0.31.0 waits for run 7 on rc.7 (cli main after 066-22) in the plain layout, plus the worktree replays
   in §6. A full worktree-layout run is not repeated: 5a met section C on rc.5, and the rc.5 → rc.7 delta is merge_story
   (replay-v2, already proven on rc.6) plus this layout-independent seal/lint/prompt change. **Recommend: yes.** Record run 6
   as "NOT MET (S41)" whatever option A's re-launch yields.

## 6. Run 7 must show (RC 0.31.0-rc.7 = cli main after STORY-066-22)

**Full run (plain layout, fresh `cg-sandbox-s46-3b`, driver passes `--settings` on start and every resume):**
1. Run-3 criteria 1–10 and the section C bar: halts only at Gate 2, the walkthrough and Gate 4. 0 hand steps, 0
   hand-dispatched stages, 0 `--force`, 0 `.active` edits. Architect dispatches per item equal `stages_run`.
2. Transcript grep `spec-contradiction` returns nothing. No verdict is BLOCKED.
3. Every seal line for an item that listed another item's sealed file (001-04's `main_red_test.go` or `main_test.go`) has no
   `qa_red_lint` in `flagged_checks` unless that item itself added more than 2×S tests. The seal JSON `tests` equals the
   item's own added count (001-04: 3).
4. 001-04 `stages_run` is `[qa-red, developer, qa-red, developer, qa-verify]` when the Developer `Red-Test` bounce recurs,
   or `[qa-red, developer, qa-verify]` when QA-Red edits 001-03's test up front. No `architect-tpv` / `architect-review`
   unless a non-volume flag appears.
5. rc.7 tarball smoke: `qa_red_lint.mjs` contains `CLEARGATE_RED_BASE`. `qa.toml` does not contain `until the seal is clean`.

**Replays (no model calls; worktree layout covered without a full run):**
- **Replay A, 5a case (Claude session worktree layout).**
  - Setup: in a scratch copy of `cg-sandbox-s46/.claude/worktrees/sprint-S-01` with rc.7's scripts installed, cut
    `.worktrees/STORY-001-04` from 162763d, then write `cmd/tally/main_test.go` and `cmd/tally/top_red_test.go` as at 3dfcedf.
  - Run: seal both with `--sprint-branch sprint/S-01`, from inside the story worktree with its own copy (4a's command).
  - Pass when: exit 0, `tests 3`, `flags []`; the seal line and report are in the session's sprint dir; the story worktree
    is clean.
- **Replay B, run-6 case (plain layout).** Run it after the live session ends, in a scratch copy of `cg-sandbox-s46-3b`.
  - Setup: cut a worktree from 67b65e3 and apply b842a61's one-line diff.
  - Run: seal both files.
  - Pass when: exit 0, `tests 3`, no `qa_red_lint` in the report.
- **Replay C, runner.** Run rc.7's `wave_runner.js` under the stub harness, feeding the run-6 journal's three results
  verbatim (QA-Red pass 1, Developer `Red-Test`, QA-Red pass 2 `BLOCKED`).
  - Pass when: the dispatch after QA-Red pass 2 is `Architect STORY-001-04` (Wiring); the segment reaches `qa-verify`; and the
    verdict's `qaSha` is b842a61.
  - This is Sc3 run against the shipped file.

## 7. Not in iteration 5 (intake lines)

- **R-enum/R-query scope.** `collectRedTestFiles(targetDir)` (`qa_red_lint.mjs:320-343`) lints every red-named file in the
  worktree, so a semantic issue in an earlier item's merged red file flags every later item's seal. After R3/R4 that costs a
  TPV pass, not a halt. Candidate: scope R-enum/R-query to the listed files when `CLEARGATE_RED_FILES` is set. Low.
- **QA-Red BLOCKED on exit 2** maps to `spec-contradiction`, not `technical-impossibility`. It halts either way, but the
  label misleads the owner. Low.
- **Seal JSON `tests` vs runner schema.** `seal_red.mjs` emits `tests` as a number, while `wave_runner.js:20` declares an array
  of strings (agents return file lists). Low.

Version check skipped: no dependency is added or changed.
