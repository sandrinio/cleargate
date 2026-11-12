# STORY-063-08 Developer report (role: developer)

STATUS: **done. Commit 86db1c0 on story/STORY-063-08.** (Earlier block resolved by QA-Red commit 6d49a50 and M2.md decision 9; all three deviations accepted, orchestrator_confirmed: true. Final counts: typecheck clean; test/wiki 678 tests, 677 pass, 0 fail, 1 skipped; full npm test 4,346 tests, 4,344 pass, 0 fail, 2 skipped; codex --check exit 0; outer delivery porcelain empty before and after.) Historical block analysis follows.

STATUS (historical): blocked. Everything in the plan is implemented and the work is in the `story/STORY-063-08` working tree of `cleargate-cli` (no commit made). Two QA-Red page-level assertions (4 test cases: build and ingest modes) cannot pass without changing the plan or editing the reds. Per the dispatch I did not touch them.

## The two blocking assertions

### B1. `test/wiki/extract-sections-pages.red.node.test.ts:43` (EPIC-058, build and ingest)
`partText(s.extract, 'Problem & Value')` must include `Introduce a host-adapter architecture`.

- In EPIC-058 §1 that sentence sits at offset 541 of the Problem text, in the second paragraph ("**What are we building?**"). A cut that keeps it needs about 580 characters, and with the pinned paragraph-first boundary rule (`safeCut` unit test: "paragraph boundary at >= 50% of the budget wins") it needs about 980, because the first paragraph break (~515) always wins until the second paragraph also fits.
- Real budget arithmetic for EPIC-058 (raw path 83 chars, so each marker plus its blank line costs about 119): Objective 231 and Decisions 440 fit whole; separators 8; so the three overflowing parts (Problem, Scope, Architecture rules) share 2,400 - 231 - 440 - 8 = 1,721 characters. Their heads and markers cost about 407, leaving about 1,314 of text, which is about 438 each under the fair-share rule (G-M2-12, and the pinned unit test "fair shares expected, |b1-b2| < 400").
- Problem would need at least 980 of text plus 138 of head and marker, about 1,120. Scope needs about 300 of text (both lists, G-M2-38) and about 130 of overhead. That already exceeds the pool before any rules text.
- So the assertion holds only if Problem gets roughly twice its fair share, which contradicts G-M2-12 and the pinned unit test.
- The unit-level assertion on the same string (pre-budget, `extractParts`) passes and is correct.

Proposed fix (QA-Red): assert the page-level Problem part starts with `**Why are we doing this?**` or includes `ClearGate's planning and enforcement model`; keep the `Introduce…` assertion on `extractParts` only.

### B2. `test/wiki/extract-sections-pages.red.node.test.ts:197` (PROPOSAL-901, build and ingest)
`!partLabels(s.extract).includes('Fenced heading that is not a section')`.

- `partLabels` (`test/wiki/_extract-support.ts:139`) lists every line matching `^## `, fenced or not.
- The fixture's `Decision needed` section contains a fenced block with the line `## Fenced heading that is not a section`. The unit test (`extract-sections.red.node.test.ts:~425`) correctly requires that this text stays inside the `Decision needed` part (`FENCED-HEADING-SENTINEL`), and G-M2-39 says a fenced `#` line is not a section. So the part text must carry that line verbatim, and the page-level helper then reads it as a label.
- The unit-level assertion (the real contract) passes. The page-level one fails purely because `partLabels` is not fence-aware.

