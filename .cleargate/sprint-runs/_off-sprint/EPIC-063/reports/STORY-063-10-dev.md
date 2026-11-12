# STORY-063-10 Dev report (role: developer)

STORY: STORY-063-10 · STATUS: done · branch story/STORY-063-10 (cleargate-cli repo)

## Result
- typecheck clean. `test/wiki/*.node.test.ts`: 1049 tests, 1048 pass, 0 fail, 1 skipped.
- Full `npm test` (run once, short TMPDIR): 4714 tests, 4712 pass, 0 fail, 2 skipped.
- Live (CLEARGATE_META_ROOT): decisions-corpus 1/1, extract-sections-corpus + index-open-ids all green (4 tests, 0 fail).
  - items=622, answered (independent count) = 402 == `- Q:` lines = 402; rules 99 == 99.
  - decisions.md = 32,856 tokens (round(bytes/4)); plan estimate was ~25k; `warn: decisions-size` fires (accepted).
  - `### [[EPIC-063]] ... - Supersedes: [[EPIC-020]]` present (and only that one).
  - Unresolved conflicts on this repo: `_None._`. Index live test: open=91, 3582 tokens, tier 1 (no regression).
- `git status --porcelain .cleargate/delivery`: 0 lines before the full run; 1 line after: untracked `CR-131_coding_standards_knowledge_doc.md`, created by someone else (not a test artifact, I never touched delivery).
- `build-codex-payload.mjs --check` exits 0 after `gen:codex` + `copy-planning-payload.mjs` + `build-manifest.ts`.

## Timings (scratch tsup builds of 68f9ee0 vs this tree; scratch repo = copy of this corpus, 622 items; machine noisy)
- `wiki build`: 35.3 s -> 38.4 s (one run each).
- ingest of EPIC-063, write path (3 runs): main 0.96/0.68/0.75 s -> new 1.12/0.73/1.11 s.
- ingest, stamp-only path (3 runs): main 0.74/0.93/0.67 s -> new 0.84/0.81/0.87 s.
- Net cost of the decisions compile: roughly +0.1 to +0.2 s per mapped ingest (one extra pass over the unfiltered scan plus a 130 KB read-compare).

## What changed
- `src/wiki/synthesis/decisions.ts` (new): `compile`, `latestDecisions`, `readUnlabelledContradictions`.
- `templates/synthesis/decisions.md` (new): header + lag note + `{{body}}`.
- `wiki-ingest.ts`: `SYNTHESIS_PAGES` (renamed, + decisions), map gains decisions for 7 buckets, `compileSynthesisPage(page, items, allItems, templateDir, cwd)`, `recompileSynthesis(..., items, allItems, opts)`; handler passes `scanned`. `writeSynthesisPage` signature unchanged; decisions is always written only on a byte difference and is not in the roadmap/active-sprint pair.
- `wiki-build.ts`: writes decisions.md from the unfiltered scan; prints `wiki build: warn: skipped <path>: malformed frontmatter` via the new `scanRawItems(..., onSkip)`.
- `lint-checks.ts` `checkDecisionsSize`, `wiki-lint.ts` prints it among the warnings.
- Docs (canonical scaffold only): protocol §10.1 (decisions.md line + G-M2-56 index wording), §10.2, §21.1 (both commands compact; decisions-size sentence); query agent Step 1 + Gherkin example replaced; Codex TOML regenerated.
- Shape-change reds updated: 7 map pins in `wiki-ingest-synthesis-parity.red` (note "superseded by STORY-063-10 R7"), the §10.1 pin in `index-lint-config.red` ("superseded by G-M2-56"). No other committed test edited.

## Decisions / notes
- Pair collection: AI Interrogation Loop and Open Questions sections; if one section text contains the other (epic with a nested `### Open Questions`), only the outer is read, so a pair is counted once; identical pairs are not de-duplicated.
- Supersedes scans the item body (answers and rules are inside it), per-sentence, first ID after each active verb; skips `not|never` before the verb, `superseded by`, and self IDs.
- Story file Task Breakdown left unticked: the story file lives in the outer repo's delivery tree, outside the branch I was told to commit to; the orchestrator should tick it.

plan_deviations: []

adjacent_files:
- cleargate-cli/src/wiki/lint-checks.ts (bucket-registry-parity / lint tests)
- cleargate-cli/scaffold/hosts/codex/.codex/agents/cleargate-wiki-query.toml (generated)

flashcards_flagged:
- "2026-11-12 · #wiki #decisions · Epic `## 6` holds a nested `### Open Questions`; collecting both sections double-counts unless the contained one is dropped."
- "2026-11-12 · #wiki #ingest · decisions.md is ~33k tokens on this repo (plan said 25k); decisions-size warns permanently, ingest +0.1-0.2 s."
- "2026-11-12 · #test-harness #shell · A regex that bulk-edits pins across a test file also rewrites the map lookups and comments; diff the result before running."
