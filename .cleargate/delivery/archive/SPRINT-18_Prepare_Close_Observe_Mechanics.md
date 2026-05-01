---
sprint_id: "SPRINT-18"
parent_cleargate_id: null
sprint_cleargate_id: "SPRINT-18"
carry_over: false
lifecycle_init_mode: "block"
remote_id: null
source_tool: "local"
status: "Approved"
execution_mode: "v2"
start_date: "2026-05-02"
end_date: "2026-05-15"
created_at: "2026-05-01T20:45:00Z"
updated_at: "2026-05-01T20:45:00Z"
created_at_version: "cleargate@0.10.0"
updated_at_version: "cleargate@0.10.0"
context_source: "Brainstorm charter at .cleargate/scratch/SDLC_brainstorm.md §2.4 — three-sprint sequential roadmap (revised 2026-05-01). SPRINT-18 maps to ordinal 'Sprint 2 — Prepare/Close/Observe mechanics' of the SDLC redesign. Anchor scope: EPIC-025 (Prepare/Close/Observe-Phase Mechanics — 6 child stories decomposed from CR-021) + CR-023 (SPRINT-17 cleanup, fast-lane). Sequential dependency to SPRINT-19 (CR-022 Gate 4 close pipeline hardening, undrafted): CR-021 + CR-022 both touch close_sprint.mjs in different sections, requiring sequential merge."
epics: ["EPIC-025"]
crs: ["CR-023"]
bugs: []
proposals: []
approved: true
approved_at: "2026-05-01T21:00:00Z"
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
  pass: null
  failing_criteria: []
  last_gate_check: null
---

# SPRINT-18: Sprint 2 — Prepare / Close / Observe Mechanics

## 0. Stakeholder Brief

> Sponsor-readable summary. Pushed to PM tool.

- **Sprint Goal:** Land the Prepare-phase, Close-phase, and Observe-phase mechanics specified in CR-021. Sprint Plan template becomes actively-authored; Reporter pulls a curated context bundle (~30-50KB instead of ~200KB); a `cleargate sprint preflight` subcommand enforces Gate 3 (Sprint Execution) environment health; the close pipeline auto-pushes per-artifact status to MCP; UR:bug + UR:review-feedback Observe findings roll up into the sprint report under a new §4.
- **Business Outcome:** Sprint planning becomes dual-audience (sponsor brief + AI-execution detail); sprint close becomes more deterministic (curated Reporter context + auto-sync to PM tool); environment health is enforced before sprint execution starts; Observe-phase findings stop disappearing.
- **Risks (top 3):** (i) `close_sprint.mjs` is touched by both EPIC-025 (this sprint) and CR-022 (next sprint) — sequential merge required; (ii) Token-ledger SubagentStop attribution Red carried forward, not fixed; (iii) Pre-existing test failures in admin/ + mcp/ workspaces stay out-of-scope.
- **Metrics:** EPIC-025's success criteria map directly: bundle ≤80KB; preflight 0/1/2 exit codes correct on all four failure modes; `SPRINT-18_REPORT.md` written under new naming; mirror parity for all 8 file pairs.

## 1. Consolidated Deliverables

| Item | Type | Title | Lane | Complexity | Parallel? | Bounce Exposure | Milestone |
|---|---|---|---|---|---|---|---|
| `STORY-025-01` | Story | Reporter context-bundle scripts (`prep_reporter_context.mjs` + `count_tokens.mjs`) | standard | L2 | y (Wave 1) | low | M1 |
| `STORY-025-02` | Story | `cleargate sprint preflight` subcommand + 5 fixture-driven tests | standard | L2 | y (Wave 1) | low | M2 |
| `STORY-025-04` | Story | Sprint Plan + Sprint Report template reframe (§4 Observe + skip-pattern + renumber) | standard | L2 | y (Wave 1) | low | M4 |
| [`CR-023`](CR-023_SPRINT_17_Cleanup_Stale_Citations_And_Test_Hygiene.md) | CR | SPRINT-17 cleanup — stale citations + mirror drift + test hygiene | fast | L2 | y (Wave 1) | low | M0 |
| `STORY-025-03` | Story | `close_sprint.mjs` Step 3.5 + Step 7 + REPORT naming | standard | L2 | n (Wave 2) | med | M3 |
| `STORY-025-05` | Story | Reporter agent capability surface + Post-Output Brief | fast | L1 | n (Wave 2) | low | M5 |
| `STORY-025-06` | Story | CLAUDE.md sprint-preflight bullet + `cleargate-enforcement.md` §13 | standard | L1 | n (Wave 2) | low | M6 |

