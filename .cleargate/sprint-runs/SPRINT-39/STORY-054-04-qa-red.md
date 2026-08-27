---
story_id: STORY-054-04
role: qa
mode: RED
sprint_id: SPRINT-39
milestone: M1
created_at: 2026-08-27
---

# STORY-054-04 QA-Red report — bucket registry parity

## Deliverable

`cleargate-cli/test/wiki/bucket-registry-parity.red.node.test.ts`, authored on branch
`story/STORY-054-04` in the `cleargate-cli` checkout (own repo, off `main`, commit
`993210a54344511e72e482ddf8fa172618b59ce3`). Test code only — `git diff main..HEAD -- src/`
is empty. The outer-repo worktree `.worktrees/STORY-054-04` (Developer's commit A, the
`config.yml` half) was not touched.

## Shape

Follows the M1 plan's NORMATIVE test shape (plans/M1.md:265-312) verbatim:

- `DELIVERY_BUCKETS` extracted by regex from `derive-bucket.ts`'s `PREFIX_MAP` (source
  TEXT, not import — the constant is module-private).
- `SITES`: ten named extractors, one per follower registry, each reading its own file by
  TEXT (`page-schema.WikiPageType/BUCKET_LABELS/ACTIVE_BUCKET_ORDER/ARCHIVE_BUCKET_ORDER`,
  `wiki-build.BUCKET_ORDER`, `wiki-ingest.BUCKET_SYNTHESIS_MAP`, `load-wiki.BUCKET_DIRS`,
  `product-state.buckets`/`total_*`, `synthesis-template.mustache`).
- `checkBucketParity()` — collects every `(bucket, site)` finding, never stops at the
  first; message shape matches the plan's exact template.
- `KNOWN_BUCKET_GAPS` — `Map<string,string>`, independently re-derived (see below), each
  row citing BUG-051.
- Seven assertions P1-P7 as separate `test()` blocks (not sequential asserts inside one
  block) so each has an independently visible pass/fail state — required so a P1 failure
  can't hide whether P5 is truly green (FLASHCARD 2026-08-27 `#test-harness #tpv #danger`).
- Scenario 3 (§2.1) covered as two negative unit tests against `checkBucketParity` in
  isolation (single-site-missing naming + multi-site collection), independent of the real
  source tree's state.
- P7: two acceptance tests against a `buildFixture()` tmpdir (`test/wiki/_fixture.ts`),
  exercising the real `wikiIngestHandler` / `wikiBuildHandler` with a `SPIKE-001_Probe.md`
  charter and a config.yml carrying `spikes` in `wiki.ingest_buckets`.

## KNOWN_BUCKET_GAPS — independently re-derived, not copied on faith

Ran all ten extractors against the current tree and diffed against `DELIVERY_BUCKETS`
(the current 7 buckets: epics, stories, sprints, proposals, crs, bugs, initiatives).
Exactly 5 gaps, matching the Architect's M1-plan count exactly — no disagreement to flag:

| bucket | site |
|---|---|
| `initiatives` | `load-wiki.BUCKET_DIRS` |
| `initiatives` | `product-state.buckets` |
| `initiatives` | `product-state.total_*` |
| `initiatives` | `synthesis-template.mustache` |
| `stories` | `synthesis-template.mustache` |

Every other site (`WikiPageType`, `BUCKET_LABELS`, `ACTIVE_BUCKET_ORDER`,
`ARCHIVE_BUCKET_ORDER`, `wiki-build.BUCKET_ORDER`, `wiki-ingest.BUCKET_SYNTHESIS_MAP`)
carries all 7 current buckets already.

## Baseline run

Targeted (`npm --prefix cleargate-cli exec -- tsx --test cleargate-cli/test/wiki/bucket-registry-parity.red.node.test.ts`):
**6 passed, 5 failed**, 11 tests total.

**RED (correct reasons):**

