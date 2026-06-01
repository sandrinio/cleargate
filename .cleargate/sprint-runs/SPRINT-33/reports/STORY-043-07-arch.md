---
story_id: STORY-043-07
sprint_id: SPRINT-33
author: architect
mode: post-flight
created_at: 2026-06-01T16:30:00Z
commit_reviewed: f9f1974
branch: story/STORY-043-07
---

# STORY-043-07 Architect Post-Flight: Incremental Wiki Synthesis Recompile

ARCH-POSTFLIGHT: FAIL

## Verdict summary

`BUCKET_SYNTHESIS_MAP` is structurally UNDER-MAPPED. The map was derived from only the
FIRST bucket filter of each synthesis compiler (see the diff's own comment block at
`wiki-ingest.ts:674-676`, which documents only `active-sprint.ts:16`, `open-gates.ts:26`,
`product-state.ts:36`, `roadmap.ts:25-26`). It missed the SECOND and THIRD bucket filters
inside `open-gates.ts` and the unfiltered `shippedItems` scan in `product-state.ts`.
Result: at least one synthesis page goes stale (drifts from `cleargate wiki build`) on a
normal lifecycle edit. The red test encodes the same incomplete map as its expected value,
so it locks the bug in rather than catching it. The parity floor is breached.

## ISSUES

### ISSUE-1 (FAIL, LIVE in default config) — open-gates Gate 3 under-mapped for epics/crs/bugs/sprints

`open-gates.ts` Gate 3 (`src/wiki/synthesis/open-gates.ts:41-46`) has NO `i.bucket` filter.
It selects ANY item with `status === 'Ready'` AND empty/null `remote_id`. So an `epics`,
`crs`, `bugs`, or `sprints` item entering the `Ready` state must change `open-gates.md`.

`Ready` is a documented epic status (`roadmap.ts:90` `isPlannedStatus` lists `Ready`), so
this is a normal lifecycle state, not an edge case.

The shipped map (`wiki-ingest.ts:680-689`):
- `epics → ['product-state', 'roadmap']` — MISSING `open-gates`
- `crs → ['product-state']` — MISSING `open-gates`
- `bugs → ['product-state']` — MISSING `open-gates`
- `sprints → ['active-sprint', 'product-state', 'roadmap']` — MISSING `open-gates`

Drift repro: incremental-ingest an epic whose `status` flips to `Ready` with empty
`remote_id`. Full `cleargate wiki build` lists it in open-gates.md Gate 3; the incremental
path maps `epics → [product-state, roadmap]`, never writes open-gates.md → open-gates.md
goes STALE → byte-divergence from full rebuild. **Parity floor violated.**

All four buckets (epics/crs/bugs/sprints) are in the DEFAULT `ingest_buckets`
(`.cleargate/config.yml:13-17` and canonical `cleargate-planning/.cleargate/config.yml`),
so this drift is reachable in the shipped default — not gated behind an opt-in bucket.
(The current dogfood corpus happens to hold only one `Ready` item — a proposal, which is
correctly mapped — so the live tree does not exhibit drift TODAY. That is incidental corpus
state, not a structural guarantee.)

### ISSUE-2 (FAIL, masked by default config) — open-gates Gate 2 under-mapped for stories

`open-gates.ts` Gate 2 (`open-gates.ts:34-38`) selects `stories` whose `ambiguity` starts
with 🟡 or 🔴. The map has `stories → ['product-state']` (`wiki-ingest.ts:684`) — MISSING
`open-gates`. A story whose `ambiguity` is edited to/from an elevated marker must change
open-gates.md but the incremental path skips it.

Masked in the DEFAULT config because `stories` is excluded from `ingest_buckets`
(config.yml omits it; the corpus scan at `wiki-ingest.ts:779-780` filters synthesis input by
`ingest_buckets`, so stories never feed synthesis by default). REACTIVATES the moment a repo
adds `stories` to `ingest_buckets` — which the config comment explicitly invites
("Add `stories` here if you want per-story wiki pages back"). The CLI ships to all repos, so
the map must be correct for the configurable case, not just the dogfood default.

