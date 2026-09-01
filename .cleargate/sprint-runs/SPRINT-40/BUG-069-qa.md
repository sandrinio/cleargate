role: qa

STORY: BUG-069
QA: PASS
TYPECHECK: skip (sprint_context.md §Test Stack — no typecheck this sprint; not run, not reported as gap)
TESTS: 17 passed, 0 failed (bug069_ledger_fallback.red.sh, own suite); 10 passed, 0 failed (bug068_dispatch_tool_name.red.sh, regression boundary); plus 1 ad-hoc adversarial fixture (tuple-match, see below) — pass
ACCEPTANCE_COVERAGE: 5 of 5 red-test scenarios (BUG-069 §5 + M1.md §4.5 + §8.2) map to passing assertions; the bug file's own two Verification Protocol tests are subsumed by Sc1/Sc2/Sc3
MISSING: none
REGRESSIONS: none

## Adversarial review findings

**1. Self-flagged deviation (BANNER_SKIP_RE comment re-scope, ~line 68-73) — ADJUDICATED: legitimate, not overreach.**
M1.md §4.3's "Also required" bullet list states verbatim: *"Keep BANNER_SKIP_RE at :62 ... Its comment at :59-61 should be re-scoped to name the tuple-match as its only remaining consumer."* This is an explicit, named instruction inside §4.3 itself — not an inference from "the plan wins on conflict," and not something §8's amendment touches (§8.1-8.4 are silent on this line). The Developer's own dispatch-level partition (302-461 + header prose at 26-28/41-52) didn't literally list this line, but M1.md §4.3 does, in so many words. Verified the actual edit is exactly the 2-line comment re-scope M1.md specifies — nothing broader. Correctly marked `orchestrator_confirmed: false` since it wasn't in the dispatch's literal list, but the edit itself is not scope creep. No bounce.

**2. Refuse vs. relabel — CONFIRMED: refuses, does not relabel.** Read the full post-edit file (558 lines) end to end and grepped for every remaining transcript-read / role-grep site:
- The only surviving transcript read outside the deleted region is the pre-existing BUG-029 tuple-match (`:159-186`), which uses `TRANSCRIPT_WORK_ITEM` only to *disambiguate between real dispatch-marker files already written by the PreToolUse hook* — it never invents an `agent_type` or `work_item_id` independent of a marker. Confirmed by an adversarial fixture (below).
- No `for role in architect developer qa ...` grep, no `work_item_plausible()`, no `PRIOR_LEDGER_*`, no `DISPATCH_MARKER_WORK_ITEM` scrape, no `STORY_ID_LEGACY` — all zero hits post-edit.
- `AGENT_TYPE`/`WORK_ITEM_ID` are seeded only from `SENTINEL_AGENT_TYPE`/`SENTINEL_WORK_ITEM_ID`, which are populated only from the dispatch-marker JSON or the pending-task sentinel JSON — both dispatch-time ground truth, never inferred post-hoc.

**3. Guard independence — CONFIRMED.** Two separate `if` blocks (`:335` `agent_type`, `:341` `work_item_id`), not a collapsed predicate. `agent_type` refuses on `-z "${AGENT_TYPE}"` **or** `"${AGENT_TYPE}" == "unknown"`; `work_item_id` refuses on `-z` alone. Red-test Sc5 exercises exactly this asymmetry (sentinel `agent_type:"unknown"` + populated `work_item_id` → row ships `agent_type:"unattributed"` while `work_item_id` keeps the sentinel's real value) and passes.

**4. Marker-present path (Sc4 / BUG-029 tuple-match) — INDEPENDENTLY VERIFIED, not just trusted to Sc4.** Sc4 only exercises the single-marker/newest-file-lookup branch (no second dispatch file, empty first-user-message transcript). I built a second, adversarial fixture: two `.dispatch-*.json` files with distinct `work_item_id`s (`STORY-988-01`/`STORY-988-02`) plus a SubagentStop transcript whose first user message names the second id. Result: the hook correctly tuple-matched and consumed only `.dispatch-...-bbbb.json` (`STORY-988-02`/`qa`), left `.dispatch-...-aaaa.json` untouched on disk for its own later consumer, and logged `dispatch-marker tuple-match: transcript_work_item=STORY-988-02 → .../.dispatch-1000-222-bbbb.json`. The −181-line deletion did not touch this path.

**5. `reporter.md` prose — CONFIRMED accurate to code.** The §2 "Attribution refusal check" bullet and the Guardrails bullet match M1.md §4.4's verbatim intent and correctly describe the code's actual output domain (`agent_type: "unattributed"`, single-value census check). No behavior described that the hook doesn't have.

**Task Breakdown:** 5/6 rows checked; row 5 (re-sync) correctly left unticked with the M1.md §0 item 4 supersession reason — advisory only, not a bounce criterion.

VERDICT: Ship it. The refusal is real, not a relabel — verified by direct code reading, a fresh adversarial tuple-match fixture, and the standing red-test suite (17/17 own + 10/10 shared regression boundary). Guards refuse independently exactly as designed. The one self-flagged deviation is a literal M1.md §4.3 requirement, correctly implemented and correctly scoped. reporter.md prose matches actual hook behavior. No regressions, no missing coverage, no fabrication path found by any of the five requested probes.

flashcards_flagged: []
