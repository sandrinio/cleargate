# SPRINT-46 iteration 4: scoping (sandbox run 4a findings)

role: architect · 2026-11-15 · code read at cli `main` 5198aaa (read only). Evidence: 4a transcripts
`~/.claude/projects/-Users-ssuladze-Documents-Dev-cg-sandbox-s46--claude-worktrees-sprint-s-01/e726eda3-….jsonl` (line
numbers below are JSONL lines) and its wave journals; 4a checkout `.claude/worktrees/sprint-s-01` (git log, `git ls-files
.cleargate/sprint-runs`); run 3 checkouts `cg-sandbox-s46-run3`, `cg-sandbox-s46-3b-run3` for comparison.

Bar: owner's section C (sprint-context amendment 2026-11-15, field-trials "Run 3 result"). Run 4a broke "0 hand-dispatched
stages" (finding 2) and needed a hand file move before a merge (finding 1). Proposed: **one story, STORY-066-21, four
requirements.**

## Prior work

[[BUG-074]] (Triaged; recommends excluding `.cleargate/sprint-runs/**` from the clean-tree check; never built:
`validate_bounce_readiness.mjs` last changed in 66ed73a, a file move, so 066-08 did not touch it). [[BUG-103]] (approved
SPRINT-41: the code half "ignore `.cleargate/wiki/**`" was never built; its decision makes `chore(SPRINT-NN)` bookkeeping
commits on `sprint/S-NN` legitimate, which is how `.active` reaches story worktrees; its item 5 is this finding's class:
an agent inside `.worktrees/STORY-*` writes to the worktree's copy of the sprint dir). [[BUG-107]] (approved, never landed;
its (a) moves `run_script.sh` to the parent of `--git-common-dir`, which has the flaw described in R1 below; 066-08
absorbed the teardown half as `isWorktreeResidue`). [[CR-086]] decision (`.active` resolves from the main checkout, single
writer): R1 resolves to the checkout that owns the story worktree, which is the main checkout in the plain layout and the
session worktree (the only `.active` writer) in the Claude-managed layout, so the decision holds. [[BUG-137]] (Draft;
option (b) "use whichever root has a non-empty `.active`" would pick a story worktree whose `.active` is committed; it should
reuse R1's resolver). [[BUG-138]], [[BUG-109]] (incidents in story worktrees; unchanged here). No item covers the seal report
or `pre-gate.jsonl` location or the expected-red record.

---

## 1. Finding 1: merge refused on scan output inside the story worktree

**Verified sequence (4a).**
- L200–L217: the orchestrator ran SKILL §C.1 `validate_bounce_readiness.mjs`; check (d) failed on `?? .cleargate/sprint-runs/`
  and `?? .cleargate/wiki/` (L212). It committed both (e37d0de, including `.cleargate/sprint-runs/.active`), then cut the
  three story worktrees from `sprint/S-01` (L222). At L243 it names `validate_bounce_readiness.mjs` as the reason. Run 3's
  orchestrators never ran §C.1, so `.active` was first committed at close (a28e7b7, 7c18e4f).
- QA-Red for 001-03 (wave journal agent a63f3295, 16:34:32) ran, from inside the story worktree,
  `bash .cleargate/scripts/run_script.sh node .cleargate/scripts/seal_red.mjs STORY-001-03 --worktree . …`: the WORKTREE's
  copy. 001-02 (`cd ../..` first) and 001-04 (`../../.cleargate/scripts/…`) ran the session root's copies, and their outputs
  landed correctly. Where the outputs go therefore depends on how an agent types the command.
- L326/L327: `merge_story.mjs STORY-001-03` exit 2 `precondition`, `uncommitted work in the worktree: ?? …/pre-gate.jsonl,
  ?? …/reports/STORY-001-03-pre-arch-scan.txt`. L331: hand `mv`/`cat >>`, then the merge passed.

**Root cause (file:line).**
- `seal_red.mjs:20-21` `ROOT = SCRIPT_DIR/../..`; `:216-223` reads `ROOT/.cleargate/sprint-runs/.active` and moves the report
  to `ROOT/.cleargate/sprint-runs/<sprint>/reports/<ID>-pre-arch-scan.txt`. Run from a story worktree's copy, ROOT is the
  worktree. With a committed `.active` the report is written into the worktree. With no `.active`, or an empty one,
  `:224-226` deletes it.
- `pre_gate_runner.sh:349-350` `REPO_ROOT_FOR_LANE = SCRIPT_DIR/../..`; `:367-378` appends the CR-120 line to
  `<that root>/.cleargate/sprint-runs/<sprint | _off-sprint>/pre-gate.jsonl`, and `:362-364` read lane state and the sprint
  plan from that root.
- `merge_story.mjs:82-88` `isWorktreeResidue` exempts only `.cleargate/reports/`, `/.script-incidents/` and modified delivery
  files; `:355-356` refuses anything else.
- `validate_bounce_readiness.mjs:86-103` (d) is a bare `git status --porcelain`. SKILL `:301-310` says "Fail → halt", so an
  orchestrator that follows it must either halt outside the three gates or commit runtime state.

**Corrections to the dispatch's diagnosis.**
- "In run 3 the same mistake silently deleted the report": not observed. Every 3a/3b report and arch line is in the root
  (`git ls-files` there), because all run-3 QA-Reds used root copies. The defect was latent. With no `.active` in the
  worktree, a worktree-copy seal deletes its report and writes `_off-sprint/pre-gate.jsonl` inside the worktree, and that
  file is not residue either, so the merge would have been refused the same way.
- It does not depend on orchestrator choice from a target's second sprint on: close Step 7.8 commits an empty `.active`
  (a28e7b7, 7c18e4f, `| 0`), so every later sprint branch, and every story worktree cut from it, tracks an empty `.active`.
- "One incident file was lost at teardown": not reproduced. All four 4a incident files (162347Z, 163547Z, 164159Z, 164207Z)
  are in the session's sprint dir. The orchestrator also moved 001-04's incident files by hand before its merge (L405), which
  was unnecessary because `.script-incidents/` is residue and teardown copies it (`merge_story.mjs:298-305`). That `mv` also
  pulled two tracked copies out of that worktree.
- **The proposed R1 mechanism is wrong for the Claude-managed layout.** From a story worktree,
  `git rev-parse --git-common-dir` is `/…/cg-sandbox-s46/.git`, so its parent is the parent checkout, on `main` with no
  `.active`. The sprint lives in `.claude/worktrees/sprint-s-01`. That rule would send outputs to the parent's `_off-sprint`,
  the BUG-137 failure, and the TPV prompt (`wave_runner.js:74`, relative to the session root) would still miss the report.

## 2. Finding 2: hand-dispatched Architect post-flight for STORY-001-02

**Verified sequence.** QA-Red 001-02's seal returned `{"scan_exit":0,"flags":[],"expected_red":["internal/tally/top_red_test.go:9:9:
undefined: TopN"],"scan_exit_raw":1}` (agent a6c5ebb3). The runner's journal holds only `scan_exit 0, flags []`. The orchestrator
read `reports/STORY-001-02-pre-arch-scan.txt` (`[FAIL] typecheck`) and `pre-gate.jsonl` (`"mode":"arch","item":null,"exit":1,
"flagged_checks":["typecheck"]`) and called that a misreport (L307 issue text). `wave_runner_args --from architect-review`
refused (L308), so it hand-dispatched "Architect STORY-001-02 — post-flight review" (L314). It then recorded two sandbox
flashcards that are now wrong (L353: read the report rather than the seal; expect TPV/post-flight on every Go item).

**Root cause (file:line).**
- `seal_red.mjs:204-214` reclassifies in the JSON only. The moved report keeps the raw `[FAIL]`, which iteration-3 §6 chose
  ("the report file still shows the raw `[FAIL]`"). `pre_gate_runner.sh:367-378` has already logged `exit: 1`, and its item
  is null because the seal passes the sprint branch (`:353-356` gets no id from it).
- `wave_runner.js:17-23` red schema and `:65` prompt carry `sealed_sha, scan_exit, flags, tests, scenarios`. `expected_red`
  is dropped. `qa.md:52-61` has no `EXPECTED_RED` field either.
- SKILL §C.3.5 `:380` defines "flagged" by the seal JSON, but the non-removable Safeguard (`:387`, and again `:485`) says "ANY
  pre-gate flag … MUST still dispatch the live Architect". The raw `pre-gate.jsonl` line is a "pre-gate flag", so the
  playbook contradicts itself, and the orchestrator followed the Safeguard. Nothing says a GREEN verdict's `stages_run` is
  final (§C.0.1 `:280-284`).

---

## 3. Fix set (dispatch candidates R1–R4: accepted, changed or cut)

**R1 — Scan outputs land in the sprint root, whichever copy runs** (changed mechanism).
New `scaffold/core/.cleargate/scripts/lib/sprint-root.mjs`: `export function sprintRoot(dir)` plus a CLI mode
(`node lib/sprint-root.mjs <dir>` prints it, exit 0). It takes `d = realpath(dir)`. If `basename(dirname(d)) === '.worktrees'`
(ClearGate's story-worktree convention, `<root>/.worktrees/<ID>`: SKILL §C.2, `wave_runner_args` `worktreeCommands`,
`merge_story.mjs:281`) and `c = dirname(dirname(d))` has the same realpath'd `git rev-parse --path-format=absolute
--git-common-dir` as `d`, it returns `c`. Otherwise it returns `d` (today). It never throws.
- `seal_red.mjs`: `ROOT = sprintRoot(SCRIPT_DIR/../..)` (used by `findItemFile` and the report move). No-sprint behaviour
  (`:224-226`) is unchanged.
- `pre_gate_runner.sh:349`: `REPO_ROOT_FOR_LANE="$(node "${SCRIPT_DIR}/lib/sprint-root.mjs" "${SCRIPT_DIR}/../.." 2>/dev/null
  || (cd "${SCRIPT_DIR}/../.." && pwd))"`. The fallback keeps fixtures that copy scripts without `lib/` on today's path.
  `CONFIG_FILE` stays `SCRIPT_DIR`-relative.