### ISSUE-3 (FAIL, latent) — product-state shippedItems under-mapped for initiatives/topics

`product-state.ts:44` `shippedItems = state.filter(isShipped)` is UNFILTERED by bucket — any
archived item (rawPath contains `/archive/`) appears in product-state.md's shipped list,
including `initiatives` and `topics`. The map has `initiatives → []` and `topics → []`
(`wiki-ingest.ts:687-688`), so archiving an initiative drifts product-state.md. Latent
(initiatives/topics not in default `ingest_buckets`), but structurally the same under-map
class as ISSUE-1/2.

### Correct reverse map (authoritative — derived from reading ALL filters in each compiler)

| Bucket | active-sprint | open-gates | product-state | roadmap |
|---|:---:|:---:|:---:|:---:|
| sprints | yes (16) | yes (Gate 3, 41) | yes (36) | yes (25) |
| epics | — | yes (Gate 3, 41) | yes (36) | yes (26) |
| proposals | — | yes (Gate 1, 25) | yes (36) | — |
| stories | — | yes (Gate 2, 34) | yes (36) | — |
| crs | — | yes (Gate 3, 41) | yes (36) | — |
| bugs | — | yes (Gate 3, 41) | yes (36) | — |
| initiatives | — | yes (Gate 3, 41) | yes (shipped, 44) | — |
| topics | — | yes (Gate 3, 41) | yes (shipped, 44) | — |

Every bucket maps to `open-gates` (Gate 3 is universal) and to `product-state` (Gate 3 +
the unfiltered shipped scan). The shipped map omits `open-gates` from six of eight buckets
and omits `product-state` from two.

### Why QA + the red test missed it

