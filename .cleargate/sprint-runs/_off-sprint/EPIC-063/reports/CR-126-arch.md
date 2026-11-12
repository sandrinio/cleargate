# CR-126 Architect post-flight

role: architect

**Mode:** post-flight. The pre-gate scan cannot see cli branches, so under the safeguard the live review was dispatched.
**Commits:** Dev `7a63904`, QA-Red `075e116` + amendment `e8f2f39`, base `bd875a6` on `cr/CR-126` (cleargate-cli).
**Also in scope:** the uncommitted outer `.cleargate/delivery/pending-sync/EPIC-063_wiki_ingest_pipeline_wired_end_to_end.md` reshape (the file is untracked).
**Plan:** `plans/M1.md`: the CR-126 blueprint, G4/G5/G6, and Orchestrator decision 7.

## Verdict: ARCH: FAIL (outer EPIC-063 reshape only)

- **cli `7a63904` passes all seven cli checks.** DevOps may merge `cr/CR-126` now. Per the plan, the outer reshape is a separate commit made after the cli merge, so it does not gate this merge.
- **The outer EPIC-063 reshape fails.** It deletes approved verification content from a 🟢 epic, and two of its journey "Walked by" claims are false against STORY-063-07's current scope. See findings F1–F3. The reshape goes back to the Developer before the outer commit.

## Checks

### 1. Predicate follows the `evalTaskBreakdownComplete` pattern: PASS
- **Section locator.** `evalTestingStrategyComplete` (`readiness-predicates.ts:1590` at `7a63904`) finds the section with `doc.body.split(/^(?=## )/m)` and an exact `headingTitleOf(...) === 'Testing Strategy'` match. This is the same shape as `evalTaskBreakdownComplete` (`:1227-1236`). A numeric prefix (`## 5.5 Testing Strategy`) is tolerated.
- **Exemption runs first,** before the section lookup.
  - The epic id comes from `fm.epic_id` with quotes stripped. If that is absent, it falls back to `idFromFilename(basename(absPath))`.
  - `countStoryFilesOfEpic` reads `pending-sync` and `archive` and compares `deriveParentEpicId(idFromFilename(f)) === epicId`.
  - A readdir error triggers `continue`, so it never counts as an exemption.
  - `deriveParentEpicId` returns `null` for any non-STORY id (`work-item-id.ts:255-260`), so an epic can never exempt itself. Likewise `STORY-0631-01` maps to `EPIC-0631`, which is not `EPIC-063`.
- **No inline ID regex.** `node scripts/check-no-inline-id-regex.mjs` reports "No inline work-item-id regexes" (exit 0). The only new regexes are the quote strip, `NA_WITH_REASON_RE` and the whole-value placeholder test.
- **projectRoot.** The only caller of `evaluate` is `gate.ts`, and it passes `projectRoot = resolveProjectRootForFile(file)` (`gate.ts:161,197,231`). The exemption therefore holds even when the command runs from a subdirectory.
- **Rules 3 and 4 (labels and levels).**
  - Each of the 7 labels is found by its `- **<Label>:**` prefix. An empty value or a whole-value `{…}` fails, naming the label.
  - Each of the 5 level rows is found by its first cell. `n/a` + a dash + a reason short-circuits the row.
  - A bare `n/a` fails. That is stricter than the plan's literal rule 4, and it matches the CR's "an absent reason is not a decision". S3 pins it.
- **Rule 6 (journeys, decision 7).**
  - The `### User journeys` heading is matched only inside the section.
  - The first contiguous `|` block is read as the table: row 0 is the header and row 1 the separator.
  - Zero data rows fails.
  - A table whose only row has an `n/a — <reason>` Journey cell passes and ignores its other cells. This matches decision 7's "whole-table single `n/a — <reason>` row" exception.
  - Otherwise every cell is checked, up to the header width (minimum 5), and a failure names the journey and the column.
  - Labels and levels are searched only above the journeys heading, so a `- **Oracle:**` line inside the journeys subsection cannot satisfy rule 3.
- **Non-blocking observations** (none needs a change now):
  - The locator does not skip fenced code. This gap is inherited from `evalTaskBreakdownComplete`.
  - `NA_WITH_REASON_RE` accepts `n/a --`, reading the second `-` as the reason, because of regex backtracking. This is trivial.
  - `fm.epic_id` is compared without normalisation, while `idFromFilename` normalises. Every id on disk is upper-case, so this has no effect today.

