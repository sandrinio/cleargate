role: qa
STORY: STORY-066-12
Mode: VERIFY
QA: PASS (T5 integration-gated: stays red until the merge lane integrates 03-11)
TYPECHECK: pass
TESTS: loop-spec-three-paths.red 7/8 (T5 red, gated); codex-sprint-execution-render.red all pass; skill-md-serial-pointers.red all pass; M3 pinned set 169/169 pass; qa-content.integration 22/22 (same as base); build-codex-payload --check exit 0; npm run prebuild ok; gen:codex leaves no diff (git status clean)
ACCEPTANCE_COVERAGE: 4 of 5 fully green; Scenario 3 half green (T4 text vs table/exit rows pass; T5 real-script usage gated on 066-08/10/11 merge)
MISSING: none (T5 is the only red, by design)
REGRESSIONS: none

## Classification of reds (worktree vs read-only base f846d9a, same files, test-name diff)
Base has no prebuild (templates/ absent) so a few base-only reds are env artefacts (qa.md payload parity, "diff against templates canonical copy"); ignored.
(i) baseline (also red at base, same cause):
 - agent-developer-section.integration Scenario 2: test bug, `assert.strictEqual(live, '<message>', scaffold)` compares live to the message string; always red when live exists.
 - readme-qa-doc-truth-043-06 s1_d/s1_e/s2_a-c: outer README, untouched.
 - sprint-execution-mirror.integration Scenario 7 parent name red at base (prebuild absent). See (iii) for the sub-test this story adds.
(ii) rule-18 known reds already listed / named by M3: sprint-execution-mirror Scenario 7 and agent-developer-section Scenario 2 (M3 Risks) ; 5a/5b ; S1c ; template-stubs Sprint Plan Template live===mirror ; serial-dispatch-docs.live Test 26 is protocol parity (rule 18 lists Test 27 for 05; 26 is new, see iii).
(iii) NEW live-vs-canonical parity reds caused by this story's canonical edits (rule 11, expected; log in sprint section 6). Verified: live file == base canonical for every edited file, so the sole divergence is this story's edit.
 1. test/scaffold/canonical-live-parity.red.integration: "5a: .cleargate/templates/*.md canonical = live" (Sprint Plan Template.md, story.md) and "5b: .cleargate/knowledge/*.md canonical = live" (cleargate-protocol.md). 5c is skipped in the worktree, so agents parity (architect/synth/developer/reporter) is not exercised here and will start red at merge-lane run.
 2. test/scaffold/sprint-execution-mirror.integration: Scenario 7 sub-test "diff command on live vs canonical returns empty output (byte-for-byte match)" (SKILL.md); Scenario: "Live and mirror templates are byte-identical"; "Mirror parity for both templates (STORY-025-04)"; also under it "Scenario 5: agents/templates/knowledge/hooks dirs parity" (parent of 5a/5b).
 3. test/docs/claude-md-block-leads-relocation.live.integration (parent "CR-105 outer-half doc-truth"): test 3 "bounded-block BODIES hash-match" (CLAUDE.md block, R10). This one blocks `cleargate doctor` as a claude-md-block-mismatch drift until live re-sync at Gate 4.
 4. test/docs/gate-section-index-pinning.live.integration: S1c (live vs canonical readiness-gates + eight templates).
 5. test/docs/contract-first-dag-text.live.integration: "T5 (red): canonical/live Sprint Plan Template byte-identical".
 6. test/scripts/template-stubs.integration: "Sprint Plan Template: live === mirror", "template Sprint Plan Template.md: live === mirror", "template story.md: live === mirror".
 7. test/docs/serial-dispatch-docs.live.integration: "Test 26 canonical/live protocol are byte-identical, and 23.5 present" (protocol :28, :951).
 Not in the Developer's list, found here: items 2 sub-tests "Live and mirror templates are byte-identical" / "Mirror parity ... STORY-025-04", template-stubs story.md, claude-md-block-leads-relocation parent name.
(iv) regressions: none. Every worktree-only red above is a live-vs-canonical diff in a file this story edited.