Scenario 3 (parity floor) seeds a corpus of "1 sprint, 2 epics, 1 story, 1 bug"
(`test/...parity.red.node.test.ts:637`) where NO item has `status: Ready` with empty
remote_id (Gate 3 untriggered) and NO story has elevated `ambiguity` (Gate 2 untriggered).
So both incremental and full paths produce empty open-gates Gate 2/Gate 3 sections — they
agree by accident of fixture choice, not by correctness. The map's unit assertions
(`:289-335`) assert the UNDER-MAPPED values as expected (e.g. `stories → [product-state]`),
encoding the bug. Scenario 1/1b comments ("open-gates.md must NOT be rewritten on epic/sprint
edit — only proposals affect it", `:515,:557`) are factually wrong about Gate 3.

## Required fix (for re-dispatch)

1. Extend `BUCKET_SYNTHESIS_MAP` so every bucket includes `open-gates` (Gate 3 universal) and
   `product-state` (universal). Concretely: add `open-gates` to epics/stories/crs/bugs/sprints/
   initiatives/topics; add `product-state` to initiatives/topics.
2. Update the derivation comment (`:674-678`) to document Gate 2 (`open-gates.ts:34` stories),
   Gate 3 (`open-gates.ts:41` any-bucket Ready), and the unfiltered shipped scan
   (`product-state.ts:44`).
3. Add a parity-floor fixture that triggers Gate 3 (an epic with `status: Ready`, empty
   `remote_id`) and Gate 2 (a story with `ambiguity: 🔴 …` in a stories-enabled config) and
   asserts incremental == full for open-gates.md. Re-derive the map's unit-test expectations
   from the corrected map.

Note: the partition optimization still holds value post-fix — `active-sprint` and `roadmap`
remain narrowly scoped (sprints/epics only), so most edits still skip 1-2 pages. Only
`open-gates`/`product-state` become near-universal, which is correct: Gate 3 and the shipped
scan genuinely depend on nearly every bucket.

## Other checks (PASS)

- **detectStampOnly fail-safe (check 3): PASS.** `wiki-ingest.ts:715-734` returns false when
  `oldBody === null || oldStatus === null`. `priorPageBody` is initialized to `null` and only
  set non-null inside the successful parse branch (`:298`); the catch leaves it null
  (`:301`). `priorStatus = existingPage?.status ?? null` (`:320`). Uncertainty → recompile.
  Correct fail-safe.
- **Deviation #1 (buildPlanStub `body.trim().slice(0,200)`) (check 4): PASS for parity.**
  Synthesis compilers read ONLY frontmatter fields (`i.fm[...]`, `i.bucket`, `i.rawPath`) —
  never the wiki page body or the plan-stub summary. So the summary-shape change cannot alter
  any synthesis output; the parity floor is independent of it. (QA's DEV1 note that the change
  is "necessary for stamp-only detection" is correct — it widens the body captured into
  `pageBody`, which feeds `detectStampOnly`. Separate concern from synthesis parity.)
- **Deviation #2 (bootstrap write-all-four) (check 5): PASS.** `synthesisPagesNotInitialized`
  (`:756-758`) forces ALL_FOUR only while any of the 4 pages is absent; once all exist the
  steady-state partition path runs (QA Scenario 1/1b mtime assertions confirm). Sound
  correctness fallback that does not defeat the optimization. NOTE: bootstrap masks ISSUE-1/2/3
  during initial population (all four always written), so the under-map only bites in
  steady state — which is exactly the common case and exactly where parity matters.
- **Full-rebuild path (no opts) (correctness floor): PASS.** `opts?.bucket === undefined →
  ALL_FOUR_SYNTHESIS_PAGES` (`:760-762`). `cleargate wiki build` is unaffected and remains the
  byte-exact reference. The bug is ONLY on the incremental partition path.
- **Scope (check 6): PASS.** Diff touches only `src/commands/wiki-ingest.ts` + the red test
  file. No synthesis recipe, PostToolUse hook, or config changed.

## GATE4_NOTES

Wiki CLI requires a `dist` rebuild before this lands in the live loop: the PostToolUse wiki
hook runs the built `cleargate-cli/dist/cli.js`, not source. After the fix merges, run
`npm run build` in `cleargate-cli/` (and `npm run prebuild` to mirror the payload if any
`.claude`/payload surface were touched — it was not here). Per FLASHCARD 043-05, a missing
dist is fail-closed at sprint close (close_sprint WS8(e)), so the rebuild is mandatory, not
optional.

## flashcards_flagged

- 2026-06-01 · #wiki #synthesis #parity · open-gates.ts Gate 3 has NO bucket filter (any item with status==Ready + empty remote_id) and Gate 2 reads `stories`; product-state.ts shippedItems is unfiltered — a bucket→synthesis reverse map MUST cover EVERY compiler filter, not just the first. [SPRINT-33 043-07 postflight]
- 2026-06-01 · #wiki #synthesis #test-design · a byte-parity test only proves parity for the buckets/statuses its fixture exercises — a fixture with no Ready-non-proposal item and no elevated-ambiguity story can't catch open-gates under-mapping; parity fixtures must trigger EACH gate of each multi-filter compiler. [SPRINT-33 043-07 postflight]

---

# RE-VERIFY (post-fix, read-only) — 2026-06-01

role: architect

commit_reviewed: 5360531 (map fix) · 6f49b3b (sealed test) · branch story/STORY-043-07

ARCH-POSTFLIGHT: PASS

## What was re-checked

1. **Independent reverse-map re-derivation from all 4 compilers** (not trusting the prior pass):

   | Compiler | Bucket-bearing filter branches | Buckets that can emit a row |
   |---|---|---|
   | `active-sprint.ts:22-24` | active/completed/planned all gate on `bucket==='sprints'` | **sprints only** |
   | `roadmap.ts:25-40` | sprint partitions (`bucket==='sprints'`) + epic partitions (`bucket==='epics'`) | **sprints, epics only** |
   | `open-gates.ts:25/34/41` | Gate1 `proposals`; Gate2 `stories`; **Gate3 NO bucket filter** (`status==='Ready'` + empty remote_id) | **ANY bucket** (Gate3 universal) |
   | `product-state.ts:44` | totals/active over fixed list; **shippedItems = `state.filter(isShipped)` NO bucket filter** (`rawPath.includes('/archive/')`) | **ANY bucket** (shippedItems universal) |

   Derived correct map: every bucket → `open-gates` + `product-state`; sprints/epics also → `roadmap`; sprints also → `active-sprint`. This matches `wiki-ingest.ts:686-696` byte-for-byte. The prior under-mapping (ISSUE-1 open-gates-Gate3, ISSUE-2 open-gates-Gate2, ISSUE-3 product-state-shipped) is closed.

2. **No FOURTH under-mapped branch exists.** Re-walked every `.filter(` in all four compilers. The only two bucket-unfiltered branches are open-gates Gate3 and product-state shippedItems — both now reflected universally. `roadmap` is NOT bucket-universal in any branch (sprints+epics only — both branches gate on bucket). `active-sprint` is NOT bucket-universal (sprints only). So `roadmap: sprints/epics-only` and `active-sprint: sprints-only` are correct; not under-mapped.

3. **Over-mapping check (parity-safe, perf-neutral).** The `topics` key (`['open-gates','product-state']`) is *dead over-mapping*: `deriveBucket` (`derive-bucket.ts:9-17`) has no `TOPIC-` prefix, so an incremental ingest can never receive `bucket==='topics'` (topic pages are synthesis OUTPUT, not delivery INPUT). Harmless never-hit key. For the live buckets (crs, bugs, initiatives → open-gates) there is NO over-mapping: each can carry `status: Ready` + empty remote_id and hit Gate3, so the mapping is correct, not speculative. Perf goal (−≥75% recompile) is NOT materially weakened: the only buckets that now recompile open-gates/product-state are buckets whose edits genuinely *can* change those pages. The dead `topics` key adds zero runtime cost (never matched).

4. **Tests.** `wiki-ingest-synthesis-parity.red.node.test.ts` → 27/27 GREEN, incl. Scenario 3b (Gate-3 Ready epic), 3c (Gate-2 🔴 story), 3d (archived initiative), and the byte-parity floor Scenario 3. Fixtures are genuine end-to-end: each builds a clean wiki, applies a lifecycle edit, runs a single-file incremental ingest (routes through `BUCKET_SYNTHESIS_MAP[bucket]`, NOT the bootstrap full-rebuild fallback since the wiki already exists), then diffs against a full rebuild.

5. **Regression — full wiki suite** (`test/wiki/*.test.ts`): 316 tests, 314 pass, 2 fail. The failures are the documented pre-existing harness breakages (`build.node.test.ts:158` missing-`type`-field TypeError; `ingest.node.test.ts:513` `require is not defined`; `contradict-cli.node.test.ts:513` Scenario-5 `it is not defined` — surfaces at suite-load so it aggregates as part of the 2-count). None touch `wiki-ingest.ts` or synthesis. Scope (`wiki-ingest.ts` only) is clean — no new regressions.

## ISSUES

none — parity invariant holds; no residual under-mapping; no 4th drift path; over-mapping limited to the dead `topics` key (parity-safe, perf-neutral).

## GATE4_NOTES

**dist rebuild REQUIRED before release.** `cleargate-cli/dist/cli.js` is stale (built Jun 1 12:19, predates STORY-043-07 — contains NO `BUCKET_SYNTHESIS_MAP` symbol at all). Corrected source is Jun 1 14:58. Tests pass because tsx runs source directly, but the published bundle does not yet carry the incremental-synthesis feature or the corrected map. Run `npm run build` in `cleargate-cli/` at Gate 4 so `cleargate wiki ingest` executes the corrected partition map at runtime. This is the only Gate-4 blocker; source + tests are correct.

## flashcards_flagged

Both prior cards remain accurate (no new card needed):
- `#wiki #synthesis #parity` — reverse map must cover EVERY compiler filter, not just the first.
- `#wiki #synthesis #test-design` — parity fixtures must trigger EACH gate of each multi-filter compiler.

New card recorded this pass:
- `#wiki #synthesis #dist` — tsx-run tests stay green on stale dist; a synthesis-map fix is not live until `npm run build` refreshes `dist/cli.js`. Verify dist mtime ≥ source mtime at Gate 4 for any wiki-CLI runtime change.