### 2. Registration inside the existing fence; count sites moved together: PASS
- `- id: testing-strategy-complete / check: "testing-strategy-complete"` is the last criterion of the existing epic `ready-for-decomposition` fence. No new fence was added (flashcard 2026-09-27 `#test-harness #gate`, the `[0]` unwrap).
- The union member (`:28`), the parse branch (after `spidr-coverage`, `:154-157`) and the `evaluate` switch case (`:214-215`) are all present.
- Count sites: `readiness-gates.md:9` changes 12 → **13**, and the `readiness-predicates.ts:3` docstring changes 13 → **14**. Both doctrine pins (`test-layers-declared-doctrine.red:330,360`) and S15 match.
- A repo-wide `command grep` for "predicate shapes" finds no third count site.
- Vocabulary entry **13** sits directly after entry 12. The test path it cites exists.

### 3. Template: PASS
- **Placement.** In `epic.md`, `## Testing Strategy` sits after the §5 Gherkin fence and before `## 6. AI Interrogation Loop`.
  - `### User journeys` is a `###`, so it adds no `##` heading.
  - No gate uses a positional index above 8; a `command grep 'section\((9|1[0-9])\)'` on the gates doc finds nothing.
  - `section(3)` and `section(8)` still resolve to "2. Scope Boundaries" and "4. Technical Grounding".
  - `git diff bd875a6 7a63904` touches nothing under `test/fixtures/gate-section-index/`, so there are zero edits to expected-headings.
- **Required lines.** All of the following are present:
  - The Brief line `- Testing Strategy ← ## Testing Strategy`.
  - The `<instructions>` line "At decomposition, each story's Test layers table names the Testing Strategy level(s) it covers."
  - The checkbox, worded per decision 7: "…including its user journeys and real-host proof or why it isn't needed."
  - The `story.md` §4.1 line, which also names the journey steps (decision 7).
- **Extra edit.** One line was added to the `<instructions>` structure list (`Testing Strategy: how do we test this — …`). It is in scope, because it keeps the "output sections in order" list true.
- **The unedited template still fails its own criterion.** I verified this by running the full epic gate in a scratch room: `newHandler`, then `gateCheckHandler` with the branch's canonical gates doc.
  - `failing_criteria` includes `testing-strategy-complete: labelled line "What "working" means" is empty or still a {…} placeholder`.
- **The QA-Red amendment `e8f2f39` is a harness fix, not a loosening.** It does two things:
  - It anchors `indexOf` on `\n## …` heading lines, because the Brief line inside `<instructions>` also contains `## Testing Strategy`.
  - It adopts the decision-7 checkbox text.

### 4. `probe-items.mjs` `authorTestingStrategy`: PASS
- The function is conditional: `/^## Testing Strategy[ \t]*$/m` absent → `raw` is returned unchanged.
- It replaces `\{[^}\n]*\}` only inside the section, which ends at the next `/^## /`. `### User journeys` does not end it.
- `authorProbeEpic` calls it as step 6. It is not in the E5-6 anchor list: `clean-room-evidence.red:871-874` is unchanged, and the commit touches no tests.
- **07's seeds will gate 0.** In a scratch room I ran `cleargate new epic` → `authorProbeEpic` → `gate check` against the branch's gates doc, with no story files present, so the exemption could not apply. The result was `{"pass":true,"failing_criteria":[]}`.
- The new `- [ ]` checkbox does not trip `ambiguity-gate-resolved`, because the template's status is not 🟢.
- `PROBE_EDIT.from` (`Hardcode it.`) is unaffected.

### 5. Release danger: the exact §R obligations
A gates doc that names `testing-strategy-complete` must never be evaluated by a binary that lacks the predicate. If it is, `gate.ts:236-243` caches `predicate error` as `pass:false` into every epic it re-gates (flashcards 2026-09-25 and 2026-08-28 `#gate #cross-repo #danger`).

1. **§R step 2 runs before step 3, on cli `main`, after all 8 merges.**
   - Run `npm run build`. It runs prebuild, which composes the payload, and then tsup.
   - Then verify the predicate is in dist: `command grep -l "testing-strategy-complete" cleargate-cli/dist/*.js` must be non-empty.
   - Only then run `node cleargate-cli/dist/cli.js init` (step 3).
   - init copies `templates/cleargate-planning/`, which only prebuild regenerates. A stale build therefore leaves the live doc old, which is the safe failure. A hand-port of `readiness-gates.md` ahead of the build is the unsafe one; never do it.