**Estimated totals:** 6 stories + 1 CR = **7 items**. Complexity: 2×L1 + 5×L2. Lane mix: 2 fast / 5 standard.

**Wave structure (3 waves; Architect SDR confirmed in §2):**

- **Wave 1 — 4 parallel anchors over disjoint surfaces:** CR-023 ‖ STORY-025-01 ‖ STORY-025-02 ‖ STORY-025-04.
  - CR-023 → templates §-citations + CLAUDE.md mirror reconcile + protocol-section tests + vitest config (`pool: 'forks'`)
  - STORY-025-01 → new `.cleargate/scripts/prep_reporter_context.mjs` + `count_tokens.mjs`
  - STORY-025-02 → new `cleargate sprint preflight` CLI subcommand + tests
  - STORY-025-04 → templates `Sprint Plan Template.md` + `sprint_report.md` reframe (+ canonical mirrors)
- **Wave 2 — 2 parallel anchors, both depend on Wave 1:** STORY-025-03 ‖ STORY-025-06.
  - STORY-025-03 (depends on STORY-025-01) → `close_sprint.mjs` Step 3.5 + Step 7 + REPORT naming
  - STORY-025-06 (depends on STORY-025-02) → CLAUDE.md sprint-preflight bullet + `cleargate-enforcement.md` §13
  - 03 and 06 touch fully disjoint surfaces (`close_sprint.mjs` + `prefill_report.mjs` vs. `CLAUDE.md` + `cleargate-enforcement.md`); independent Wave-1 dependencies (-01 vs. -02). Run concurrently.
