# STORY-063-12-F1 QA-Red (role: qa, Mode: RED)

QA-RED: WRITTEN
Worktree: scratchpad/wt12f1 (branch story/STORY-063-12-F1). Nothing committed.

## Files
- NEW test/wiki/orientation-corpus-dates.red.node.test.ts (F1, 2 tests)
- NEW test/scripts/orientation-eval-f1.red.node.test.ts (F2/F3/F4/R-b, 27 tests)
- Fixture edits (mine, so the Developer touches scripts only):
  - orientation-corpus/.../pending-sync/SPRINT-10_Index_Follow_Ups.md  updated_at 2026-11-11 -> 2026-09-01T00:00:00Z
  - .../SPRINT-11_Cache_Cleanup.md  updated_at 2026-11-11 -> 2026-09-01T00:00:00Z
  - .../CR-14_Cache_Policy.md  updated_at 2026-10-30 -> 2026-09-30T08:00:00Z (inside window+30d; still ranks 4th in D7, after EPIC-20 x2 at 11-05, before undated EPIC-23)
- Sealed-expectation edits: only test/wiki/_oracle-support.ts:168 comment (D7 text "updated_at 2026-10-30" -> "2026-09-30 ... backdated"). No FACTS_A / LINES_A / guard value moved (neither SPRINT-10/11 nor CR-14 dates feed a fact). No pinned corpus sha256 exists in tests.
- Not edited, left red for the Developer: scripts/clean-room/fixtures/orientation-questions.json q05 prompt.

## Reds
- F1 (2 tests): both FAILED against the original fixtures (offenders CR-14, SPRINT-10, SPRINT-11; alarm line "contradiction check missing: 2 ... SPRINT-10, SPRINT-11"). They now pass because I backdated the corpus; they are permanent guards. Guard (a) covers top-level updated_at/created_at/modified_at/last_updated of Draft/In Review unapproved items (not approved_at / nested last_gate_check: the alarm does not read them and moving them shifts D7). Window = 7 days (unchecked-drafts.ts:55). Guard (b) calls checkUncheckedDrafts + formatUncheckedDraftsLine (the two functions doctor.ts:687 uses) on the corpus at the real clock.
- New file: 27 tests, 19 FAIL now, 8 pass as regression pins (no result event -> not run; error_max_turns returns ran:true; non-zero exit + success result ran; release/legacy/baseline/not-run-ignored verdict cases; not-run cell count).
  - F2: 401 not run (ran:true now); 404 not run; synthetic+error with normal result not run; error_during_execution not run; evaluateTranscript max turns reason missing; twelve 401 -> INCOMPLETE exit 3 (gives wrong verdict now).
  - F4: actualModel undefined on evaluateTranscript (x2); computeVerdict smoke-by-actual-model (x3: label/line, SMOKE FAIL, null model); evidence `actual model` column; evidence smoke label + reason.
  - F3: layoutOutputs is not a function (x4); renderEvidence leaks home dir.
  - R-b: q05 prompt is 'What is waiting on me right now? Name the items.'
- Existing suites with the edits: orientation-corpus, orientation-eval.red, brief-truth-oracle.red, brief-oracle.red, dates -> 144/144 pass.

## Contract the Developer must provide (all from scripts/clean-room/orientation-eval.mjs; full text in the new test file's header)
- runQuestion: decide not-run from the LAST result event. No result -> not run. is_error with non-null api_error_status, or a main-thread `<synthetic>` assistant event with `error` -> not run, reason "api error <status> <error>" (e.g. "api error 401 authentication_failed"; 404 model_not_found; rate_limit when no status). Other is_error (error_during_execution) -> not run, reason names the subtype. error_max_turns and a non-zero exit with a normal result -> { ran: true, transcript }.
- evaluateTranscript: row gains `actualModel` (string|null; main-thread assistant message.model, skipping `<synthetic>`, sub-agent events (parent_tool_use_id set) and init.model) and, for error_max_turns, `reason: 'max turns'` with correct:false whatever the result text, toolCalls counted.
- computeVerdict: returns `reason` too. label 'release' only if model===GATING_MODEL and every ran row has actualModel===GATING_MODEL; undefined = not recorded (legacy, unchecked); null or other = smoke with `reason` "actual model <m> on <qid>". Baseline and INCOMPLETE precedence unchanged.
- renderEvidence: label from the same rule over rows; header states the reason; final table column `actual model` after `transcript` (also on not-run rows); absolute paths in extraMeta lines and transcript cells are reduced to their basename (no home dir, no tmpdir, no absolute path in output).
- NEW export `layoutOutputs({ container, evidence, questionId }) -> { evidencePath, transcriptPath, transcriptRef }`: evidencePath = path.resolve(process.cwd(), evidence) or <container>/evidence/orientation-eval.md; transcriptPath absolute and inside container (never in dirname(evidence)), filename contains the question id and ends .jsonl, unique per question; transcriptRef container-relative with path.resolve(container, ref) === transcriptPath. runCommand must use it (replace the `<evidence>.transcripts` dir) and extraMeta must stop carrying absolute paths or rely on the renderEvidence scrub.
- orientation-questions.json q05 prompt -> exactly `What is waiting on me right now?` (id, kind, key unchanged).

## Notes
- No live session, no wiki build/doctor, no writes outside the worktree. TMPDIR was a mktemp dir.

flashcards_flagged: none