- **P1** — `DELIVERY_BUCKETS has 7 entries (epics, stories, sprints, proposals, crs, bugs,
  initiatives), expected >= 8`. `deriveBucket()` has no `SPIKE-` row yet — this is the HARD
  BLOCKER expressed as an assertion.
- **P6a** — outer `.cleargate/config.yml` `wiki.ingest_buckets` is
  `[epics, sprints, proposals, crs, bugs, initiatives]`, missing `spikes` (Developer's
  commit A, not yet landed).
- **P6b** — same for `cleargate-planning/.cleargate/config.yml`.
- **P7 Scenario 1** — ingest exits 1: `wiki ingest: cannot determine bucket for
  .../SPIKE-001_Probe.md: deriveBucket: cannot determine bucket for filename:
  SPIKE-001_Probe.md` (caught internally by `wiki-ingest.ts`'s try/catch around
  `deriveBucket`, converted to `exit(1)` — not an uncaught throw).
- **P7 Scenario 2** — `wiki build` exits 0 (scan.ts silently *skips* the unrecognised
  `SPIKE-` file rather than aborting — verified at `scan.ts:61-63`), but the rendered
  `product-state.md` has no `| Spikes |` row at all: full table content is attached to the
  assertion failure.

**GREEN (correct reasons, not a defect):**

- **P2** (the matrix) — passes at baseline. This is BY DESIGN, not an oversight: per the
  M1 plan's "Reference set" note, `DELIVERY_BUCKETS` is derived FROM `PREFIX_MAP`, so until
  the HARD BLOCKER (P1) is fixed, the matrix iterates only the 7 pre-existing buckets — and
  those 7 already satisfy every site except the 5 `KNOWN_BUCKET_GAPS` rows (verified
  exhaustively above). So none of the ten follower sites is individually flagged "missing
  spikes" by P2 at baseline; P1 alone carries the site-1 red signal, and P2 only starts
  demanding `spikes` in sites 2-11 once P1 is fixed by the Developer. Net: at baseline, all
  eleven sites are in fact missing `spikes` — site 1 is caught directly by P1; sites 2-11
  are transitively invisible to P2 until site 1 lands, which is the intended two-stage
  design (a matrix keyed on a reference set that doesn't yet contain the new member cannot
  demand the new member elsewhere either — that's what makes P1 a hard blocker rather than
  one row among eleven).
- **P3** — `KNOWN_BUCKET_GAPS.size === 5`, independently re-derived (see table above), and
  every row cites BUG-051.
- **P4** — `KNOWN_BUCKET_GAPS` never named `spikes` — authored without one from the start.
- **P5** — all ten extractors currently return non-empty arrays (verified: WikiPageType 8
  entries, BUCKET_LABELS 8, ACTIVE/ARCHIVE_BUCKET_ORDER 7 each, wiki-build.BUCKET_ORDER 8,
  BUCKET_SYNTHESIS_MAP 9 keys, BUCKET_DIRS 7, product-state.buckets 6, product-state.total_*
  6, mustache 5). If P5 goes red later, an extractor regex broke against the tree — a
  finding, not a nuisance.
- **Scenario 3 negative tests** — unit-level against synthetic site lists, independent of
  the real tree's state; pass unconditionally.

## Typecheck

`npm --prefix cleargate-cli run typecheck` — clean, no errors.

## Full suite (run by hand — Cross-Cutting Rule 6, cleargate-cli has zero installed hooks)

