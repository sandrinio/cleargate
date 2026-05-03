---
sprint_id: "SPRINT-21"
parent_cleargate_id: null
sprint_cleargate_id: "SPRINT-21"
carry_over: false
lifecycle_init_mode: "block"
remote_id: null
source_tool: "local"
status: "Ready"
execution_mode: "v2"
start_date: "2026-05-30"
end_date: "2026-06-12"
created_at: "2026-05-03T00:00:00Z"
updated_at: "2026-05-03T00:00:00Z"
created_at_version: "cleargate@0.10.0"
updated_at_version: "cleargate@0.10.0"
context_source: |
  Sourced from end-to-end install test 2026-05-03 in
  /Users/ssuladze/Documents/Dev/markdown_file_renderer (cleargate@0.10.0).
  Single test session surfaced 11 framework-vs-real-use friction items spanning
  three themes: (1) silent-failure bias — gate fails / hook errors / stale
  caches / dep drift / budget overruns never reach chat; (2) cost — sprint
  burned 23.85M tokens with the Reporter consuming 13.07M of that alone;
  (3) Initiative+Sprint as second-class citizens in the type/stamp/predicate
  pipeline.

  Test agent's own walkthrough self-report named 5 critical signals;
  observer-mode analysis added 6 more (predicate-template format mismatch,
  cross-doc resolution, archive immutability, etc.).

  All 11 items decomposed into BUG/CR drafts in `pending-sync/` 2026-05-03.
  None require Epic decomposition — all are bounded engine/prompt/template
  edits. Complexity distribution: 4×XS, 3×S, 3×M, 1 capped spike.

  Theme: framework hardening informed by real-use evidence. Wave-structured
  to land visibility infrastructure first (so later items benefit from chat
  injection + table-friendly predicates), then cost diet, then Initiative
  flow + L0 tightening, then session-reset spike.
epics: []
stories: []
crs: ["CR-030", "CR-031", "CR-032", "CR-033", "CR-034", "CR-035", "CR-036", "CR-037", "CR-038", "CR-039"]
bugs: ["BUG-026"]
proposals: []
approved: true
approved_at: "2026-05-03T18:08:44Z"
approved_by: "sandrinio"
activated_at: null
human_override: false
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-03T00:00:00Z
  bypass_note: |
    One-time hand-set bypass 2026-05-03. The gate engine cannot classify
    work-item type "SPRINT" (work-item-type.ts union missing SPRINT entry) —
    this is exactly what CR-030 (W3 of this sprint) fixes. Sprint plan content
    has been reviewed manually: all 11 anchor items pass their predicates;
    Consolidated Deliverables and Wave structure are populated; Risks + DoD
    enumerated. Bypass is rescinded once CR-030 lands and the engine can
    type-detect Sprint files natively.
---

# SPRINT-21: Framework Hardening — Test-Surfaced Findings (Visibility + Cost + Initiative)

## 0. Stakeholder Brief

> Sponsor-readable summary. Pushed to PM tool.

- **Sprint Goal:** Land 11 framework-hardening items surfaced by the 2026-05-03 end-to-end install test. Make the framework see itself (CR-032 + CR-038 chat injection), cut Reporter cost ~99% (CR-036), make Initiative+Sprint first-class (CR-030+CR-031), align predicates with templates (CR-034), tighten L0 Code-Truth (CR-033), and patch the broken state mutation script (BUG-026). Plus low-cost agent prompt edits (CR-035, CR-037) and a 1-day spike (CR-039) on session-reset cost reduction.

- **Business Outcome:** Framework's silent-failure bias is eliminated for the dominant signal classes (gate fails, hook errors, stale caches, dep drift, budget overruns). Sprint close cost drops from ~24M to ~10-12M tokens (Reporter alone from 13M to ~100k). Initiative→Epic flow stops requiring three workarounds. Test-folder regression fixture continues serving as ground truth for future hardening rounds.