2. **From step 3 until the global binary is 0.29.0, every gate-evaluating command uses `node cleargate-cli/dist/cli.js …`, never the global 0.28.0 at `/opt/homebrew/bin/cleargate`.**
   - This covers `gate check`, `sprint init` (decomposition gate), `sprint preflight` (Step 0 re-gates every in-scope item) and `wiki` commands.
   - The live hooks are already safe, because they resolve dist first: `stamp-and-gate.sh:17-18`, `pre-edit-gate.sh`, `session-start.sh`, `pending-task-sentinel.sh`, and `close_sprint.mjs`.
3. **Do not delete or clean `cleargate-cli/dist` between step 3 and the global upgrade.**
   - With no dist, every hook falls to resolver branch 2, the PATH binary 0.28.0, and poisons each epic it gates.
4. **After publish (step 9), run `npm i -g cleargate@0.29.0`.**
   - Confirm with `npm ls -g --depth=0` showing `cleargate@0.29.0`. Only then is the bare `cleargate` safe again.
5. **Recovery if poisoned:** re-run `node cleargate-cli/dist/cli.js gate check <file>` on each epic that cached `predicate error`. A gate check rewrites a stale cache (flashcard 2026-09-27 `#gate #cache`).
6. **CHANGELOG 0.29.0 must tell downstream users to upgrade the global binary in the same step as `cleargate upgrade`/`init`.**
   - Installed hooks prefer an on-PATH `cleargate` over the pinned `npx cleargate@0.29.0` (branch 2 before branch 3).
   - So a stale global binary plus the new gates doc gives `predicate error` on every epic edit.
7. **Expected after step 3:**
   - The next edit of EPIC-030/050/052/053/055/056/057 lists `testing-strategy-complete`. All seven are already 🔴.
   - EPIC-019 (Completed, no stories) would fail if re-gated. That is harmless.
   - `gate-section-index-pinning.live.integration` S1c turns green only after step 3. Name it as expected-red in step 1.

### 6. EPIC-063 reshape: literal check PASS; content FAIL (F1–F3)
- **Literal checks pass:**
  - The pointer line `Verification plan: see ## Testing Strategy.` sits under §5 (`:373`), and `## Testing Strategy` follows at `:375`, before `## 6.` (`:405`).
  - Every literal "§5 verification plan" citation resolves through the pointer: EPIC §3 `:179`, §6 Q2 `:410-411`, and STORY-063-07 `:220`.
  - The journeys rows are J1–J4 → STORY-063-07 `ingest-loop.mjs` and J5 → STORY-063-12 orientation eval.
  - The new checkbox is ticked.
- **F1 — approved verification content was deleted, not moved.**
  - **Evidence.** I recovered the pre-reshape `### Verification plan` (EPIC-063 `:370-399`) from this session's subagent transcript (`subagents/agent-a5cd32b618d9409c7.jsonl`, a numbered Read).
  - **Cause.** The Developer report says "section content = fixture's". A scratch diff confirms the EPIC-063 section is byte-identical to `test/fixtures/testing-strategy/complete-epic.md`. QA-Red's condensed fixture was pasted into the 🟢 epic, which inverts the plan's direction ("the fixture is EPIC-063's reshaped section copied").
  - **Lost content:**
    - **Level 5, "Dogfood after each release, in this repo" (all 4 checks):**
      - `doctor` exits 0;
      - SessionStart shows the brief;
      - the next real draft gets a `Contradictions:` line and a stamped page;
      - the alarm stays quiet for a day.
    - **Hook-contract specifics:**
      - the recorded Bash payloads (`git mv`, `mv`, `ls`) through `post-shell-ingest.sh`;
      - "brief printed and under 1,500 tokens";
      - "time the no-op paths against the §3 budgets".
    - **Unit specifics:** the active-sprint compiler with `.active` set and unset, the budget checks, and golden fixtures copied from real items.
    - **Truth oracle as its own default-suite level:** "any mismatch fails", on this repo's corpus plus an active-sprint fixture corpus.
    - **The orientation-eval baseline run** "once on today's setup before work starts". §1 `:116` still promises it, but the Baseline line omits it.
  - **Impact.** Nine stories cite the old level names "EPIC-063 verification level: dogfood | hook-contract | truth oracle | live end-to-end", and those no longer resolve:
    - 063-04 `:162`, 063-05 `:193`, 063-06 `:184`, 063-07 `:199`, 063-08 `:198`, 063-09 `:241`, 063-10 `:218`, 063-11 `:261-263`, 063-12 `:239-240`.
    - For 063-04, 09, 10 and 11, dogfood is their *only* E2E coverage, and the epic's strategy no longer states it.