## Gherkin trace
 S1 @paths: T1 pass. Table in SKILL.md (section 5/C intro) rows equal stagesFor: fast developer,merge; standard qa-red,architect-tpv(scan-flagged),developer,qa-verify,architect-review(scan-flagged),merge; runtime story-plan,qa-red,architect-tpv(scan-flagged),developer,qa-verify,architect-review,merge. Read against segment_stages.mjs (C1): identical incl. `when`. All seven STAGE_NAMES head `stage \`<name>\`` notes. Clean-path counts 1/3/5 correct.
 S2 @rules: T2, T3 pass. No `plans/M`, `Phase B` only as 2-line stub (`## 4. Phase B — removed`), architect.md `## Mode: STORY-PLAN` with 150 cap, `plans/<ID>.md`, Task Breakdown; GOAL_RELATION in SDR item 1 and Template 2.1; reporter reads it from SDR.
 S3 @rules: T4 pass (merge_story.mjs <ID> --sprint <SPRINT-NN>; exit rows 0,2,3,4,5; DevOps only in rows 4/5; no ACTIONS/Escape Hatch/Required reports; Forbidden line; unset SKIP_FLASHCARD_GATE (C.0.1 step 4) before first merge_story.mjs (step 8)). T5 real-usage red, gated; QA must re-run at merge lane.
 S4 @interfaces: T6, T7 pass. --check exit 0; developer.md plan input + regression-test-first + merge_story.mjs gate; dispatch-serial step 3 (`stages`, merge_story.mjs) and section 5 (`lane`, `stages_run`); prep_qa_context plan_path Story-plan then M*.md; prep_reporter_context `## Story Plans` after milestone plans, "No milestone plans" only when neither. T7 spawns the real canonical prep scripts on a temp git fixture (stageCanonicalScripts), which covers the requested fixture run; no throwaway dirs were created by QA.
 S5 @rules: T8a/T8b pass (runtime row with `prove` throws; fast row without `merge` throws).
 R1-R10: R1 stub + roster/budget row ok; R2 table + C.0.1 nine barrier steps ok, C.0.2 tail ok; R3 C.3 seal_red last step, C.3.5 seal scan, C.4 plan input, C.5 run-and-probe + DEFECT_IN routing, C.6 gating by lane ok; R4 C.7 per M3; R5 dispatch-serial ok; R6 architect.md/synth ok; R7 developer.md ok; R8 only R3 touched in generator, check exit 0; R9 diff matches M3; R10 reporter, protocol :28/:951, README :48, CLAUDE.md block, story.md ok.
 Plan deviations: (1) C.0.1 heading kept as "the `launch_wave` contract": M3 explicitly says keep `launch_wave` (wave-execution-barrier pins) and the C.0.1 heading; matches. (2) architect.md Post-Flight "3 agents, <=4 dispatches with DevOps on conflict or post-merge failure" wording: M3 C-12 widens R6 to architect.md Post-Flight/Guardrails; matches. Both are M3-directed, not deviations.
 Task Breakdown rows are unticked (detached host, rule 20; orchestrator ticks at merge). Advisory only.

## Surface
 git diff --name-only 47901fe..bbe48dc: 23 files, all in 3.1 or R10 list or the three red files from ec94f09 (loop-spec-three-paths.red, codex-sprint-execution-render.red, skill-md-serial-pointers.red). Developer commit bbe48dc alone touches no test/ file (sealed reds intact). Note 3.1 names `loop-spec-three-paths.node.test.ts`; C-7 renames it `.red`; fine.
 Observed nits (not failing): C.7 prose has two DevOps mentions outside the table (lead line, "DevOps does NOT auto-resolve" sentence), M3 wanted DevOps only in rows 4/5 within the table; T4 passes.

## Carry to merge lane
 Re-run T5 and the dev-report "text written against M3 pins" items (seal_red keys SEALED_SHA/SCAN_EXIT/FLAGS, wave_runner_args flags, merge_story exit table, update_state --defect-in) against the real merged scripts; then `npm run gen:codex` + `--check`.

flashcards_flagged:
  - "2026-11-15 · #qa #test-harness · agent-developer-section Scenario 2 asserts live against its own message string; always red when live exists"
  - "2026-11-15 · #qa #worktree · a base worktree without prebuild fails payload-parity tests; diff test names, don't count failures"

## Second pass — integrated tree
role: qa · Mode: VERIFY · worktree .worktrees/STORY-066-12/cleargate-cli @ c4cab66 (main 75fe664, 03-11 merged)
- typecheck: pass. Group 1 (loop-spec-three-paths.red, codex-sprint-execution-render.red, skill-md-serial-pointers.red): 15/15 pass, T5 now green. Group 2: 44/44. Group 3: 125/125. prebuild (incl. build-codex-payload --check): exit 0. gen:codex: no diff; git status --porcelain empty.
- Scenario 3 / T5: executes real merge_story.mjs (no args: exit 2, usage names --sprint/--worktree and exit codes 0,2,3,4,5), wave_runner_args.mjs usage flags, seal_red.mjs presence, update_state.mjs `--defect-in`. Read-through: SKILL §C.7 table 0/2/3/4/5 matches MERGE_EXIT; exit 3 text (fast demoted via --lane-demote, other lanes to Developer) matches merge_story.mjs:338-345; 4 conflict and 5 post-merge match; nothing contradicts post_merge_test / NOT TESTED. §C.0.1 flags match wave_runner_args usage; defects_in replay matches update_state usage; seal_red keys match C.3/C.3.5. Stage table equals segment_stages.mjs stagesFor (incl. `when`).
- Regions: architect.md keeps 05's assign_lane Lane Audit/Lane Classification and 12's STORY-PLAN/TPV/Post-Flight; Sprint Plan template keeps 05's Lane Audit row text and 12's GOAL_RELATION; story.md keeps 05's lane text; prep_qa_context.mjs keeps 04's baseline block (source baseline.json), 09's commands/proof block, 12's story-plan-first block.
- Regressions: none. Nit unchanged: two DevOps mentions in C.7 prose outside the table.