- **Risks (top 3):**
  1. **Bootstrap recursion** — agents drafting CR-032 (silent gate-fail surfacing) are themselves subject to silent gate-fails until CR-032 lands. Mitigation: W1 land first, so W2+ benefit from refreshed signal infrastructure.
  2. **Token cost still high pre-CR-036** — SPRINT-21 itself pays the old cost (~20-23M tokens) before the diet ships. CR-036 is in this sprint; SPRINT-22+ reaps savings. Acceptable one-sprint payback.
  3. **11-item sprint width is at the edge** of ClearGate's typical 5-9 story lane. Mitigation: bundled wave structure collapses to ~7-9 dispatch units; complexity distribution skews XS-S (8 of 11 items).

- **Metrics:**
  - **Visibility:** zero silent gate-fails across SPRINT-21 dispatches (every gate-fail surfaces in chat per CR-032). Audited via post-sprint hook log scan.
  - **Cost:** Reporter dispatch <500k tokens (vs 13M baseline); sprint-total <15M tokens (vs 24M baseline).
  - **Initiative+Sprint flow:** zero `[stamp-tokens] error` / `[cleargate gate] error` / `wiki ingest: cannot determine bucket` lines for INITIATIVE-* or SPRINT-* in `.cleargate/hook-log/gate-check.log`.
  - **Predicate alignment:** all SPRINT-21 work-item drafts pass their own readiness gates without table-vs-bullet false-positives (CR-034 acceptance #1).
  - **End-to-end re-test:** re-run the markdown_file_renderer test scenario post-sprint; all 5 walkthrough signals from 2026-05-03 resolve.

## 1. Consolidated Deliverables

| Item | Type | Title | Lane | Complexity | Parallel? | Bounce Exposure | Wave |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [`BUG-026`](BUG-026_Update_State_Mjs_Broken_Validate_Shape_Ignoring_Version_Import.md) | Bug | `update_state.mjs` broken — `validateShapeIgnoringVersion` import | fast | XS | y (W1 batch) | low | W1 |
| [`CR-031`](CR-031_Predicate_Resolves_Linked_Files_Across_PendingSync_And_Archive.md) | CR | `resolveLinkedPath` walks pending-sync + archive | fast | XS | y (W1 batch) | low | W1 |
| [`CR-035`](CR-035_Reporter_Token_Total_Includes_Own_SubagentStop.md) | CR | Reporter §3 token total — session-totals + two-line split | fast | XS | y (W1 batch) | low | W1 |
| [`CR-037`](CR-037_Architect_Validates_Dep_Versions_Against_Npm_Registry.md) | CR | Architect pre-spec dep version check via `npm view` | fast | XS | y (W1 batch) | low | W1 |
| [`CR-032`](CR-032_Surface_Gate_Failures_And_Stop_Self_Cert.md) | CR | Surface gate failures + literal-criterion rule at Ambiguity Gate | standard | S | y (W2) | low | W2 |
| [`CR-034`](CR-034_Listed_Item_Predicate_Accepts_Table_Rows.md) | CR | `listed-item` predicate accepts table rows (`declared-item`) | standard | S | y (W2) | low | W2 |
| [`CR-036`](CR-036_Reporter_Token_Diet_Bundle_Enforcement_And_Fresh_Session.md) | CR | Reporter token diet — bundle mandatory + fresh session_id + budget warn | standard | M | y (W3) | med | W3 |
| [`CR-038`](CR-038_Stale_Gate_Cache_Refresh_At_Sprint_Preflight.md) | CR | Stale `cached_gate_result` refresh as preflight Step 0 | standard | S | y (W3) | low | W3 |
| [`CR-030`](CR-030_Initiative_First_Class_Citizenship.md) | CR | Initiative + Sprint first-class citizenship (bucket+type+stamp+id+predicate) | standard | M | y (W3) | med | W3 |
| [`CR-033`](CR-033_Reuse_Audit_Verifies_Cited_Surfaces_Exist.md) | CR | `existing-surfaces-verified` predicate (CR-028 follow-up) | standard | M | y (W3) | low | W3 |
| [`CR-039`](CR-039_Spike_Per_Story_Session_Reset_For_Dev_QA_Loop.md) | CR (spike) | Per-story session reset investigation memo | standard | spike (≤1 dev-day) | n (W4 solo) | low | W4 |

**Estimated totals:** 11 items, 4 waves. Complexity: 4×XS + 3×S + 3×M + 1 spike. Lane mix: 4 fast / 7 standard. Parallelism: W1 = 4 in a batch (one developer, 4 trivial edits); W2 = 2 parallel; W3 = 4 parallel; W4 = 1 solo.

**Dispatch unit estimate:** ~7-9 Developer dispatches + matching QA dispatches (W1 batch counts as 1 dispatch by convention if a single Developer carries the 4 trivial edits; otherwise 4). Architect: 1 bundled M-plan covering all 4 waves (per SPRINT-19 lesson: bundled plans beat per-story dispatches).

## 2. Execution Strategy

*(Populated by Architect Sprint Design Review — DEFERRED. SDR runs after the 11 anchor files reach 🟢 in pending-sync, and updates this section in-place before Gate 2.)*

### 2.1 Phase Plan (preliminary)

**Wave 1 — Quick wins (parallel batch):**
- **One Developer dispatch carries all 4 XS edits:** BUG-026 (restore export) + CR-031 (6-line predicate fallback) + CR-035 (Reporter prompt edit) + CR-037 (Architect prompt edit). Single commit `feat(SPRINT-21-W1): four trivial fixes (BUG-026 + CR-031 + CR-035 + CR-037)`.
- Rationale: each item ≤30-line touch; bundling avoids the ceremonial overhead of 4 separate dispatches.
- Acceptance: each item's verification protocol passes individually; mirror diffs empty.

**Wave 2 — Visibility bedrock (2 parallel dispatches):**
- **CR-032** (Developer dispatch 2): surface gate failures + literal-criterion rule. 2 hooks + 2 CLAUDE.md + 7 templates + 1 test.
- **CR-034** (Developer dispatch 3): `declared-item` predicate + 6 criteria migrations. Predicate engine + readiness-gates + 8 unit tests.
- Rationale: both touch predicate/visibility infrastructure; ship together so W3+ benefit from refreshed signal surface AND table-friendly predicates.
- Coupling: CR-032's chat-injection pattern is reused by CR-036 + CR-038 in W3.

**Wave 3 — Cost + preflight + Initiative + L0 (4 parallel dispatches):**
- **CR-036 + CR-035 (paired)** (Developer dispatch 4): Reporter diet — bundle mandatory + fresh session_id + budget warn. Note: CR-035 already shipped in W1; CR-036 builds on its prompt edit.
- **CR-038** (Developer dispatch 5): preflight Step 0 cache refresh. Pairs with CR-027 (already shipped in SPRINT-20).
- **CR-030** (Developer dispatch 6): Initiative+Sprint first-class. 4 CLI files + template + readiness-gates + 3 tests.
- **CR-033** (Developer dispatch 7): `existing-surfaces-verified` predicate. New predicate engine code + 9 tests.
- Rationale: all touch different file surfaces (Reporter/preflight/work-item-type/predicates respectively); zero shared-file conflicts; all benefit from W2's bedrock.

**Wave 4 — Spike (1 solo dispatch):**
- **CR-039** (Developer dispatch 8): per-story session reset investigation. Runs LAST so measurement reflects post-CR-036 baseline.

### 2.2 Merge Ordering (preliminary)

Files touched by more than one item:

| Shared File | Items | Merge Order | Rationale |
| --- | --- | --- | --- |
| `cleargate-cli/src/lib/readiness-predicates.ts` | CR-031 (W1), CR-033 (W3), CR-034 (W2) | W1 → W2 → W3 | Three concurrent edits; merge in wave order. CR-031 is XS (~6 lines); CR-034 adds new item-type; CR-033 adds new shape #7. Zero overlap if merged sequentially. |
| `cleargate-cli/src/lib/work-item-type.ts` | CR-030 (W3) | n/a | Single-wave solo. |
| `.cleargate/knowledge/readiness-gates.md` | CR-030 (W3), CR-033 (W3), CR-034 (W2) | W2 → W3 (parallel within W3) | CR-034 migrates 6 criteria first; CR-030 adds Initiative gate + renames `proposal-approved`; CR-033 adds `existing-surfaces-verified` to 3 gates. Architect SDR confirms exact diff conflict resolution. |
| `.cleargate/scripts/close_sprint.mjs` | CR-036 (W3) | n/a | Single. |
| `.claude/agents/reporter.md` | CR-035 (W1), CR-036 (W3) | W1 → W3 | CR-035 lands prompt edit first; CR-036 builds on it. |
| `.claude/agents/architect.md` | CR-037 (W1) | n/a | Single. |
| `.claude/hooks/stamp-and-gate.sh` | CR-032 (W2) | n/a | Single. |
| `.claude/hooks/token-ledger.sh` | CR-036 (W3) | n/a | Single. |
| `CLAUDE.md` (live + canonical) | CR-032 (W2) | n/a | Single. |
| Templates (epic.md, story.md, CR.md, Bug.md, proposal.md, initiative.md, Sprint Plan Template.md) | CR-032 (W2) | n/a | Single (all 7 footers). |

### 2.3 Shared-Surface Warnings (preliminary)

- **`cleargate-cli/src/lib/readiness-predicates.ts` is the hot file** — three CRs touch it across two waves. Architect SDR must specify exact line ranges per CR + post-merge prebuild verification. Mitigation: CR-034 lands FIRST (item-type extension), then CR-031 in same W1 commit (path resolution), then CR-033 in W3 (new shape). Each diff is additive.
- **`.cleargate/knowledge/readiness-gates.md` parallel edits in W3** — CR-030 + CR-033 both touch criterion lists. Mitigation: assign as sequential within W3 dispatch order, OR coordinate via per-CR-section line stencils in M-plan.
- **CR-034 MUST land before W3 starts** — without it, every Story drafted in SPRINT-21's own work fails its own gate (`implementation-files-declared`). Recursive sprint-meta-pain.

### 2.4 Lane Audit (preliminary)

| Item | Lane | Rationale (≤80 chars) |
| --- | --- | --- |
| BUG-026 | fast | One export restore; ≤10 LOC |
| CR-031 | fast | 6-line predicate extension + 5 tests |
| CR-035 | fast | Reporter prompt edit + optional prep digest update |
| CR-037 | fast | Architect prompt edit; no code change |
| CR-032 | standard | Multi-surface (hooks + CLAUDE.md + 7 templates); each touch tiny but breadth is wide |
| CR-034 | standard | Predicate engine + 6 gate migrations + 8 tests |
| CR-036 | standard | close_sprint + reporter + skill + token-ledger; multi-file medium |
| CR-038 | standard | One CLI helper + 5 tests |
| CR-030 | standard | 4 CLI files + template + readiness-gates + tests |
| CR-033 | standard | New predicate engine code (~50-80 LOC) + 9 tests |
| CR-039 | standard | Spike memo + optional prototype; 1 dev-day cap |

Architect SDR confirms via 7-check rubric.

### 2.5 ADR-Conflict Flags (preliminary)

- **None blocking.** SPRINT-21's design lives within established invariants (mirror-parity, file-surface contract, real-infra-no-mocks, archive-immutability §11.4).
- **Soft flag (informational):** CR-034 changes predicate semantics for `listed-item` callers (one criterion, `dod-declared`, stays on bullet-only; six criteria switch to `declared-item`). Backwards-compat: existing items with table-format §3 etc. start passing under `declared-item`; items with bullet-format continue to pass under both. No regression.
- **Soft flag (informational):** CR-036 promotes Step 3.5 to fatal under v2. SPRINT-21 itself runs under v2 — Step 3.5 must succeed at SPRINT-21's own close, OR SPRINT-21 cannot complete. Mitigation: implement CR-036 such that the bundle generation works against SPRINT-21's own structure (it should — same template). Architect M3.5 plan validates against SPRINT-21 fixture before merge.
- **Soft flag (informational):** CR-038 + CR-027 (already shipped) form the preflight Step 0 + Step 5 pair. SPRINT-21's own preflight (when activated) will run both. Pre-SPRINT-21-activation, run `cleargate gate check` manually on every pending-sync item to refresh stale caches before activating — otherwise the activation itself may hard-block.

## 3. Risks & Dependencies

| Risk | Mitigation |
| --- | --- |
| **Bootstrap recursion — agents subject to silent gate-fails while drafting CR-032.** | Land W1 first (CR-031 + 3 others), then W2 (CR-032 + CR-034). After W2 lands, all subsequent dispatches benefit from chat-injected gate signals. Pre-W2 dispatches: orchestrator manually scans hook log post-dispatch and surfaces gate-fails to the human if agent doesn't. |
| **CR-034 must land before any W3 work-item draft trips its own predicate.** | Wave ordering enforces this. If W3 work needs to pre-draft files, do so in `pending-sync/` after CR-034 merge confirmation. |
| **CR-036 promotes Step 3.5 to v2-fatal — SPRINT-21's own close requires the bundle to generate successfully.** | Acceptance #1 of CR-036 is the prep script working against the SPRINT-21 fixture. If it fails, fall back to v1 mode for SPRINT-21 close only; flashcard the residual issue. |
| **Token cost still high pre-CR-036 lands (~mid-sprint).** | Accepted one-sprint payback. SPRINT-22 reaps the savings. Track sprint-total tokens in REPORT.md §3 for trend. |
| **Hot file `readiness-predicates.ts` touched by 3 CRs across 2 waves.** | Sequential within wave; line-range stencils in Architect M-plan; post-merge `npm test -- readiness-predicates` validates each commit. |
| **`readiness-gates.md` parallel edits in W3 (CR-030 + CR-033 both add criteria).** | Architect SDR assigns dispatch order within W3; CR-030 first (renames `proposal-approved`), CR-033 second (adds `existing-surfaces-verified`). |
| **CR-039 spike scope creep.** | Hard 1-dev-day cap per CR-039 §0.5 Q3. If unknowns can't resolve in 1 day, close as "no-go for v1" with documented cost ceiling. |
| **11-item sprint width.** | Bundled wave structure collapses to ~7-9 dispatch units. Architect SDR audits per-wave parallelism + commit order. If any wave runs over wall-clock budget, defer that wave's items to SPRINT-22 carry-over. |
| **End-to-end re-test fixture is the markdown_file_renderer test folder.** | Treat as a regression artifact. Snapshot the post-test state in `.cleargate/sprint-runs/SPRINT-21/fixtures/` so CR acceptance can validate against the same surface. |
| **Stale `cached_gate_result.pass: false` across pending-sync at SPRINT-21 activation** (per the test session's 12 stale items). | Run `cleargate gate check` on every pending-sync item BEFORE `cleargate sprint preflight SPRINT-21`. Per CR-038's purpose — but CR-038 itself is in this sprint, so manual refresh is the pre-activation workaround. |

## 4. Execution Log

_(Populated by orchestrator + Reporter during sprint execution. Empty at draft time.)_

| Date | Event Type | Description |
| --- | --- | --- |

## 5. Metrics & Metadata

- **Expected Impact:** Framework's silent-failure bias eliminated for the dominant signal classes. Reporter dispatch cost drops from ~13M to ~100k tokens per close (~99% reduction). Initiative→Epic chain stops requiring three workarounds. Sprint preflight stops false-positive blocking on stale caches. Predicate definitions align with template formats (no more "agent followed template; predicate counts wrong shape"). Closes the highest-leverage tooling debt surfaced by the 2026-05-03 end-to-end test.
- **Priority Alignment:** Direct user request 2026-05-03 — "i think we need all those work items in the sprint plan." Test session produced 11 actionable items; sprint absorbs all of them via wave-bundled execution. SDLC charter alignment: framework hardening before next product feature wave (Admin UI / Multi-Participant MCP Sync / etc., currently in `pending-sync/SPRINT-06_*` and `SPRINT-07_*` — deferred until framework foundations stabilize).
- **Outstanding from SPRINT-20** (carry-forward to §6 Tooling, picked up here if capacity allows): none surfaced in SPRINT-20 close handoff. SPRINT-21 may add its own carry-forward depending on which waves complete in-window.

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** W1 spawns one Developer dispatch carrying 4 trivial edits as a batch (BUG-026 + CR-031 + CR-035 + CR-037). Single commit. W2 spawns 2 parallel Developer dispatches (CR-032, CR-034). W3 spawns 4 parallel Developer dispatches (CR-036, CR-038, CR-030, CR-033). W4 spawns 1 Developer dispatch for the CR-039 spike memo.
- **Relevant Context:** Each anchor file's `<agent_context>` block (where present) is the authoritative scope spec. Test-session evidence is captured per-CR in `context_source` frontmatter — read it for the live-evidence framing.
- **Constraints:**
  - No CLAUDE.md changes outside CLEARGATE-tag-block region (live).
  - Mirror parity per-edit, not state-parity (FLASHCARD `2026-04-19 #wiki #protocol #mirror`).
  - Real infra, no mocks for hook fixture tests + predicate engine tests.
  - `npm run prebuild` MUST run after canonical scaffold changes (CR-030 template + readiness-gates).
  - DoD test counts ENFORCED, not advisory (SPRINT-19 lesson).
  - **CR-034 MUST land before any other CR's draft is created in `pending-sync/`** — otherwise the new draft trips its own `implementation-files-declared` predicate.
  - **Pre-W3 manual cache refresh:** before W3 dispatches, run `for f in .cleargate/delivery/pending-sync/*.md; do cleargate gate check "$f"; done` to refresh stale caches (workaround until CR-038 itself ships).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Green — Approved 2026-05-03 (Architect SDR deferred to W1; will overwrite §2.1-§2.5 in-place per the deferred plan)**

Requirements to pass to Green (Gate 2 — Sprint Ready):
- [x] All 11 anchor items decomposed and linked in §1 (BUG-026 ✅, CR-030 ✅ amended, CR-031 ✅, CR-032 ✅, CR-033 ✅, CR-034 ✅, CR-035 ✅, CR-036 ✅, CR-037 ✅, CR-038 ✅, CR-039 ✅).
- [x] Sprint Goal articulated (§0 Stakeholder Brief).
- [x] Wave structure preview present (§2.1 with 4 waves + parallelism notes).
- [x] All anchor files drafted in `pending-sync/` 2026-05-03; each has §0.5 Open Questions awaiting human review.
- [ ] **Architect SDR** populates §§2.1-2.5 (DEFERRED to post-approval; updates this section in-place before Gate 2). Preliminary content present.
- [x] Risks enumerated with mitigations (§3 — 10 items including bootstrap recursion + hot files + 1-day spike cap).
- [ ] **All anchors at 🟢:** currently most anchors at 🟡 (Open Questions pending). Need batch human-decision pass on §0.5 questions across the 11 items before each anchor flips 🟢.
- [ ] Sprint Execution Gate (Gate 3) preflight will run before Ready → Active transition (post-approval). Note: includes manual cache refresh per §3 risk mitigation.