- **Wave 3 — 1 anchor, depends on Wave 2:** STORY-025-05.
  - STORY-025-05 (depends on STORY-025-04 for the template's output-path reference + STORY-025-03 for the actual filename) → Reporter agent definition: Capability Surface + Post-Output Brief.

**Concurrency profile:** 4 + 2 + 1 = 7 anchors across 3 dispatch rounds.

**Note on CR-023 + STORY-025-04 coordination.** Both touch `Sprint Plan Template.md` + `sprint_report.md` in disjoint regions (CR-023 = body-prose §-citations; STORY-025-04 = `<instructions>` block + structural reframe). Wave 1 parallelism still holds — Architect §2.2 documents the merge order (CR-023 → STORY-025-04) so the post-Wave-1 template baseline is clean.

## 2. Execution Strategy

*(Populated by Architect Sprint Design Review 2026-05-01.)*

### 2.1 Phase Plan

Confirmed: **3 waves, 4 + 2 + 1 = 7 anchors across 3 dispatch rounds.** Wave 1 spawns 4 Developer agents in parallel over disjoint surfaces; Wave 2 spawns 2 Developer agents in parallel over disjoint surfaces (each gated on a different Wave-1 anchor); Wave 3 spawns 1 Developer agent that depends on outputs from both Wave 1 and Wave 2.

- **Wave 1 — 4 parallel anchors over disjoint surfaces:** `CR-023` ‖ `STORY-025-01` ‖ `STORY-025-02` ‖ `STORY-025-04`.
  - **CR-023** edits four surfaces: (i) `.cleargate/templates/{Sprint Plan Template,sprint_report,story}.md` + canonical mirrors — body-prose citation rewrites only (`§24` / `§20` → `cleargate-enforcement.md §9` / §6); concrete hits today: `Sprint Plan Template.md:10`, `story.md:32`, `story.md:148`, `sprint_report.md:199` (verified via `grep -n` 2026-05-01); (ii) `CLAUDE.md` live — add 4 canonical-only bullets to bring live byte-identical with canonical (current `diff` shows live = 35 lines of CLEARGATE-block content, canonical = 39 lines; the canonical-only bullets sit at canonical lines 22 (Halt-at-gates extension), 48 (State-aware surface), 56 (Cross-project orchestration) and one tier-4 read-order extension); (iii) `cleargate-cli/test/scripts/protocol-section-{12,13,14,24}.test.ts` — archive or renumber per CR-023 §0.5 triage; (iv) `vitest.config.ts` + `cleargate-cli/vitest.config.ts` — add `pool: 'forks'`. None of these regions overlap with M1/M2/M4 edits.
  - **STORY-025-01** creates two net-new scripts under `.cleargate/scripts/` (`prep_reporter_context.mjs`, `count_tokens.mjs`) plus an optional shared helper at `.cleargate/scripts/lib/ledger-digest.mjs` and two test fixtures under `.cleargate/scripts/test/`. Zero edits to pre-existing files.
  - **STORY-025-02** creates a new sub-handler in `cleargate-cli/src/commands/sprint.ts` (or carve-out `sprint-preflight.ts`), wires it in `cleargate-cli/src/cli.ts`, and creates a new test file `cleargate-cli/test/commands/sprint-preflight.test.ts`. The wire-up touches a single line in `cli.ts` (the router switch); the handler insertion in `sprint.ts` appends a new exported function — no overlap with any other anchor.
  - **STORY-025-04** edits four template files: `.cleargate/templates/Sprint Plan Template.md`, `.cleargate/templates/sprint_report.md`, and the two canonical mirrors under `cleargate-planning/.cleargate/templates/`. The edits target the `<instructions>` block (lines 1–15 of `Sprint Plan Template.md` today) and the body skeleton (insert `## 0. Stakeholder Brief` above current `## 1. Consolidated Deliverables` at line 52, insert `## 4. Observe Phase Findings` between current `## §3 Execution Metrics` (line 64 of `sprint_report.md`) and current `## §4 Lessons` (line 106), and renumber §4→§5 / §5→§6 / §6 Change Log → §7 Change Log per pinned decision 2026-05-01).
- **Wave 2 — 2 parallel anchors, both gated on Wave 1:** `STORY-025-03` ‖ `STORY-025-06`.
  - **`STORY-025-03` after STORY-025-01 + CR-023.** 025-03's Step 3.5 invokes `node .cleargate/scripts/prep_reporter_context.mjs <sprint-id>` via `invokeScript`; the script must exist before Step 3.5 can be exercised by the test fixture in `test_close_pipeline.sh`. 025-03 also benefits from CR-023's vitest pool fix (Wave 1 (iv)) — the close-sprint test scenarios that fail in full-suite runs (`test_close_sprint_v21.test.ts` Scenarios 2/3/6 + `close-sprint-reconcile.test.ts` Scenario 1) need `pool: 'forks'` to verify "no regression" cleanly. 025-03 modifies `.cleargate/scripts/close_sprint.mjs` (today: 8 hits at lines 17, 19, 68, 206, 209, 322, 323, 327 referencing `REPORT.md`) and `.cleargate/scripts/prefill_report.mjs` (output-path naming), plus two test fixtures `.cleargate/scripts/test/test_close_pipeline.sh` and `test_report_body_stdin.sh`.
  - **`STORY-025-06` after STORY-025-02 + CR-023.** 025-06 updates the live + canonical "Sprint Execution Gate" bullet (live `CLAUDE.md:123`, canonical `cleargate-planning/CLAUDE.md:32`) to drop the "(CR-021)" parenthetical and reference the now-extant subcommand, and appends §13 to `.cleargate/knowledge/cleargate-enforcement.md` + canonical mirror (current max section is §12, verified 2026-05-01 via `grep -nE "^## [0-9]+" cleargate-enforcement.md` — last hit `## 12. Gate 3.5 — Sprint Close Acknowledgement (CR-019)` at line 456; §13 is the next free number per FLASHCARD `2026-04-21 #protocol #section-numbering`). 025-06 also depends on CR-023's CLAUDE.md mirror reconcile so the Sprint-Execution-Gate bullet sits in a mirror-parity baseline (live CLAUDE.md grows from 35 to 39 CLEARGATE-block lines after CR-023; 025-06's `old_string` for the bullet replacement MUST be re-grepped at the start of M6 execution).
  - **025-03 ‖ 025-06 disjointness:** -03 touches `.cleargate/scripts/close_sprint.mjs` + `prefill_report.mjs` + `test/*.sh`; -06 touches `CLAUDE.md` + `cleargate-enforcement.md`. Zero file overlap. Wave-1 dependencies are also independent (-03 → -01; -06 → -02). They run concurrently.
- **Wave 3 — 1 anchor, depends on Wave 1 (-04) + Wave 2 (-03):** `STORY-025-05`.
  - **STORY-025-05 after STORY-025-04 + STORY-025-03.** 025-05 inserts the Capability Surface table + Post-Output Brief into `.claude/agents/reporter.md` and the canonical mirror. The Output row cites `SPRINT-<#>_REPORT.md` — 025-04 lands the template reference and 025-03 lands the actual filename; 025-05 carries the agent-prompt reference into the new convention. Disjoint from CR-023's `protocol-section-*.test.ts` triage and from M1/M2/M3/M6 surfaces. 025-05 cannot start in Wave 2 because the new naming convention must be established by both -04 (template) AND -03 (script + test) before the agent definition references it; otherwise 025-05 cites tooling that doesn't yet ship.

**Wave-to-milestone map.** M0 = CR-023; M1 = STORY-025-01; M2 = STORY-025-02; M3 = STORY-025-03; M4 = STORY-025-04; M5 = STORY-025-05; M6 = STORY-025-06. Architect produces one milestone plan per anchor under `.cleargate/sprint-runs/SPRINT-18/plans/M{0..6}.md` before each Developer dispatch.