- Existing fixtures (`seal-red*.integration`, `subagent-ledger.red` CR-120, `pre-gate-any-stack.red`) use a non-git or
  non-`.worktrees` root, so their behaviour is unchanged.
- Not changed: `prep_qa_context.mjs` (QA reads its pack at a cwd-relative path, so re-rooting it from inside a worktree would
  turn carried residue into a missing pack) and `run_script.sh` (BUG-107/109). R2 backstops both.

**R2 — `merge_story.mjs` carries ClearGate runtime files out of a story worktree** (accepted, narrowed).
- `isWorktreeResidue` adds paths under `.cleargate/sprint-runs/<seg>/` that are in `reports/**`, are `.qa-context-*.md`, or
  have a basename in `DERIVED_SPRINT_RUN_FILES`, with any status. `plans/**` stays not-residue: the sealed
  `test/scripts/merge-story.red.node.test.ts:74` pins `res('??', '…/plans/M1.md') === false`, and that is kept.
- Teardown (`:295-306`, beside the incident copy, which is unchanged): each untracked such file goes to the same relative path
  in `root`. `*.jsonl` lines are appended. Any other file is copied when absent. When the root already has it, the root's
  file stays and a tail line names the dropped copy (`not carried (the sprint dir has its own): <rel>`). Tracked-modified
  ones are residue but not carried.
