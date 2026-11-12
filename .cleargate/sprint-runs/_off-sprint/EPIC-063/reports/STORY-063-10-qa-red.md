# STORY-063-10 QA-Red (role: qa, Mode: RED, off-sprint EPIC-063 M2)

QA-RED: WRITTEN
Worktree `story/STORY-063-10` (base 2c40864). Nothing committed; no src/ or scaffold/ edits.
Aligned to G-M2-56 (received mid-flight): no `writeSynthesisPage` / `compileSynthesisPage` signature is pinned; behaviour is pinned instead (decisions is fed the unfiltered `scanned`, takes the write-on-byte-difference stamp-only path, is outside the coupled pair); the three G-M2-56 doc carry-forwards are pinned.

Baseline (2c40864): 154 red, 6 green guards.
Self-check: a throwaway reference implementation in a scratch copy (outside the repo) turned all 4 files green, including the live sweep on the real corpus (402 answers == 402 `- Q:`, 99 rules == 99, 32,788 tokens). Two mutations (ingest fed the filtered list; passive/self supersede unguarded) each turned the matching reds red.

## Files (test/wiki/)
| File | Red | Guards |
|---|---|---|
| decisions-unit.red.node.test.ts (compile, latestDecisions, readUnlabelledContradictions, scan onSkip) | 87 | 1 |
| decisions-page.red.node.test.ts (real build / ingest / lint handlers) | 42 | 2 |
| decisions-wiring.red.node.test.ts (map, rename, template, checkDecisionsSize, docs) | 24 | 3 |
| decisions-corpus.live.integration.node.test.ts (scratch copy; independent count) | 1 | 0 |
| _decisions-support.ts | helpers | |
Plan names `decisions-page.node.test.ts`; realised as `.red.` per the QA-Red naming rule.
Guards (green on purpose): onSkip-absent scan unchanged; "clean corpus prints no warn: skipped"; spikes leave an existing decisions.md alone; topics/spikes/unknown map entries unchanged; map literal shape kept; `build-codex-payload.mjs --check` exits 0 (goes red if the TOML is hand-edited or not regenerated).

## Scenario -> test
- Gherkin 1: page Gherkin 1 (both configs: default, stories excluded), unit R1/R6/R3, unit R1 rules (5 open + 5 terminal statuses), truncation (41/40 and 21/20 words).
- Outline (3 rows + G-M2-46 tokens): unit R2 (13 rows), page Outline (7 rows).
- Gherkin 3: unit R4 matrix (13 sentences) + page Gherkin 3 + unit R5 / C10.3.
- Gherkin 4: page Gherkin 4 (ingest == fresh build, latestDecisions(items,1), junk-overwrite non-vacuous), R7 7 buckets, lint warn (wiring unit + page R9).
- Gherkin 5: unit orphan + onSkip, page Gherkin 5 (exact `wiki build: warn: skipped <path>: malformed frontmatter`, ingest silent, page still written).
- G-M2-46: EPIC-903 / CR-901 fixtures (inline, indented, Recommended); live independent counter over all three forms and rule 5.
- G-M2-53 stamp-only: page G-M2-53 (approved_at flip; a same-length answer edit hidden past the page budget; mtime kept when bytes equal). Page-body precondition asserted first.
- G-M2-16 / C10.2: unit latestDecisions (9 cases). C10.4 / G-M2-17: wiring map pins. Docs: §10.1 decisions line, §10.2 list, §10.1 index line, §21.1, query agent Step 1 + example gone (Claude + Codex).
- G4 / R1 / R2 / R8 / R9 on the real corpus: live file.

## Shape-change reds (existing tests this story deliberately breaks; Dev updates, "superseded by STORY-063-10")
1. `wiki-ingest-synthesis-parity.red.node.test.ts` per-bucket map pins, lines 352-428: sprints, epics, proposals, stories, crs, bugs, initiatives each gain `decisions` (7 tests). topics and unknown unchanged.
2. `index-lint-config.red.node.test.ts:164-172` (09): asserts the §10.1 index line says "one line per open item"; G-M2-56 replaces it with "every open item once (...)". Update to the new wording.
Census of `ALL_FOUR_SYNTHESIS_PAGES`: private (non-exported) const in src/commands/wiki-ingest.ts only; no test references it (my wiring test pins its absence and `SYNTHESIS_PAGES`). Tests that list the four page files (build.node:101, ingest.node:273, extract-sections-sources-f1:109-135, product-state/open-gates reads) are subset checks and stay green; the F1-4 test needs the four names to stay in §10.2.

## Ambiguities (default chosen)
1. Page layout beyond the plan: `# Decisions` title; block lines ordered Q*, Rule*, Supersedes*; `## Unresolved conflicts` after all blocks; `_None._`. Pinned.
2. Truncation literal: first 20/40 words joined by one space, then `… ([[ID]])` (no space before the ellipsis); question and rule too. 41 words cut, exactly 40 kept. Pinned.
3. Entries are single-line (continuation joined). Pinned.
4. Block exists only if the item has at least one entry (Q or Rule). Supersession-only items: not pinned.
5. `Supersedes` is item-level; `latestDecisions[].supersedes` equals the block's list. Order of lines = body order; only the first ID after the verb; a self-reference yields nothing; "not" is a whole word ("Notably" does not block); "not" after the verb does not block.
6. Terminal epics keep their answered decisions, lose their rules. Open = not in TERMINAL_STATUSES (status, not the archive/ path).
7. A pair reachable from both section patterns (nested `### Open Questions` inside the AI Interrogation Loop) counts once; identical pairs inside one section stay separate (corpus CR-080 shape; the live equality needs it). Plan silent; waive if unwanted.
8. `readUnlabelledContradictions` returns bare IDs and the JSON-decoded claim; file order; also reads entries appended after a `findings: []` skeleton.
9. `scanRawItems(delivery, repo, onSkip?)` third argument, called only for unparseable frontmatter, not for non-work-item filenames. Build warns once per path; ingest stays silent.
10. Undated items (no approved_at / updated_at): date `''`, sorted last; page header rendering for them is not pinned.
11. Live count is the exact G4 equality (independent counter calibrated to 402 / 347 on today's corpus), with floors > 300 answers and > 20 rules.
12. Not covered: the G-M2-56 "pass `scanned`, not `forRelations`" distinction (an out-of-tree raw file); covered only through the unfiltered-scan behaviour tests.

flashcards_flagged:
- "2026-11-12 · #qa-red #wiki · A decisions page must not de-duplicate identical Q/A pairs: CR-080 repeats one, and the corpus count equality needs both."
- "2026-11-12 · #qa-red #test-harness · A stamp-only red needs an edit the page does not show: a rule or sprint answer edit changes the body; hide a same-length edit past the 2,400-char cut."
- "2026-11-12 · #wiki #decisions · STORY-063-10's own question quotes `**Human decision:**` in backticks; a swallowed-answer check must strip code spans first."
- "2026-11-12 · #qa-red #docs · Docs pins that quote a phrase (09's 'one line per open item') go stale when a later amendment rewords it; list them as shape-change reds."