### 2.2 Merge Ordering (Shared-File Surface Analysis)

Files touched by more than one anchor item:

| Shared File | Stories Touching It | Merge Order | Rationale |
|---|---|---|---|
| `.cleargate/templates/Sprint Plan Template.md` (+ canonical mirror) | CR-023, STORY-025-04 | CR-023 → STORY-025-04 | CR-023 rewrites a single body-prose §-citation at line 10 (`protocol §24` → `cleargate-enforcement.md §9`). STORY-025-04 replaces the entire `<instructions>` block (lines 1–15 today) and inserts `## 0. Stakeholder Brief` above current `## 1. Consolidated Deliverables` (line 52). The two edit regions are disjoint (line 10 prose vs. lines 1–15 + line 52 body insertion), but the file mutex makes serial merging the safe play. CR-023 first leaves STORY-025-04 building atop a clean §-citation baseline so the Wave-2-only mirror-parity test does not re-fire on a stale `§24`. |
| `.cleargate/templates/sprint_report.md` (+ canonical mirror) | CR-023, STORY-025-04 | CR-023 → STORY-025-04 | CR-023 rewrites `## §6 Change Log` (line 199) — actually a `§N` heading-style citation, not a body prose hit, so the rewrite scope here is the template's own section heading convention (no semantic move). STORY-025-04 updates `<instructions>` `output_location` to `SPRINT-<#>_REPORT.md`, inserts §4 Observe Phase Findings between current §3 (line 64) and current §4 Lessons (line 106), and renumbers `## §4 Lessons` → `## §5 Lessons` (line 106) and `## §5 Framework Self-Assessment` → `## §6` (line 135) etc. CR-023 first because the §6 Change Log heading rewrite must land before STORY-025-04 renumbers around it; otherwise STORY-025-04's renumber pass would either skip the stale citation or compound a second rewrite onto it. |
| `.cleargate/templates/story.md` (+ canonical mirror) | CR-023 only | n/a | CR-023 rewrites lines 32 + 148 (`§24` → `cleargate-enforcement.md §9`, `§20` → `cleargate-enforcement.md §6`). STORY-025-04 explicitly scopes its edits to `Sprint Plan Template.md` + `sprint_report.md` (per story §1.2 R1–R7); `story.md` is not in its surface list. No collision. |
| `CLAUDE.md` (live) + `cleargate-planning/CLAUDE.md` (canonical) | CR-023, STORY-025-06 | CR-023 → STORY-025-06 | CR-023 reconciles pre-existing live↔canonical drift by adding 4 canonical-only bullets to live (Halt-at-gates extension, "State-aware surface", "Cross-project orchestration", and a tier-4 read-order line). STORY-025-06 replaces the "Sprint Execution Gate (CR-021)" bullet text at live `CLAUDE.md:123` and canonical `cleargate-planning/CLAUDE.md:32`. The 4 bullets CR-023 inserts sit at canonical lines 22, 48, 56, plus a tier-4 read-order extension — none of those line ranges overlap with the Sprint-Execution-Gate bullet (live :123, canonical :32). CR-023 first so STORY-025-06 lands on a mirror-parity baseline; otherwise STORY-025-06's mirror-parity Gherkin would have to weaken its scope to "the bullet only", duplicating SPRINT-17 STORY-024-03's scope-narrowing precedent. |
| `.cleargate/scripts/close_sprint.mjs` | STORY-025-03 only | n/a | Confirmed via `grep -nE "REPORT\.md" .cleargate/scripts/close_sprint.mjs` — 8 hits (lines 17, 19, 68, 206, 209, 322, 323, 327). All rewrites + Step 3.5 + Step 7 inserts owned by STORY-025-03. CR-022 (next sprint) modifies different sections per the §3 risk table. |
| `.cleargate/scripts/prefill_report.mjs` | STORY-025-03 only | n/a | Output-path naming hit only (~1 line). Owned by STORY-025-03. |
| `.cleargate/scripts/test/{test_close_pipeline,test_report_body_stdin}.sh` | STORY-025-03 only | n/a | Fixture path updates — owned by STORY-025-03. |
| `.cleargate/templates/{Sprint Plan Template,sprint_report}.md` `<instructions>` blocks | STORY-025-04 only | n/a | CR-023's §-citation rewrites all sit in template **body prose** (lines 10, 32, 148, 199) and not inside any `<instructions>` block. Verified via `grep -nE "<instructions>|</instructions>"` — `<instructions>` block in `Sprint Plan Template.md` runs lines 1–15; the line-10 citation is inside that block but its surrounding sentence stays intact (only the §24→§9 token is rewritten). STORY-025-04 still replaces the entire block, so the order CR-023 → STORY-025-04 is preserved by the templates row above; this row is informational. |
| `cleargate-cli/src/commands/sprint.ts` | STORY-025-02 only | n/a | New sub-handler insertion. CR-023's vitest config + protocol-section test triage do not touch this file. |
| `cleargate-cli/src/cli.ts` | STORY-025-02 only | n/a | Single router-switch line. |
| `cleargate-cli/test/commands/sprint-preflight.test.ts` | STORY-025-02 only (NEW) | n/a | Net-new file. |
| `.claude/agents/reporter.md` (+ canonical mirror) | STORY-025-05 only | n/a | Capability Surface + Post-Output Brief insertion. CR-023's CLAUDE.md mirror reconcile does not touch agent files. |
| `.cleargate/knowledge/cleargate-enforcement.md` (+ canonical mirror) | STORY-025-06 only | n/a | Append-only §13. Current max section is §12 (verified 2026-05-01). CR-023's `protocol-section-N.test.ts` triage targets the *test* files asserting against the protocol/enforcement docs — not the docs themselves. |
| `vitest.config.ts` (root) + `cleargate-cli/vitest.config.ts` | CR-023 only | n/a | `pool: 'forks'` config change. STORY-025-02's test file changes are additive and consume the new pool config when CR-023 lands first. |
| `cleargate-cli/test/scripts/protocol-section-{12,13,14,24}.test.ts` | CR-023 only | n/a | Triage outcome: `protocol-section-24.test.ts` archives or renumbers per CR-023 §0.5; the §12/§13/§14 files audit against the slim protocol — verify-only or renumber. STORY-025-06 does NOT add a new `protocol-section-13.test.ts` for the new enforcement.md §13 (that test surface is in scope for a future cleanup CR per STORY-025-06 §4.1's "extend an existing knowledge-content test" carve-out). |

### 2.3 Shared-Surface Warnings

- **CLAUDE.md is touched by both CR-023 (Wave 1, item b) and STORY-025-06 (Wave 2).** Wave ordering naturally serializes them, but the M0 (CR-023) and M6 (STORY-025-06) Architect plans MUST cross-reference each other's edit regions to prevent line-number drift. Concretely: CR-023 inserts 4 bullets in live `CLAUDE.md` such that the live block grows from 35 to 39 lines; the "Sprint Execution Gate (CR-021)" bullet at live `:123` will shift to a new line number after CR-023's insertions land (likely `:127–:131` depending on insertion order). STORY-025-06's `old_string` for the bullet replacement MUST be re-grepped at the start of M6 execution rather than relying on the line number captured at SDR time. Same risk applies to canonical `cleargate-planning/CLAUDE.md:32` — CR-023 does not touch canonical (per CR-023 §3.1: "canonical untouched — it already has the 4 bullets"), so canonical line-32 stays intact across CR-023's commit, and STORY-025-06 can grep canonical at `:32` reliably.
- **Sprint Plan + Sprint Report templates are touched by CR-023 (citation rewrites in body) and STORY-025-04 (structural reframe of `<instructions>` + body).** Wave ordering serializes them but the edit regions partly overlap on `Sprint Plan Template.md` line 10: CR-023 rewrites `protocol §24` → `cleargate-enforcement.md §9` inside the existing `<instructions>` block (line 10); STORY-025-04 then replaces lines 1–15 wholesale with the new actively-authored block from CR-021 §3.2.1. The new block does NOT reference §24 / §9 at all (it has no `lane`-rubric prose), so STORY-025-04's wholesale replacement effectively discards CR-023's line-10 fix. This is acceptable — CR-023's fix prevents a stale citation in pending-sync between Wave 1 merge and STORY-025-04 merge (a window of hours at sprint-execution speed) but does not need to survive STORY-025-04's reframe. STORY-025-04 Architect M4 plan should note this: "Line-10 §-citation in the `<instructions>` block disappears entirely under reframe — no carry-over needed."
- **`sprint_report.md` line 199 `## §6 Change Log` rewrite by CR-023 + renumber by STORY-025-04.** CR-023 §3.2 item (a) rewrites the §-style heading; STORY-025-04 R6 renumbers current §4 → §5 + current §5 → §6. The current `## §6 Change Log` is already at §6, so STORY-025-04's renumber pass needs to be careful NOT to re-renumber the Change Log heading to §7. Recommended: STORY-025-04 Architect M4 plan explicitly enumerates the renumber map as a closed set: `## §4 Lessons` → `## §5 Lessons`, `## §5 Framework Self-Assessment` → `## §6 Framework Self-Assessment`, and inserts `## §4 Observe Phase Findings` as the new §4. The existing `## §6 Change Log` either gets renumbered to `## §7 Change Log` (if the model is "everything below the insertion shifts") or stays at `## §6` with Framework Self-Assessment merging into Change Log (unlikely). Open decision flagged for orchestrator (see §2 Open Questions below).
- **STORY-025-03 ↔ CR-022 (SPRINT-19) shared-file forecast.** Not a SPRINT-18 conflict but worth surfacing: STORY-025-03 modifies `close_sprint.mjs` Steps 3.5 + 7 + 4 naming hits at lines 17/19/68/206/209/322/323/327. CR-022 (SPRINT-19) per the §3 risk table modifies Steps 2.7, 2.8, 6.5, 6.6, 6.7, 8 — all at different line ranges. Sequential sprint merge handles this. Architect M3 plan should snapshot the post-025-03 line ranges so CR-022's SPRINT-19 SDR can verify disjointness.

### 2.4 Lane Audit

| Story | Lane | Rationale (≤80 chars) |
|---|---|---|
| `CR-023` | fast | Cleanup CR, bounded surface, no schema/runtime change, mechanical rewrites |
| `STORY-025-05` | fast | Single agent definition file × 2 mirrors, doc-only, no test surface |

Seven-check rubric application (per `cleargate-enforcement.md §9` + `architect.md` §"Lane Classification"):

**CR-023 (lane: fast):** (1) Size cap — ~10 file edits but each is mechanical and bounded (4 template citation rewrites of ~3 hits each + 1 CLAUDE.md 4-bullet insertion + 1–4 test file archives/renumbers + 1 vitest config line). Net LOC well under 50 per file; aggregate ~80 LOC across surfaces but the rubric measures per-story, and CR-023 is single-purpose cleanup with no per-file logic. **Marginal pass — reclassify to standard if Architect M0 plan finds aggregate >50 LOC at the implementation level.** (2) Forbidden surfaces — none touched (templates, CLAUDE.md, test fixtures, vitest config — all outside schema/auth/config/adapter/manifest/security prefix list); **pass**. (3) No new dependency — zero `package.json` edits; **pass**. (4) Single acceptance scenario or doc-only — CR-023 has 5 Gherkin scenarios but all are non-runtime grep checks or mechanical test re-runs (no `Scenario Outline`); the vitest config change is doc-adjacent (a single config line); **pass under doc-and-test-hygiene carve-out**. (5) Existing tests cover runtime change — `template-stubs.test.ts` covers (a), `protocol-section-*.test.ts` is what's being fixed in (c), `test_close_sprint_v21.test.ts` Scenarios 2/3/6 are what (d) unblocks; **pass — existing test coverage**. (6) `expected_bounce_exposure: low` — confirmed in CR-023 frontmatter via the cleanup-CR shape; **pass**. (7) No epic-spanning subsystem touches — CR-023 spans 4 surfaces (templates / CLAUDE.md / tests / vitest config) but each is a discrete cleanup item; the CR is its own scope wrapper; **pass on the wrapper-CR carve-out**. All 7 pass → `lane: fast` **confirmed**.

**STORY-025-05 (lane: fast):** (1) Size cap — 2 files (live + canonical reporter.md), inserts ~30 LOC (Capability Surface table + Post-Output Brief blockquote) ≪ 50 LOC cap; **pass**. (2) Forbidden surfaces — `.claude/agents/reporter.md` is not in the schema/auth/config/adapter/manifest/security prefix list; **pass**. (3) No new dependency — zero `package.json` edits; **pass**. (4) Single acceptance scenario or doc-only — story has 6 Gherkin scenarios but all are non-runtime grep checks against the post-edit doc (no `Scenario Outline`, no runtime acceptance); **pass under doc-only carve-out**. (5) Existing tests cover runtime change — N/A, doc-only / non-runtime; **pass**. (6) `expected_bounce_exposure: low` — confirmed in story frontmatter; **pass**. (7) No epic-spanning subsystem touches — both files are within EPIC-025's declared scope; **pass**. All 7 pass → `lane: fast` **confirmed** (re-validates story's frontmatter `lane: fast` + §"Lane: fast" header).

