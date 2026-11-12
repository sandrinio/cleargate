# STORY-063-13 QA-Verify (role: qa)

STORY: STORY-063-13 (off-sprint, EPIC-063 M2) — branch story/STORY-063-13, ffbf104 on red f401e99
QA: PASS
TYPECHECK: pass (tsc --noEmit, exit 0)
TESTS (targeted, 8 files): 244 pass, 0 fail, 0 skipped (live sweep ran, not skipped). Full suite not re-run per instruction (Dev: 4181/0).
Outer delivery tree md5 before/after: identical (627 files).

## Acceptance map
- Outline rows 1-4 (parent_ref / parent_epic_ref story / placeholder / key precedence): relations-handlers.red "Outline" rows 1-4 + parentIdOf key-order/placeholder tests.
- Single-file ingest keeps neighbours current (R5): handlers "re-pointed B->C", re-parenting, G-M2-5 creation cases, sequence-of-ingests == full build, mtime kept (amend 6), sprint plan/report order parity (amend 4).
- Lint accepts excluded-bucket parent (R7): handlers "CR-S parent STORY-Y-02", lint-checks R7 tests, initiative parent (G-M2-37).
- Capped body / complete frontmatter (R3): handlers EPIC-H 25+25 (20 + "+5 more"), buildRelationsBlock cap tests (20 vs 21).
- Error: missing parent (R6): handlers BUG-Z -> "(not found)", build exit 0, lint reports it; ingest exit 0.
- R1 parentIdOf; R2 children incl. stories (no story page); R4 single computeRelations + deleted helpers (buildChildrenRefs-deleted test); R5; R6; R7 incl. topic-lint unchanged and legacy-page strip (amend 7). All mapped, none MISSING.
- Real-corpus sweep: broken-backlink count == parents that exist nowhere (CR-015 -> SPRINT-001).
- Task Breakdown: 6 unchecked rows are the story's own pre-work checkboxes; advisory, not bounced. The two post-0.30.0 DoD items (grep of rebuilt wiki, open EPIC-063) are release-time, not this gate; scratch evidence below satisfies both.

## Real-data scratch build (branch source, copy of delivery+sprint-runs+config, git-init'd; 344 pages, ~40s under load)
- EPIC-063: children block list of 16 incl. CR-127/129/130 + STORY-063-01..13; cites 12; cited_by 18; one relations block, last in body; last_contradict_sha and raw_path survive.
- EPIC-043: frontmatter children = 42 full; body "Children (42): ... +22 more" (20 shown).
- EPIC-058: 21 children; cited_by 22 -> 20 + "+2 more"; frontmatter lists block-style.
- BUG-048: children [], cites/cited_by block lists, relations block "Parent: none / Cites (2) / Cited by (2)".
- SPRINT-44: relations block (lines 33-37) precedes the sprint-report block (38-350) intact; report_raw_path, raw_path survive.
- 174 pages with `parent: "[[`; one "(not found)" (CR-015); zero stale "## Blast radius" in output; 1 page with last_contradict_sha (as corpus).

## Timing (informational; 20 runs each, scratch tsup bundles of c7ab958 vs ffbf104, scratch corpus, CLEARGATE_NO_UPDATE_CHECK=1)
Machine load average was 10-12 throughout (noisy; treat as indicative).
| path | main p50 / p95 | branch p50 / p95 |
|---|---|---|
| CR-001 ingest (clean, no-op) | 563 / 616 ms | 554 / 741 ms |
| CR-002 ingest (parented, clean no-op) | 502 / 665 ms | 510 / 789 ms |
| CR-002 dirty (write path) | 792 / 1304 ms | 685 / 1152 ms |
No measurable p50 regression from the single corpus scan; p95 on the no-op path is ~+100-125 ms but within load noise (the write path went the other way). Checkout dist/ and tree untouched (git status clean).

## Diff review ffbf104
- Purity: relations.ts and page-schema.ts import no node:fs / node:child_process. OK.
- load-wiki.ts: only `const BUCKET_DIRS` -> `export const`. OK.
- Protocol §10.4 field note and §10.5 text match code (computeRelations, markers, cap 20 `, +N more`, excluded/initiative parents accepted, not-found rendering, neighbour rewrite). Accurate.
- Stale "Blast radius" in src/: only page-schema.ts:623-638 legacy-strip helper (intentional, amend 7). None live.

## Findings
1. (info) Protocol §10.4 body example (scaffold/core/.cleargate/knowledge/cleargate-protocol.md:296-297) still shows `## Blast radius` / `Affects:`; plan C08 owns that rewrite (M2.md:564). Must land in 08.
2. (info) Remaining "Blast radius" instructions for 08 to rewrite: scaffold/hosts/claude/.claude/agents/cleargate-wiki-ingest.md:86 and cleargate-wiki-query.md:101; scaffold/hosts/codex/.codex/agents/cleargate-wiki-ingest.toml:83 and cleargate-wiki-query.toml:98 (templates/** copies are generated). Template headings (CR.md §2, Bug.md §4) are unrelated work-item sections.
3. (low) Ingest p95 on the no-op path trended slightly up under heavy load; re-measure on a quiet machine if a budget is ever set.
No blocking findings.

VERDICT: ship it.

flashcards_flagged:
  - "2026-11-12 · #qa #wiki #test-harness · zsh doesn't word-split $VAR file lists; use an inline list or array when passing many test files to tsx --test."
  - "2026-11-12 · #wiki #perf · wiki ingest timing: a clean file no-ops; append a line to the scratch raw file to time the write path."