Proposed fix (QA-Red): make `partLabels` (and `partText`) skip lines inside ``` fences, or drop the page-level assertion and keep the unit one.

## Results (working tree, nothing committed)

- `npm run typecheck`: clean.
- `npx tsx --test test/wiki/*.node.test.ts`: 678 tests, 673 pass, 4 fail (B1 and B2, build and ingest), 1 skipped.
- Full `npm test`, short TMPDIR: 4,346 tests, 4,340 pass, 4 fail (the same four), 2 skipped. No other failures, so no pre-existing flakes to name.
- Outer `git status --porcelain .cleargate/delivery` before and after the suite: empty both times. The suite did not dirty the outer delivery tree.
- `node scripts/build-codex-payload.mjs --check`: exit 0. `npm run gen:codex` ran (Codex TOMLs regenerated, never hand-edited), then `node scripts/copy-planning-payload.mjs` and `npx tsx scripts/build-manifest.ts`. The only tracked files changed by them are the two Codex TOMLs. The composed payload is gitignored. I never built dist.

## Live sweep (G1)

The live test reads the outer repo's `.cleargate/{delivery,sprint-runs,config.yml}` and copies them into an `os.tmpdir()` scratch dir; it asserts it runs on the scratch copy and writes nothing into the meta repo. With `CLEARGATE_META_ROOT` defaulting to `<cli>/..` it ran as part of the `test/wiki` glob and passes. A separate scratch-only probe against the same corpus gave:

- swept 344 pages; build exit 0 in 427 ms.
- empty bodies 0; `(no extractable content…)` pages 0.
- extract > 2,400: 0.
- extract < 2,000 although > 2,000 extractable: 0 (test passes). 60 pages are under 2,000 because they have less than that to extract; the minimum seen is 731.
- cut XML tag or table row: 0.
- pages carrying a cut marker: 257 of 344; max extract 2,400.
- Per type, full pages (extract >= 2,000): epic 52/52, bug 95/106, cr 96/125, sprint 24/44, proposal 16/16, initiative 1/1.
- SPRINT-44 page: 2,968 bytes (was 23,337; limit 8,000).

## Files changed (uncommitted)

- `src/wiki/extract-sections.ts` (new, pure): `findSection`, `extractAgentContextTag`, `extractRules`, `extractDecisionPairs`, `isPlaceholderAnswer`, `extractParts`, `allocateBudget`, `safeCut`, `digestSource`, `digestOf`, `PAGE_EXTRACT_MAX/MIN`. No `node:` imports; no import from `./page-schema.js` except `import type`.
- `src/wiki/page-schema.ts`: new layout in `buildPageBody` (type required; identity line, extract, relations block last), `buildPlanStub` (optional `type`, default `sprint`), `buildReportBlock({fm, body, rawPath, improvementSuggestionsPath?})`. Deleted `SUMMARY_BUDGET`, `applyBudget`, `extractOpenQuestions`, `stripLeadingH1` and the description/summary path. `deriveTitle` stays.
- `src/commands/wiki-build.ts`: passes `item.type`; the report entry keeps its `absPath`; the improvement pointer is computed only when the file exists.
- `src/commands/wiki-ingest.ts`: the private builder takes `type` and passes `bucketInfo.type` into the plan branch (G-M2-45); the report branch computes the pointer the same way as build.
- `scaffold/core/.cleargate/knowledge/cleargate-protocol.md`: §10.2 ingest clause, §10.4 opener, body example and one body field note. §10.1 untouched; 13's relations note and 02's `last_contradict_sha` note unchanged.
- `scaffold/hosts/claude/.claude/agents/cleargate-wiki-ingest.md`: steps 4-10 collapsed into one `cleargate wiki ingest <raw_path>` hand-off; exclusion and bucket-allowlist guards and Phase 4 kept.
- `scaffold/hosts/claude/.claude/agents/cleargate-wiki-query.md`: new page example and the `children` / `cited_by` instruction.
- `scaffold/hosts/codex/.codex/agents/cleargate-wiki-{ingest,query}.toml`: regenerated.

## How each ruling was implemented

- **G-M2-11/43 (docs):** as listed above.
- **G-M2-12 (allocation):** water-filling in order, iterated until stable. Heads, markers and separators count inside 2,400. Characters are JS `.length`; marker byte counts are UTF-8. Boundary back-offs leave slack, which is handed back to the cut parts in rounds. If the result is still under 2,000 while more than 2,000 is extractable, a second pass drops the paragraph/sentence preference (`fill`, word boundary). This second pass is internal; `safeCut` itself keeps the pinned rule.
- **G-M2-13 (purity):** `extract-sections.ts` imports only `import type` from `page-schema.ts`.
- **G-M2-14:** epic with no §6 markers uses the §6 prose as Decisions. Testing Strategy is never a part. The §6 lookup is by `interrogation loop`, so a section between §5 and §6 does not disturb it. Trailing `---` rules are trimmed.
- **G-M2-38 (Scope):** In/Out located by whole-line bold markers containing IN-SCOPE / OUT-OF-SCOPE (also `**In:**`, `**Out:**`). Rendered with `**In:**` / `**Out:**` sub-labels. `ExtractPart.segments` drives sub-allocation: each list gets half, a short list passes its surplus on, and exactly one marker ends the part with N = bytes(full part) - bytes(kept).
- **G-M2-39 (fallback):** fence-aware, line-anchored drops; an unclosed element is dropped through the line before the next outside-fence `## `. When the opener is inside a fence, the fence's opening and closing lines are dropped too (a deliberate widening: the ruling takes the closing line only when it falls inside the drop, which would leave a dangling fence for a closed element). Preamble becomes `Overview`; labels are number-stripped; empty sections yield no part. An epic with no `<agent_context>` uses the typed extractor; only an opened-but-unclosed one forces the fallback.
- **G-M2-40:** no special case; report-only sprints go through `buildPlanStub` with type `sprint`, so the fallback runs over the report's H2s.
- **G-M2-41:** pointer is `path.posix.join(path.posix.dirname(<report rel>), 'improvement-suggestions.md')`, set only when the file exists beside the report. Both callers do it.
- **G-M2-42:** the extract region equals `allocateBudget`'s return value, parts joined by one blank line, marker after its kept text by one blank line. The report's Carried Over block (`### Carried Over` line through marker) is capped at 1,200.
- **G-M2-44:** `DecisionPair.line` is 1-based within the section; continuation lines are trimmed and space-joined; decision questions are cut to 20 words with `…` on the 20th; an orphan answer renders as `- <answer>`.
- **G-M2-45:** `type` is required on `buildPageBody`; missing status is `unknown`; `pass === false` with no ids is `fail`; `buildPlanStub` defaults to `sprint`.

## Deviations from the plan

1. Fence-widening in the fallback drop (above). Justified by the ruling's own goal ("no dangling fence remains").
2. The second `fill` pass in `allocateBudget` (above). Needed for G1's "at least 2,000 when more than 2,000 is extractable"; without it 10 corpus items (CR-010, CR-085, CR-088, CR-089, CR-095, CR-107, CR-120, SPRINT-18, SPRINT-20, SPRINT-30) ended under 2,000.
3. `digestOf` strips a trailing period from the first sentence so a sentence cut and a word cut look alike. Not pinned; 09 may adjust.
4. The story file's `## Task Breakdown` rows are not ticked: the file lives in the outer repo and the story is not complete.

## Flashcards flagged

- `2026-11-12 · #qa-red #wiki · Page-level "part includes X" reds must size X against the cut: with 3 overflowing parts and a 117-char marker each, text room is ~440, not 2,400/5.`
- `2026-11-12 · #qa-red #test-harness · partLabels-style helpers that split a page on ^## must skip fenced lines, or a fixture that proves "fenced heading is not a section" fails at page level.`
- `2026-11-12 · #wiki #extract · safeCut prefers a paragraph break at >=50% of budget; a long first paragraph hides the second one entirely. allocateBudget needs a word-boundary "fill" pass to reach 2,000.`