STORY-025-01, STORY-025-02, STORY-025-03, STORY-025-04, STORY-025-06 are all `lane: standard`. Brief rationale per item: 025-01 trips check 1 (~250 LOC across two new scripts + helper + tests); 025-02 trips check 1 (CLI handler + 8 fixture-driven tests, ~200 LOC) and check 5 (introduces a new runtime-acceptance surface, not "existing tests cover"); 025-03 trips check 1 (modifies one of the most central scripts, with ~80 LOC of inserts at sensitive line ranges) and check 4 (8 Gherkin scenarios, multiple branches); 025-04 trips check 1 (4 template files × structural reframe ≈ 60+ LOC per file); 025-06 trips check 7 (touches both `CLAUDE.md` AND `cleargate-enforcement.md` — cross-subsystem doc surfaces, even though both are within EPIC-025).

### 2.5 ADR-Conflict Flags

- **None blocking.** CR-021's design lives within established invariants:
  - **Mirror-parity invariant** (FLASHCARD `2026-04-19 #wiki #protocol #mirror`): every edit applied to `cleargate-planning/` canonical AND live in lockstep. Verified per-story DoD (STORY-025-04 R8, STORY-025-05 R5, STORY-025-06 R3, CR-023 §3.2 item b). Edit-parity not state-parity — CR-023 explicitly reconciles pre-existing CLAUDE.md drift before STORY-025-06 lands, so the SPRINT-17 STORY-024-03 scope-narrowing pattern does not need to be re-applied here.
  - **File-surface contract** (`cleargate-enforcement.md §6`): every staged file appears in the corresponding work-item's `## 3. Implementation Guide` "Files" table or in `.cleargate/scripts/surface-whitelist.txt`. Verified for all 6 stories + CR-023 against §3 file lists (STORY-025-02 frontmatter currently has `cached_gate_result.pass: false` with `implementation-files-declared` failing — orchestrator to re-run gate post-Brief; the §3 table IS present, this is a parser issue not a content gap; same applies to 025-03, 025-05, 025-06).
  - **v2-mode bounce caps** (`cleargate-enforcement.md §3` + flashcard `2026-04-27 #sprint-init #regex #v2-gate`): each story's `expected_bounce_exposure` is `low` or `med`; no story is `high`. Wave 2 sequential sprint surface STORY-025-03 (`med`) is the only above-low item, and its risk is the close-sprint test full-suite vitest contention which CR-023 (Wave 1) durably fixes.
  - **Fast-lane rubric** (`cleargate-enforcement.md §9`): two fast-lane items (CR-023, STORY-025-05) audited above; both pass all 7 checks. Five `standard` items audited above with one-line rationales.
  - **Real-infra-no-mocks for tests** (CLAUDE.md "Real infra"): STORY-025-02 §3.2 declares fixture pattern via `os.tmpdir()` + real `git init` repos — no mocks (story §1.5 risk-mitigation row); STORY-025-01 §4.1 declares "Real fixture sprint dir under `.cleargate/scripts/test/fixtures/`. No mocks"; STORY-025-03 §4.1 reuses existing `test_close_sprint_v21.test.ts` infra. **Pass**.
  - **Backwards-compat carve-outs declared in CR-021 §2.3** (SPRINT-01..17 archived `REPORT.md` naming preserved): STORY-025-03 §1.2 R1 + §2.1 Scenario 2 explicitly assert "SPRINT-01..17 archived REPORT.md files keep old name; new naming applies SPRINT-18+ only — implementation MUST NOT rename pre-existing files". **Pass**.
