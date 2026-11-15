# STORY-066-17 QA-Verify (role: qa, runtime lane, PRE-INTEGRATION tree 41a86ee on seal 4b225db, base bf21e96)

STORY: STORY-066-17
QA: FAIL
DEFECT_IN: code
TYPECHECK: pass (npm run typecheck; node --check on close_sprint.mjs, lib/sprint-finish.mjs, prep_doc_refresh.mjs; build-codex-payload.mjs --check exit 0)
TESTS: 0 failed in every file run (reds 9/9 x3 reruns; 20 witness files all green; bug076_077_close_path.red.sh 8/8; v21 overlay 28/28). Full suite not run (constraint).
ACCEPTANCE_COVERAGE: 5 of 5 Gherkin scenarios have a passing test (red-now-green, CR-081)
MISSING: none
REGRESSIONS: none in the witness list

## Findings

### F1 (FAIL, DEFECT_IN: code) Step 7.8 failure after `git checkout main` strands the plain layout; the documented re-run does not finish (D-8)
- Code: `scaffold/core/.cleargate/scripts/lib/sprint-finish.mjs` runFinish, step (b): `git checkout main` in root (plan.checkoutMain), then `git merge`; on a merge failure it aborts the merge and returns, leaving root on `main`.
- Repro (scratch plain repo, pre-merge-commit hook that exits 1; same path for a conflict race or an untracked-collision refusal): ack pass 1 exits 1 with "Step 7.8 FAILED ... sprint_status is already Completed. Fix the cause, then re-run the ack pass: Steps 5 and 7.8 finish what is left." Root is now on `main`. Hook removed, ack pass 2 exits 1 at the very top: `Error: sprint directory not found: <repo>/.cleargate/sprint-runs/SPRINT-01` (the sprint dir exists only on sprint/S-01; main lacks it). The only way out is a hand `git checkout sprint/S-01`. Transcript: scratchpad probe.out section B2.
- Contradicts: plan D-8 ("a re-run of the ack pass finishes"), story §1.5 mitigation, the failure text printed by close_sprint.mjs (`Steps 5 and 7.8 finish what is left`), SKILL §E.5 last paragraph and enforcement §14.2 ("Steps 5 and 7.8 are idempotent"). The plain-layout failure leaves a hand git step, the exact thing the story removes.
- The worktree layout is not affected (probe C2: the closing checkout never leaves its branch; re-run finished).
- Fix direction (not a design change): when 7.8 fails after `git checkout main`, check the original branch (`onBranch`) back out in root before returning (and say so in the error), or make the failure text name `git checkout sprint/S-NN`. A red for it goes through QA-Red (sealed tests, rule 16), not the Developer.

### Advisories (not blocking)
- A1 Second ack pass after a successful finish (plain): sprint/S-NN is gone, so 2.8 warns and 7.8 skips ("Step 7.8 skipped: Step 2.8 could not check ..."), exit 0, but Step 5 re-flips state and Step 6 rewrites `improvement-suggestions.md`, leaving two tracked modifications on `main` (state.json updated_at). Cosmetic; outcome stays Completed, main untouched.
- A2 In the worktree layout a re-run after a 7.8 failure (probe C2) makes a second `chore(SPRINT-01): close ...` commit (Step 5 rewrites state.json updated_at). Harmless.
- A3 R-6 confirmed: an untracked file in the parent colliding with a close artefact passes 2.8 and fails at 7.8 with git's message after sprint_status is Completed; removing it and re-running finished (worktree layout). Plan accepted this (R-6).
- A4 Step 4 still prints "orchestrator should now spawn the Reporter agent" when the report exists (S29, plan OD-6e, intake).
- A5 Task Breakdown rows for the Developer work are unchecked: advisory, orchestrator ticks at merge (rule 20).

## Gherkin vs code and tests
| Scenario | Evidence |
|---|---|
| 1 no-flag without report reaches Step 4 | I1 green; proof-plain/worktree [1 exit=0] shows `Step 2.5 deferred:` and Step 4 |
| 2 finish plan + checklist, written once, nothing merged | I2 green (byte-equal checklist across two runs, main sha and .active unchanged); proof [2 exit=0] prompt lines match plan section 3 exactly; Strategy 1 saw the sprint branch (CLAUDE.md line found) |
| 3 plain ack | I3 + U1 green; proof: merge commit over chore commit, main/closing `.active` empty, branch deleted, archive moved file `status: "Completed"`, tracked status empty, item 7 printed |
| 4 worktree ack | I4 + U2 green; proof: `(in <T>)`, `kept - checked out at <S>`, branch still listed, T on main clean |
| 5 refuse before any write | I5a/I5b green; probes C1 (ack pass, dirty parent: exit 1, file lists byte-identical before/after, state Active, .active intact), E (third branch and detached HEAD: exit 1, no writes) |