- One tail line `carried from the worktree: <n> file(s)`. The precondition (`:355`) uses the same widened rule.

**R3 — Runtime state is not dirt for the loop's clean-tree checks** (changed: path rule, not `classifyDirtyPath`; plus `.active`).
- `validate_bounce_readiness.mjs` (d): `git status --porcelain=v1 -z --untracked-files=all`, ignoring entries under
  `.cleargate/sprint-runs/`, `.cleargate/wiki/`, `.cleargate/hook-log/` (any status). Everything else is dirt as today,
  including untracked user files, which `classifyDirtyPath` would ignore; that is BUG-074's "dirty `src/` still fails". The
  stderr lists only the remaining entries.
- `merge_story.mjs` `classifyDirtyPath`: `.cleargate/sprint-runs/.active` → `'derived'` (set aside and written back like
  `state.json`). Otherwise, from a target's second sprint on, `init` makes the committed empty `.active` ` M` and the root
  precondition (`:352-354`) refuses every merge as "authored". Additive: `DERIVED_SPRINT_RUN_FILES`, which a sealed test pins
  exactly (`merge-story.red.node.test.ts:45`), is not edited.
- Absorbs BUG-074 and BUG-103's code half.

**R4 — An expected red reads as clean on disk and in the playbook** (changed: records + playbook, no runner schema change).
- `seal_red.mjs`, every seal: append one line to `<ROOT>/.cleargate/sprint-runs/<sprint | _off-sprint>/pre-gate.jsonl`:
  `{"ts","mode":"seal","item":"<ID>","exit":<scan_exit>,"raw_exit":<scan exit>,"flagged_checks":[…flags],"expected_red":[…]}`
  (`expected_red` only when classified).