`npm --prefix cleargate-cli test`: **2504 tests, 2497 passed, 6 failed, 1 skipped**
(371.2s). The 6 failures are exactly: the 1 pre-existing `test/commands/sync.node.test.ts`
network failure (`cannot reach https://cleargate-mcp.soula.ge` — no outbound network in
this sandbox, fails identically on `main`, not mine) **plus** this file's 5 RED assertions
(P1, P6a, P6b, P7 Scenario 1, P7 Scenario 2). Pre-story baseline was 2493 tests (per
sprint-context.md); 2493 + 11 (this file's test count) = 2504 — confirmed no other test
file changed count. **No regressions** — every test that passed before this file still
passes.

## Wiring soundness (for Architect TPV)

- Imports resolve: `wikiIngestHandler`/`wikiBuildHandler` from `../../src/commands/*.js`,
  `loadWikiConfig` from `../../src/lib/wiki-config.js`, `buildFixture` from `./_fixture.js`
  — all confirmed present, typecheck clean.
- Constructor/option signatures match `WikiIngestOptions`/`WikiBuildOptions` exactly
  (`rawPath`, `cwd`, `now`, `stdout`, `stderr`, `exit`, `gitRunner`, `templateDir`).
  `exit`'s `EXIT:<code>` throw-and-catch idiom mirrors `test/wiki/ingest.node.test.ts`'s
  established pattern.
- File naming: `bucket-registry-parity.red.node.test.ts` — matches sprint-context.md
  §Test Stack's `*.red.node.test.ts` red-test naming convention (see NOTES below on why
  this differs from the M1 plan's inline filename).
- CLEARGATE_META_ROOT override present for the two config-file paths (R18); the ten
  source-site extractors deliberately do NOT use it (R18: they read `cleargate-cli/src/**`
  which is unaffected by outer-repo worktree state).

## Script Incidents

None. No `run_script.sh` invocation was required — only `npm --prefix`, `tsx --test`, and
direct `git`/`node` commands, all run directly per the dispatch's explicit exemption
(these are not `.cleargate/scripts/*.mjs` invocations).

## NOTES for the Developer

1. **File naming diverges from the M1 plan's inline text, deliberately.** `plans/M1.md`
   §Test shape (line 267) and the §File surface table (line 259) both name the file
   `bucket-registry-parity.node.test.ts` (no `.red.`). The dispatch for this QA-Red task
   explicitly named the deliverable `bucket-registry-parity.red.node.test.ts`, matching
   sprint-context.md §Test Stack's blanket "Red-test naming: `*.red.node.test.ts`" rule and
   the precedent already in this test directory (`wiki-ingest-synthesis-parity.red.node.test.ts`,
   which kept its `.red.` suffix permanently after merging, per CR-081 red-now-green). I
   followed the dispatch + sprint-wide convention. **Do not rename the file when you
   implement** — per CR-081, this same file goes from red to green in place; a second
   `bucket-registry-parity.node.test.ts` would be a redundant duplicate under
   reuse-over-recreate (Rule 18).
2. **Fix order matters for the test to go green in one pass.** P1 (the `PREFIX_MAP` row)
   must land before P2 can meaningfully check sites 2-11 for `spikes` — this mirrors the
   Commit-A-before-Commit-B inert-intermediate ordering the M1 plan already specifies for
   the two-repo split, but it *also* applies within Commit B's eleven-site edit alone: add
   the `PREFIX_MAP` row first (or in the same edit pass as everything else — order within
   one commit doesn't matter, only that all eleven land together before you run the suite).
3. **P7 Scenario 2's baseline table has zero rows for anything** (Epics: 0, Sprints: 0,
   etc.) — this is expected: the tmpdir fixture only contains the one spike file, and until
   `deriveBucket` recognizes `SPIKE-`, `scanRawItems` silently drops it (see `scan.ts:61-63`
   "Not a recognized work-item filename — skip silently"), so the build sees zero items of
   any bucket. Once the `PREFIX_MAP` row lands, the fixture item resolves to `bucket:
   'spikes'` and P7 Scenario 2 needs `product-state.buckets` (site 8), `total_*` (site 9),
   AND the mustache row (site 10) all present to produce `| Spikes | 1 | ... |` — all three
   are HARD requirements for this specific assertion, not just S2's general P2 sweep.
4. **`BUCKET_SYNTHESIS_MAP` is the one site that is already exported** in production
   (`wiki-ingest.ts:565`). This test still reads it by source TEXT for uniformity with the
   other nine sites — do not read this as license to import it; the private-constant rule
   still applies to the other five and P2's exception-table pattern only makes sense if all
   ten extractors follow one method.