- **Soft flag (informational, not blocking):** CR-023 §0.5 Open Question (b) — vitest worker hygiene fix via `pool: 'forks'` vs `afterAll` cleanup hooks. Recommended `pool: 'forks'` (durable fix). No FLASHCARD or ADR contradicts; SPRINT-17 REPORT §5 Tooling row + flashcard `2026-05-01 #qa #vitest #npx` document the symptom but not a locked solution. Surface as informational so the human approving Gate 2 sees the trace.
- **Soft flag (informational, not blocking):** STORY-025-06 appends `cleargate-enforcement.md §13` per FLASHCARD `2026-04-21 #protocol #section-numbering` (next free section). Verified `grep -nE "^## [0-9]+\." cleargate-enforcement.md` — last section is `## 12. Gate 3.5 — Sprint Close Acknowledgement (CR-019)` at line 456. §13 is the next free number. No conflict.
- **Open decision flagged for orchestrator:** STORY-025-04 R6 renumber map for `sprint_report.md` is ambiguous on the trailing `## §6 Change Log` heading. Two plausible interpretations: (i) "shift everything below the insertion" → current §6 Change Log → §7; or (ii) "renumber only the §4 Lessons + §5 Retrospective sections explicitly named in CR-021 §3.2.2" → §6 Change Log stays at §6 with Framework Self-Assessment renumbered into it. M4 Architect plan should pin the choice; recommendation: interpretation (i), all-shift, since the new §4 Observe Phase Findings is a real new section and downstream renumbering preserves ordering semantics.