## Pinned strings vs plan section 3
All 14 rows match the code output in the proof transcripts (2.5 deferred, Step 4, 2.8 refusal shape, plain and worktree prompt, checklist line, Step 5, 7.8 merged/kept/deleted, item 7 both forms, commit and merge subjects). No plan/code disagreement found. 2.7 and the forced/PR 2.8 block are byte-equal to bf21e96 after trimming indentation (checked line by line); BUG-077 marker order intact (bug076_077 #1-#5 pass).

## Adversarial probes (scratch only; all scratch dirs removed)
- A second ack after success: exit 0, idempotent outcome (see A1).
- 7.8 failure then re-run: pre-commit hook failure recovers (B1: second ack committed, merged, deleted the branch). Merge-time failure in the plain layout does not recover (F1).
- Dirty tracked file in parent, worktree layout (C1): refused before any write (D-2).
- closeOwnsRepo false (D, tmp `CLEARGATE_SPRINT_DIR=<tmp>/SPRINT-01`, ack): exit 0, `Step 5: .active left as is (sprint dir is not ...)`, `Step 7.8 skipped: sprint dir ... is not ...`, main and HEAD unchanged, branch kept, `.active` still SPRINT-01 (D-4). A dir not named SPRINT-NN is refused by the existing naming check.
- Root on a third branch or detached HEAD (E): refused at 2.8, no writes (D-3).
- Flaky check: close-sprint-finish.red.integration run 3 times, 6/6 each.

## Diff scope (item 3)
`git diff bf21e96..story/STORY-066-17 --stat`: 10 files. Seal 4b225db holds only the three red files; Developer commit 41a86ee holds 7 files, no test file, all in the story section 3.1 list. `sprint-finish.mjs` is mode 100644, has no `--no-verify`, no `console.*`. CLAUDE.md, SKILL A.3/section 7, enforcement 12.2/14.2/14.4 and prep_doc_refresh.mjs changes match plan sections 2.3-2.6.

## D-19 overlay
Host `.worktrees/STORY-066-17` was clean before and after (`git status --porcelain` empty); live root `.cleargate/scripts/` not touched. `v21-overlay.txt`: Scenarios 13, 15-20, 27, 28 all pass (28 tests).

## Rule 18 live-parity classification (derived from the diff; the full parity suites were not run per constraints)
New names to log at merge (plan section 6 / OD-3):
- doctor drift line `.cleargate/scripts/lib/sprint-finish.mjs` (missing live)
- doctor drift line `.cleargate/scripts/prep_doc_refresh.mjs` (content)
Already logged, extended by this story (no new name): close_sprint.mjs byte-parity (`close-sprint-step-2-6c.live`, `close-sprint-step-7-4.live`, `wiki-ingest-sprint-report.live`, BUG-114 entry), SKILL parity and CLAUDE.md block equality (066-12 entries, including the "bounded block identical" family), enforcement knowledge parity 5b / CR-086 leg 7 / Test 14 (066-05/06 entries), doctor drift for `close_sprint.mjs`. Re-classify on the integrated tree.

## Evidence
`/Users/ssuladze/Documents/Dev/ClearGate/.cleargate/sprint-runs/SPRINT-46/evidence/STORY-066-17/{proof-plain.txt,proof-worktree.txt,v21-overlay.txt}` (headers: pre-integration tree 41a86ee). Proof criteria all met: before-run exit 1 with `v2.1 validation requires`; no-flag pass reaches Step 4 with no report; Gate 4 prompt shows plan + checklist path; `.doc-refresh-checklist.md` written once; ack leaves main with the merge over the close commit, `.active` empty, branch deleted (plain) / kept with delete command (worktree), no hand git. Refusal-before-write proven by I5a/I5b and probes C1/E. Probe script: scratchpad probe.sh / probe.out.

flashcards_flagged:
  - "2026-11-15 · #close #git · runFinish leaves root on main when merge fails after checkout main; re-run dies at 'sprint directory not found' — restore the branch"
  - "2026-11-15 · #qa #proof-run · extracting a plan's bash block by line range: check the last line is not the closing fence, bash runs partial scripts before a syntax error"

---

# Re-run (Amendment A, integrated acd3e14)

STORY: STORY-066-17 (role: qa, VERIFY, runtime lane; integrated tree acd3e14 = merge of main ff4f258 into story/STORY-066-17; history bf21e96 -> seal 1 4b225db -> Dev 41a86ee -> seal 2 1f32eb7 -> rework a8c59ae -> acd3e14)
QA: PASS
TYPECHECK: pass (`npm run typecheck`; `node --check` on close_sprint.mjs, lib/sprint-finish.mjs, prep_doc_refresh.mjs; `build-codex-payload.mjs --check` exit 0)
TESTS: 0 failed in every file run; full suite not run (constraint). Reds 14/14 (I1-I5b 6, U1-U2 2, P1 1, R1-R5 5); witness list 20 files green (step-2-6c.red has 1 pre-existing `skip:` for BUG-083); sprint-skill-a3-a4-lanes.red 2/2, loop-spec-three-paths.red 9/9, codex-sprint-execution-render.red 3/3; bug076_077_close_path.red.sh 8/8; v21 overlay 28/28.
ACCEPTANCE_COVERAGE: 5 of 5 Gherkin scenarios plus Amendment A R1-R5, all red-now-green (CR-081)
MISSING: none
REGRESSIONS: none

## F1 closed
- Probe B2 (plain, pre-merge-commit hook) after the rework: ack 1 exits 1, prints `restored: <repo> is back on sprint/S-01` (HEAD sprint/S-01, no MERGE_HEAD); hook removed, ack 2 exits 0, merges, deletes the branch. No hand checkout.
- Recovery proof `evidence/STORY-066-17/proof-recovery.txt` (header: integrated tree acd3e14), all criteria of plan A.6 met: H-ack1 exit=1 + restored + HEAD=sprint/S-99, H-ack2 exit=0 HEAD=main merge subject tracked-dirty=[]; C-ack1 exit=1 restored, C-ack2-refused-at-2.8 exit=1, C-ack3 exit=0; X-ack2 exit=0; U-ack1 exit=1 with `it is left on main:` and the `recover:` line, ran the printed command, U-ack2 exit=0; W-ack2 and V-ack2 exit=0 (merge subject on P); OK-ack1 and OKW-ack1 exit=0. The H and U stderr blocks equal plan A.3 verbatim.
- Known and accepted (plan D-22): OK-ack2 (second ack after a finished plain close) leaves `state.json` modified on main (A2/QA-A1), and a re-run after a 7.8 failure adds a second `chore(...) close` commit (A3), both to intake.

## Pass criteria
- Item 1: four red files green; witnesses green; typecheck pass.
- Item 2 (v21 overlay, D-19): host `.worktrees/STORY-066-17` `git status --porcelain` empty before and after (restore via `git checkout HEAD --` + `git clean`); Scenarios 13, 15-20, 27, 28 = 28/28; live root `.cleargate/scripts/` never touched. `v21-overlay.txt` re-written with an acd3e14 header.
- Item 3 (stat): `git diff ff4f258..HEAD --stat` = 11 files, all story files (close_sprint.mjs, lib/sprint-finish.mjs, prep_doc_refresh.mjs, SKILL x2 (claude + generated Codex), enforcement, CLAUDE.md, 4 red tests). Seal 2 `1f32eb7` holds only `close-sprint-finish-restore.red.integration.node.test.ts`; rework `a8c59ae` holds only `lib/sprint-finish.mjs` + `cleargate-enforcement.md`; no test in either Developer commit. `sprint-finish.mjs` mode 100644, `--no-verify` only in comments/messages, no `console.*`.
- Item 4 (proof, rule 8): `proof-plain.txt` and `proof-worktree.txt` (headers acd3e14) both layouts: before-run exit 1 with `v2.1 validation requires`; no-flag without report reaches Step 4 (`Step 2.5 deferred:`); with report the prompt shows `On --assume-ack close will: ...` and `Doc-refresh checklist:`; ack exit 0. Plain: merge `merge: sprint/S-01 -> main` over the close commit, branch deleted, both `.active` empty, archive file `status: "Completed"`, tracked status empty, item 7 done. Worktree: `(in <T>)`, `kept - checked out at <S>`, branch listed, T clean on main.
- Item 5 (merge kept 066-16 and 066-17 text): SKILL A.3 Lane-ingest paragraph (waves.json / `Lanes:` line, line 165), A.4 "Verify before leaving A.4" and "Record a raised lane" paragraphs (219, 221) are untouched by the story diff against ff4f258 (0 `waves.json` lines changed); this story's `.active` sentence (167) and §7 table + E.1-E.5 are present; Codex SKILL is regenerated (gen:codex check exit 0, 33+/15- on the story diff). `sprint-skill-a3-a4-lanes.red`, `loop-spec-three-paths.red`, `codex-sprint-execution-render.red` green.

## Probe set re-run on the integrated scripts (probe.sh)
- A (second ack after success, plain): exit 0, 2.8 warns `sprint/S-01 not found`, 7.8 skipped; main gets two tracked modifications (state.json, improvement-suggestions.md). Same as the first pass (advisory A1, intake).
- B1 (pre-commit hook): recovers (ack 2 exit 0).
- B2 (merge hook, plain, the F1 case): now recovers, see above.
- C1 (dirty tracked file in parent, worktree): 2.8 refuses, exit 1; before/after file lists, status and content checksums identical, state Active, `.active` kept. (probe.sh's `md5` is not on its restricted PATH, so its "differ" line is a harness artefact; a cksum re-check proved no writes.)
- C2 (R-6 untracked collision, worktree): ack 1 fails at the merge after Completed; remove the file, ack 2 exits 0 with merge on main, branch kept. R-6 accepted, A4 to intake.
- D (closeOwnsRepo false): probe.sh's `d-sd` dir fails the SPRINT-NN naming check (exit 1, harness issue, no writes). With the dir named `<tmp>/dd/SPRINT-01`: exit 0, `Step 5: .active left as is`, `Step 7.8 skipped: sprint dir ... is not ...`, main and HEAD unchanged, `.active` still SPRINT-01, branch kept (D-4).
- E (third branch, detached HEAD): both exit 1 at 2.8 with `Resolve: check out sprint/S-01`; no writes (D-3).
- D-2/D-3/D-4 and R-6 verified in both layouts as above. All scratch dirs removed; host and cli worktree `git status --porcelain` empty.

## Rule-18 classification (parity names run singly, no full suite)
Failing now, all already in `suite-after-STORY-066-20.txt` and the sprint-context rule-18 lists (not new): `live and canonical close_sprint.mjs are byte-identical` (close-sprint-step-2-6c.live), `diff between live and canonical close_sprint.mjs is empty (mirror parity)` (step-7-4.live), `Sprint execution skill pointer is identical in live and canonical CLAUDE.md` and `live and canonical enforcement.md are byte-identical` (enforcement-section-13.live), `template story.md: live preamble region === canonical preamble region` (template-claude-md.live; 066-15 entry). close-sprint-assume-ack-guard.live passes.
New names to log at merge (plan §6 / OD-3; both are doctor drift lines, no test name):
1. `.cleargate/scripts/lib/sprint-finish.mjs` (missing live)
2. `.cleargate/scripts/prep_doc_refresh.mjs` (content)
Both clear at the Gate 4 re-sync, which must carry `lib/sprint-finish.mjs` with `close_sprint.mjs` (OD-4). The Amendment A change adds no new name (enforcement.md parity was already red).

## Evidence
`evidence/STORY-066-17/{proof-plain.txt,proof-worktree.txt,proof-recovery.txt,v21-overlay.txt}` (headers: integrated tree acd3e14). Scratch scripts: scratchpad `proof8.sh`, `proto.sh`, `probe.sh`, `probe-rerun.out`, `pd.sh`, `pc1b.sh`.

flashcards_flagged:
  - "2026-11-15 · #qa #proof-run · probe scripts with a restricted PATH lack /sbin/md5; a before/after md5 diff of error text is a false alarm, use cksum"
  - "2026-11-15 · #qa #close · a CLEARGATE_SPRINT_DIR probe dir must be named SPRINT-NN or the naming check refuses it before the closeOwnsRepo path"
