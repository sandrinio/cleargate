---
story_id: "STORY-043-07"
sprint_id: "SPRINT-33"
author: "qa"
created_at: "2026-06-01T15:00:00Z"
qa_bounces: "0"
arch_bounces: "1"
---

# STORY-043-07 QA Report: Incremental Wiki Synthesis Recompile

## Verdict

QA: PASS

## Metrics

STORY: STORY-043-07
TYPECHECK: pass (npx tsc --noEmit — zero output)
TESTS (red suite): 24 passed, 0 failed, 0 skipped
TESTS (wiki glob): 355 passed, 2 failed, 0 skipped
TESTS (red file alone): 24/24 green — all 6 describes, zero skips
ACCEPTANCE_COVERAGE: 4 of 4 Gherkin scenarios have matching tests
MISSING: none
REGRESSIONS: none (2 wiki fails confirmed pre-existing)
PARITY_FLOOR: PASS — Scenario 3 byte-identical assertion green

## Commit Inspection

Commit: f9f1974
Branch: story/STORY-043-07
Files changed: 2 (src/commands/wiki-ingest.ts + test/wiki/wiki-ingest-synthesis-parity.red.node.test.ts)
No synthesis recipe files touched. No PostToolUse hook touched. Scope matches §3.1 exactly.

## Pre-existing failures confirmed

1. test/wiki/build.node.test.ts — "wiki page has all 9 frontmatter fields"
   TypeError: Cannot use 'in' operator to search for 'type'
   Present at ef1cf94 (parent commit) — CONFIRMED PRE-EXISTING.

2. test/wiki/ingest.node.test.ts — "skips path in .cleargate/sprint-runs/"
   ReferenceError: require is not defined
   Line 513 uses CJS require() in ESM test file — present at ef1cf94 — CONFIRMED PRE-EXISTING.

Confidence: HIGH — both failures trace to lines present verbatim in the parent commit's source.

## DEV1 Verdict: buildPlanStub summary change — ACCEPTABLE

Change: body.split('\n')[0] → body.trim().slice(0, 200)

(a) Correctness of stated rationale: PARTIALLY INCORRECT. The dev stated body.split('\n')[0]
    returns '' because "body starts with blank line after ---". This is wrong:
    parseFrontmatter (parse-frontmatter.ts:32) already strips the leading blank line before
    returning body. So body.split('\n')[0] would return "# EPIC-001: Test Epic", not ''.

(b) However the change is still CORRECT for a different reason: body.trim().slice(0,200)
    captures multi-line body content (H1 + subsequent lines), enabling detectStampOnly()
    to detect body changes that occur on lines after line 1. With split('\n')[0], a body
    edit on line 2 or later would produce the same summary → detectStampOnly incorrectly
    returns true → stamp-only fast-exit fires when it should not. The change fixes a real
    (if subtly different) correctness gap.

(c) In-scope: same production file, single call site, required for stamp-only detection
    to work correctly. The story spec §3.2 step 3 says "compare the new item's
    non-stamp body+status against the previously-ingested wiki page" — this change is
    required for that comparison to be meaningful across all body-edit patterns.

(d) Broken tests: NONE. Grep of test/ found zero assertions on old summary shape.
    wiki-ingest-sprint-report.red.node.test.ts (15/15 pass) — uses description: fm field
    (takes priority over body fallback) so unaffected.

VERDICT: Acceptable. The rationale has a factual error about parseFrontmatter behavior but
the change is semantically correct and necessary for stamp-only detection to be reliable.

## DEV2 Verdict: Bootstrap fallback — SOUND

The bootstrap condition (synthesisPagesNotInitialized) fires only when at least one of the
4 synthesis pages is absent from wikiRoot. Once all 4 exist (after first cleargate wiki
build or after first complete incremental corpus ingest), the condition is false and the
partition-targeted path executes.

Steady-state verification: Scenario 1 and Scenario 1b pass — after runBuild() creates all
4 synthesis pages, incremental ingest of an epic ONLY rewrites product-state.md + roadmap.md
(mtime assertions confirm active-sprint.md and open-gates.md are untouched). The bootstrap
path does NOT defeat the optimization in steady-state.

The bootstrap is required for Scenario 3 (parity floor): without it, incremental ingest of
an epics item into a fresh wiki would never write active-sprint.md or open-gates.md, causing
drift from cleargate wiki build output.

VERDICT: Sound. Bootstrap is a correct correctness fallback that does not defeat the
partition optimization on the steady-state path.

## Partition Correctness

BUCKET_SYNTHESIS_MAP matches §1.2 exactly (all 9 entries verified against spec table).
detectStampOnly: null-prior fail-safe confirmed at implementation level and by 2 unit tests.
Full-rebuild path (no opts) → ALL_FOUR_SYNTHESIS_PAGES — correctness floor intact.
old comments "// (all four — M3 over-recompiles)" removed from both lines ~313 and ~661.

## DoD Checklist

- [x] recompileSynthesis() recompiles only the changed item's partition pages
- [x] Stamp-only edit writes zero synthesis pages (Scenario 2 passing)
- [x] "all four — M3 over-recompiles" comments removed (grep returns nothing)
- [x] Parity test asserts incremental == full-rebuild, throws named Error on drift (Scenario 3+4)
- [x] cleargate wiki build full-rebuild still produces all four pages (regression tests pass)
- [x] npm run typecheck clean + npm test green for wiki tests
- [x] No change to synthesis recipes, PostToolUse hook, config semantics, or other WS files