## 3. Risks & Dependencies

| Risk | Mitigation |
|---|---|
| **Token-ledger SubagentStop attribution Red carried forward.** SPRINT-17 REPORT §5 Tooling row + saved-memory `project_token_ledger_red.md`. Per-agent / per-story cost not computable. User 2026-05-01: "leave it be for now". | Surface in §6 Outstanding Items at SPRINT-18 close. Re-evaluate for SPRINT-19+ as a dedicated CR if hook surfaces evolve. Do not promote into SPRINT-18 scope. |
| **`close_sprint.mjs` shared with CR-022 (SPRINT-19).** EPIC-025 (this sprint) modifies Steps 3.5 + 7 + naming. CR-022 (next sprint) modifies Steps 2.7 + 2.8 + 6.5 + 6.6 + 6.7 + 8. Different sections but same file. | Sequential sprint merge — SPRINT-18 closes before SPRINT-19 starts. Architect M3 plan documents the section boundaries to avoid future merge conflicts. |
| **Pre-existing admin/ + mcp/ vitest failures.** ~24 test files fail at file-collect time. Out of SPRINT-18 scope. | Track in REPORT.md §5 Tooling as carry-over. Surface as a candidate for a future infra-cleanup CR if not already covered by an open issue. |
| **vitest full-suite worker contention (CR-023 fixes).** If CR-023 merge slips, STORY-025-03's "no regression" check on the close-sprint test suite will surface false positives. | CR-023 is Wave 1 (parallel with M1/M2/M4); STORY-025-03 is Wave 2. Wave ordering enforces CR-023-first. |
| **CLAUDE.md is touched by 2 SPRINT-18 items.** CR-023 reconciles 4 missing bullets; STORY-025-06 updates the Sprint Execution Gate bullet text. | Sequential merge per §2.3. Architect M0/M6 plan repeats the gate. |