- On a classified seal, before the move, also append to the report:
  `[INFO] expected_red: seal_red.mjs read this typecheck failure as the expected red (only not-yet-written symbols in the
  sealed red files); seal scan_exit 0 (raw 1). Not a flag; no Architect pass.` followed by `  | <diagnostic>` lines. Nothing
  reads `[INFO]` blocks as flags (`seal_red.mjs:200`, `merge_story.mjs:94-109`).
- `qa.md` RED: step 9 says an exit-0 seal with `expected_red` is clean and not a flag. The output shape gains
  `EXPECTED_RED: <expected_red from seal_red.mjs, or none>` (additive to `qa-red-seal-content.node.test.ts` REQUIRED).
- SKILL:
  - §C.3.5 after `:380`: "An expected red is not a flag: when the seal JSON carries `expected_red`, the report's raw
    `[FAIL] typecheck` and the scan's `exit: 1` line in `pre-gate.jsonl` are red tests naming symbols the item has not
    written yet; the report's `[INFO] expected_red:` line and the seal's `mode: \"seal\"` line say so. No Architect pass runs
    for it, and the Safeguard does not cover it."
  - §C.0.1 step 5: "The runner already ran every stage the seal called for: a GREEN verdict's `stages_run` is final; never
    dispatch a stage the runner skipped."
  - §C.7: "`merge_story.mjs` carries ClearGate's runtime files out of a story worktree (incident files, scan reports, ledger
    lines); never move them by hand."
  - The Safeguard texts stay as they are (their loose pins in `skill-md-conditional-architect.red` S3 still hold).
- Cut: adding `expected_red` to `wave_runner.js`'s red schema. The verdict never carries red fields to the orchestrator, and
  the runner is pinned by sealed runner tests.

## 4. File surface (cli repo, base `main` 5198aaa, no upstream)

`scaffold/core/.cleargate/scripts/lib/sprint-root.mjs` (new), `…/scripts/seal_red.mjs`, `…/scripts/pre_gate_runner.sh`,
`…/scripts/merge_story.mjs`, `…/scripts/validate_bounce_readiness.mjs`, `scaffold/hosts/claude/.claude/agents/qa.md`,
`scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md`; generated by `npm run gen:codex` then prebuild
(`build-codex-payload.mjs --check`): `scaffold/hosts/codex/.codex/agents/qa.toml`,
`scaffold/core/.agents/skills/sprint-execution/SKILL.md`. About 110 LOC of code and 6 lines of prose. No dependency.

## 5. Red tests (≤2 per requirement, real git, no mocks)

Shared fixture: a git repo whose `.cleargate/scripts/**` (incl. `lib/`, `gate-checks.json`) and item file are committed on
`sprint/S-99` together with `.cleargate/sprint-runs/.active`. The story worktree is cut with
`git worktree add <root>/.worktrees/STORY-909-01 -b story/STORY-909-01 sprint/S-99`. Seals run the WORKTREE's copy with
cwd = worktree, the 4a command verbatim. `arch.typecheck` is a canned command. Seals that must leave the worktree clean exit
0, so `run_script.sh` writes no incident (BUG-109).