- **F2 — the Integration row contradicts the Release-gate line and STORY-063-12.**
  - The Integration row says `**.integration.node.test.ts` / `npm run test:integration`, at release.
  - The Release gate and Regression guard lines say the truth-oracle tests run in `npm test`.
  - STORY-063-12 `:239` puts `brief-truth-oracle.node.test.ts` in the default suite.
- **F3 — the J3 and J4 "Walked by" claims are false against STORY-063-07's current scope.**
  - The 063-07 story (`:64-73`, `:171-172`) and its blueprint (M1.md §STORY-063-07, checks 4.1–4.7) walk J1 (directive → dispatch → finding → stamp → Brief line, plus the negative draft) and J2 (shell `git mv`) only.
  - Nothing in 063-07 builds a sprint report into a page (J3) or fires the silent-drop banner (J4).
  - Decision 7 assigned J3 and J4 to 063-07 without amending 063-07.

## Remediation (outer EPIC-063, before its commit; the predicate ignores extra rows and prose, so all of this stays gate-neutral)
1. **Restore F1's content inside `## Testing Strategy`, keeping the five required rows:**
   - **Unit:** add the active-sprint compiler (fixtures with `.active` set and unset), the §3 budget checks, and the golden fixtures copied from real items (EPIC-058, a bug, a CR, a sprint with a report).
   - **Contract:** add the Bash payloads (`git mv`, `mv`, `ls`) through `post-shell-ingest.sh`; SessionStart prints the brief under 1,500 tokens; no-op paths timed against the §3 budgets.
   - **Integration:** add "truth oracle (063-12 `brief-truth-oracle.node.test.ts`, default `npm test`): raw-file ground truth vs `wiki/brief.md` fact by fact, on this repo's corpus and an active-sprint fixture corpus; any mismatch fails". Set its "Who runs" cell to "`npm test` (oracle); `npm run test:integration` at release (build + ingest corpora)". This fixes F2.
   - **A sixth row:** `| Dogfood | after each release in this repo: cleargate doctor exits 0; SessionStart shows the brief; the next real draft gets a Contradictions: line and a stamped page; the regression alarm stays quiet for one day | this repo (M1/M2 plan §R step 8) | orchestrator, after each release |`.
   - **Release gate:** append "…and the dogfood checks pass in this repo after each release."
   - **Baseline:** append "the orientation eval runs once on the 0.28.0 setup before M2 work starts". Replace "Measured on a 0.28.0 clean-room install" with "Measured in this repo on 0.28.0 (§1)". That is where the §1 numbers come from.
   - **One legend line under the level table:** "Story Test-layers notes use these names: unit = Unit; hook-contract = Contract; truth oracle = Integration; live end-to-end = Real-host end-to-end (orientation eval = Eval); dogfood = Dogfood."
2. **F3: keep J3 and J4 assigned to 063-07, and re-dispatch the Architect to amend the STORY-063-07 blueprint before 063-07's QA-Red.**
   - The amendment adds two model-free room checks, both in the installed tarball's real hooks:
     - `claude.live.report-kept` (J3): seed a sprint plan plus `SPRINT-NN_REPORT.md`, run `cleargate wiki build`, and require the sprint page to contain `<!-- BEGIN sprint-report -->`.
     - `claude.live.silent-drop-alarm` (J4): back-date a seeded unapproved Draft's `updated_at` by 2 days, run the room's `session-start.sh`, and require stdout to name it.
   - Until that amendment lands, the J3/J4 rows assert a walker that does not walk them.
3. **Re-run the exemption-bypassed proof:** a scratch root holding only the epic must pass with 5 journeys.
   - Do not change the cli fixture. The tests never read outer files, and the fixture stays the minimal shape.
4. **Commit the outer file by explicit path only.** Never stage `.cleargate/wiki/**` (BUG-086).

### 7. No new deps, no unrelated edits: PASS
- `git diff bd875a6 7a63904 -- package.json package-lock.json` is empty.
- The branch's 8 files are exactly the plan's CR-126 surface: 5 Dev files plus 3 QA-Red test/fixture files. Nothing outside it changed.
- `check:no-exec-mode-vocab` exits 0.

## Script Incidents
None. No wrapper-invoked scripts were run. Scratch probes ran under the session scratchpad with `TMPDIR` set there.
