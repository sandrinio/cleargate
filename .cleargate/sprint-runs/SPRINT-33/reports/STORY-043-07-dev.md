---
story_id: "STORY-043-07"
sprint_id: "SPRINT-33"
author: "developer"
created_at: "2026-06-01T14:30:00Z"
qa_bounces: "0"
arch_bounces: "1"
---

# STORY-043-07 Developer Report: Incremental Wiki Synthesis Recompile

## Status

STATUS: done
COMMIT: f9f1974
TYPECHECK: pass
TESTS: 24 red passed (24/24), wiki suite 355 pass / 2 fail (both pre-existing), full suite 2240 pass / 86 fail (baseline was 2221 / 105 — net +19 pass)
FILES_CHANGED: cleargate-cli/src/commands/wiki-ingest.ts

## Implementation Summary

Modified `cleargate-cli/src/commands/wiki-ingest.ts` only (single production file per plan).

### Key additions

1. **`BUCKET_SYNTHESIS_MAP` (exported const)** — static lookup mapping each ingest bucket to the synthesis pages it affects:
   - `sprints` → `['active-sprint', 'product-state', 'roadmap']`
   - `epics` → `['product-state', 'roadmap']`
   - `proposals` → `['open-gates', 'product-state']`
   - `stories`, `crs`, `bugs` → `['product-state']`
   - `initiatives`, `topics` → `[]` (no recompile)

2. **`detectStampOnly(newBody, newStatus, oldBody, oldStatus)` (exported fn)** — pure comparator returning true only when body AND status are identical to prior and prior page is readable (fail-safe false when either old param is null).

3. **`writeSynthesisPage(page, items, wikiRoot, templateDir)` (private)** — shared switch-case helper calling the existing `compile*` functions. Both the incremental path and full-rebuild path call this, guaranteeing byte-identical output.

4. **`recompileSynthesis()` signature extended** with `opts?: { bucket?: string; stampOnly?: boolean }`:
   - `stampOnly=true` → return immediately (zero writes)
   - any of the four synthesis pages missing → bootstrapping: write all four
   - opts.bucket provided and all pages exist → partition-targeted via BUCKET_SYNTHESIS_MAP
   - no opts (full-rebuild call from wiki-build) → all four (correctness floor)

5. **Step-8 call site updated** to compute `stampOnly` from `priorPageBody` vs `pageBody` comparison and pass `bucket` from `deriveBucket` result.

### Non-trivial deviation from blueprint

**`buildPlanStub` summary extraction changed** from `body.split('\n')[0]` to `body.trim().slice(0, 200)`. This was required because the red test fixtures embed the raw body below a blank line, making `body[0]` always `''`. Without this change, `detectStampOnly` could not distinguish a raw body change from a stamp-only frontmatter change (both produced identical wiki page bodies). The blueprint's direction to "compare `pageBody` against prior `existingPageBody`" implicitly assumes the wiki page body captures meaningful content from the raw body — which was not the case with the first-line extraction for these fixture shapes. This deviation does not affect synthesis output (synthesis uses fm fields only) and is consistent with the correctness floor constraint.

**Bootstrapping fallback** added (blueprint implied but not explicitly stated): when any of the four synthesis pages don't exist yet (wiki not yet initialized), `recompileSynthesis` falls back to writing all four. This was required to pass Scenario 3 (parity floor): incremental ingests into a fresh wiki would never write `open-gates.md` if no proposals exist, causing drift from `cleargate wiki build` output.

## Pre-existing failures (not introduced by this story)

- `test/wiki/build.node.test.ts: wiki page has all 9 frontmatter fields` — TypeError: `Cannot use 'in' operator to search for 'type'` — pre-existing
- `test/wiki/ingest.node.test.ts: skips path in .cleargate/sprint-runs/` — ReferenceError: `require is not defined` — pre-existing
- `test/wiki/contradict-cli.node.test.ts: Scenario 5` — ReferenceError: `it is not defined` — pre-existing