| # | File | Asserts |
|---|---|---|
| R1-T1 | `test/scripts/sprint-root-outputs.red.integration.node.test.ts` | Plain layout, sprint-2 shape (committed `.active` empty; root holds `SPRINT-99` uncommitted): report at `<root>/…/SPRINT-99/reports/STORY-909-01-pre-arch-scan.txt`; arch line in `<root>/…/SPRINT-99/pre-gate.jsonl`; `git -C <wt> status --porcelain --untracked-files=all` empty |
| R1-T2 | same file | Claude-managed layout: parent repo on `main`; session `<parent>/.claude/worktrees/s` on `sprint/S-99` (committed `.active` = `SPRINT-99`); story worktree `<s>/.worktrees/STORY-909-01`: outputs in `<s>`, nothing new under `<parent>/.cleargate/sprint-runs`, story worktree clean |
| R2-T1 | `test/scripts/merge-story-carry.red.integration.node.test.ts` | Untracked `…/SPRINT-99/reports/<ID>-pre-arch-scan.txt` and a one-line `…/SPRINT-99/pre-gate.jsonl` in the worktree; root has its own one line: exit 0, `step: done`; root report has the worktree's bytes; root jsonl = root line then worktree line; worktree removed |
| R2-T2 | same file | Root already has a different report: root's bytes unchanged, tail has `not carried (the sprint dir has its own): …`, exit 0 |
| R3-T1 | `test/scripts/bounce-readiness-runtime-state.red.integration.node.test.ts` | `Ready to Bounce` + untracked sprint-runs, ` M .active`, ` M .cleargate/wiki/index.md`, untracked hook-log → exit 0; then untracked `cmd/new.go` → exit 1, stderr names `cmd/new.go` and no `.cleargate/` path (spawned: the script has no main guard) |
| R3-T2 | `merge-story-carry.red.integration…` | Root on `sprint/S-99` with committed empty `.active` modified to `SPRINT-99` → merge exit 0; `.active` reads `SPRINT-99` afterwards |
| R4-T1 | `sprint-root-outputs.red.integration…` | Go undefined-only canned block: report ends with `[INFO] expected_red:` + `  | ` diagnostic; last jsonl line `mode "seal"`, `item "STORY-909-01"`, `exit 0`, `raw_exit 1`, `expected_red` non-empty. Non-undefined error: seal line `exit 1`, `flagged_checks` has `typecheck`, no trailer |
| R4-T2 | `test/docs/expected-red-not-a-flag.red.node.test.ts` | qa.md and qa.toml RED slices contain `EXPECTED_RED`; canonical SKILL contains the three sentences' key phrases (`expected red is not a flag`, `stages_run` … `final`, `never move them by hand`); the Codex SKILL contains each that its render keeps |

Pinned seams for the story plan: `sprintRoot` signature and CLI; the seal-line keys; the trailer's first-line prefix
`[INFO] expected_red:`; the `not carried` tail text.

## 6. Lane, size, upstream

`assign_lane.mjs` computes **runtime**: two subsystems (`scaffold/core`, `scaffold/hosts`) and 4–5 scenarios. Keep it: R1/R2
touch the merge and scan path every item uses, and a post-flight is wanted. Complexity **L2**, one story. Base cli `main`
5198aaa. No upstream, no contract. Merges alone.

**What would make it bigger than L2 (all excluded; each is intake):**
- (1) Re-rooting `run_script.sh` incidents (BUG-107a/109; wrapper tests, `CLAUDE_PROJECT_DIR` precedence, BUG-137
  interplay).
- (2) Re-rooting `prep_qa_context.mjs`.
- (3) `expected_red` in `wave_runner.js`'s schema or verdict.
- (4) Treating untracked `plans/**` as residue: this re-scopes a sealed 066-08 red (rule 16).
- (5) Hook root resolution (BUG-137/CR-086).
- (6) Protecting other items' sealed tests in the surface gate (run 4b).
- (7) Removing §C.1 from the wave path.

## 7. Risks

- R1 relies on the `.worktrees/<ID>` placement. A worktree made elsewhere (`merge_story --worktree <custom>`) keeps today's
  behaviour, and R2 carries its residue.
- R1 also re-roots `pre_gate_runner.sh`'s lane routing for worktree-copy runs: a fast item scanned from its worktree now
  updates the real `state.json`. That is correct, but it is a behaviour change.
- `--path-format=absolute` needs git ≥ 2.31 (local 2.50.1). Older git → `git` fails → today's root.
- R2 jsonl append can duplicate a line someone already copied by hand (as 4a did). That is harmless.
- `mode: "seal"` lines are new in `pre-gate.jsonl`. No script reads the file (grep: writers and tests only).
- The flashcards the 4a orchestrator wrote stay wrong in that sandbox. In a real target such cards would keep steering
  orchestrators to hand dispatches (intake). Run 5 starts from fresh sandboxes.