## 4. Execution Log

_(Populated by orchestrator + Reporter during sprint execution. Empty at draft time.)_

| Date | Event Type | Description |
|---|---|---|

## 5. Metrics & Metadata

- **Expected Impact:** Sprint plans become dual-audience (sponsor + AI); Reporter context drops from ~200KB to ~30-50KB; Gate 3 environment health enforced; Observe findings surfaced in REPORT.md.
- **Priority Alignment:** Sequential commitment from SDLC redesign brainstorm charter (Sprint 2 of 3). User 2026-05-01: "go for option a" + "decompose please" + "go with epic and break it down to crs or stories" + "we need it in the sprint" + "leave it be for now [token-ledger]" + "we need to have it fixed [close-sprint test failures]".
- **Outstanding from SPRINT-17:** Token-ledger SubagentStop attribution Red (carried forward); admin/ + mcp/ vitest infra failures (out of scope, tracked).

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** Wave 1 spawns 4 Developer agents in parallel (CR-023, STORY-025-01, STORY-025-02, STORY-025-04). Each Developer reads its story file + the corresponding M0/M1/M2/M4 milestone plan from `sprint-runs/SPRINT-18/plans/`.
- **Relevant Context:** CR-021 design spec (`pending-sync/CR-021_*.md`) is the authoritative source for every STORY-025-* implementation question. Do not modify CR-021 during execution; surface clarifications as CR:spec-clarification events in §4 Execution Log.
- **Constraints:**
  - No CLAUDE.md changes outside CLEARGATE-tag-block.
  - Mirror parity per-edit, not state-parity (FLASHCARD `2026-04-19 #wiki #protocol #mirror`).
  - Real infra, no mocks for git-state tests (FLASHCARD `2026-04-25 #qa #postgres`).
  - Vitest worker hygiene: kill workers after each suite (FLASHCARD `2026-05-01 #qa #vitest #npx`); CR-023 ships the durable fix mid-sprint.
  - Token-ledger Red is OUT of scope. Surface in §4 Execution Log if you find tooling that would help, but do not implement.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low — pending Gate 2 human ack**

Requirements to pass to Green (Gate 2 — Sprint Ready):
- [x] All 7 anchor items decomposed and 🟢 (EPIC-025 + 6 child stories + CR-023).
- [x] Sprint Goal articulated (§0 Stakeholder Brief + §1 prelude).
- [x] Wave structure preview present (§1).
- [x] Architect SDR populated §§2.1-2.5 (phase plan, merge ordering, shared-surface warnings, lane audit, ADR conflicts).
- [x] Risks enumerated with mitigations (§3).
- [x] Token-ledger Red carry-over surfaced (§3 + Execution Guidelines).
- [ ] Sprint Execution Gate (Gate 3) preflight will run before Ready → Active transition (post-approval, after STORY-025-02 ships).