- Rule 18: canonical-live parity reds extend to the four scripts, `qa.md` and SKILL. The Gate 4 re-sync must copy
  `lib/sprint-root.mjs` and the four scripts (init skips existing scripts, 066-18 OD-5).

## 8. Run 5 must show (RC 0.31.0-rc.5 from cli `main` after STORY-066-21; fresh 5a worktree-session and 5b plain sandboxes)

1. Run 3's criteria 1–10 and the section C bar PASS in both layouts again: 1 / 3 / 5 / 3 dispatches, and Architect dispatches
   per item equal `stages_run` (no `post-flight`/`TPV` description outside the runner).
2. For every sealed item: `reports/<ID>-pre-arch-scan.txt` and a `"mode":"seal","item":"<ID>"` line are in the session (5a) /
   checkout (5b) sprint dir, whichever cwd QA-Red sealed from. For a Go item with an expected red: the report's
   `[INFO] expected_red:` line and the seal line's `expected_red`.
3. No `merge_story.mjs` exit 2 at `precondition`. No orchestrator `mv`/`cp`/`cat >>` on `.worktrees/*/.cleargate`
   (transcript grep). If a merge carried files, its tail names them.
4. If an orchestrator runs §C.1 `validate_bounce_readiness.mjs`, it passes without a commit of `.cleargate/sprint-runs` or
   `.cleargate/wiki`.
5. Pre-run replay in a scratch copy (both layouts; run 5 cannot force an agent's cwd): commit `.cleargate/sprint-runs` at
   kickoff as 4a did, seal from inside the story worktree with its own copy (4a's command), then `merge_story.mjs`. Pass when
   the report and lines are in the root, the worktree is clean, and the merge exits 0. Second replay: drop 4a's two files into
   a worktree by hand; the merge exits 0 and carries them.
6. The sprint-2 `.active` case (R3 merge half) is proven by R3-T2 only. Watch it at the dispenser field trial (its first
   0.31.0 sprint after a 0.31.0 close).

## 9. Not in iteration 4 (intake lines)

- **Run 4b (coordinator):** STORY-001-04's Developer edited `cmd/tally/main_test.go`, sealed by 001-03's `qa-red(` commit. The
  surface gate protects only the item's own reds. Agree: **intake, low** (no hand step, no section C impact). It is the same
  class as run-1 S10, already in intake. Candidate: protect every file of the sprint's `qa-red(` commits (the D.5.1 set).
- **4a:** a re-seal with unchanged files exits 2 "nothing added to commit" (164207Z incident). QA-Red then edited a comment
  to force a commit (a1efda1). R-volume counted 001-03's red file that 001-04 had re-scoped, so QA-Red dropped it from the
  seal list. Candidate: a re-seal with no staged change skips the commit and re-runs the scan on the given list. Low.
- **4a:** an orchestrator-written flashcard can contradict shipped behaviour and has no correction path. Low.
- **4a:** BUG-110 (`CLEARGATE_STATE_FILE`) hit again (L201). Known, later.
- **BUG-107/BUG-137:** note on both that the `--git-common-dir` parent is the wrong root in a Claude-managed worktree session.
  Reuse `lib/sprint-root.mjs`.

## 10. Open decisions for the orchestrator (owner's /goal delegation)

1. **OD-1 R1 rule:** `.worktrees` parent of the same repository, not the `--git-common-dir` parent (wrong in layout 4a).
   Recommend: yes.
2. **OD-2 R3 rule:** path-prefix exclusion (BUG-074) for (d), plus `.active` as derived in `merge_story`, instead of
   `classifyDirtyPath`. Mark BUG-074 absorbed by STORY-066-21 and BUG-103's code half done. Recommend: yes.
3. **OD-3 R4 shape:** on-disk records + qa.md + three SKILL sentences; no `wave_runner.js` change. Recommend: yes.
4. **OD-4 Goal check (d) and release:** run 3 met the bar; run 4a (rc.4) missed it when the orchestrator ran §C.1 and
   committed runtime state, which the playbook permits. Recommend: 0.31.0 waits for run 5 on rc.5. Record one Mid-Sprint
   Amendment scope line for STORY-066-21 before drafting.
5. **OD-5 Run 4b finding:** intake, low (as the coordinator leans).

Version check skipped: no dependency is added or changed (Node built-ins and git only).
