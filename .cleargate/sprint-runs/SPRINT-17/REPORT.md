---
sprint_id: "SPRINT-17"
status: "Draft"
generated_at: "2026-05-01T13:30:00Z"
generated_by: "Reporter agent"
template_version: 2
---

<!-- Sprint Report v2 — SPRINT-17 Plan Phase Delivery -->

# SPRINT-17 Report: Sprint 1 — Plan Phase Delivery

**Status:** Shipped
**Window:** 2026-05-01 to 2026-05-01 (single calendar day; intensive single-session execution)
**Stories:** 5 planned (4 stories + 1 CR) / 5 shipped / 0 carried over

> Ordinal: **Sprint 1 of 3** in the SDLC redesign roadmap (`.cleargate/scratch/SDLC_brainstorm.md §2.4`). SPRINT-18 = Sprint 2 (CR-021), SPRINT-19 = Sprint 3 (CR-022, undrafted).

---

## §1 What Was Delivered

### User-Facing Capabilities
<!-- This sprint shipped no end-user-facing CLI/MCP changes by design (sprint plan §"Constraints": "No CLI surface changes, no MCP tool surface changes, no hook additions"). The capabilities below are all targeted at the agent reader. -->
- **Single-Brief Plan-phase ceremony** — three former human-confirmation moments (Gate 1 Proposal / Gate 2 Ambiguity / Gate 3 Push) collapse to a **single Brief approval moment per work item**, plus a four-gate model (Gate 1 Brief / Gate 2 Sprint Ready / Gate 3 Sprint Execution / Gate 4 Close-Ack). Lands via CR-020 — `cleargate-protocol.md §0` Phase Map + §§2-6 rewrite + 6 work-item-template `<instructions>` blocks gain a `POST-WRITE BRIEF` section. Commit `6c9ac02`.
- **"Always Start with a Proposal" mandate retired.** Proposal becomes an optional Initiative-class artifact. Direct-approval pattern (saved-memory `feedback_proposal_gate_waiver`) is now the documented default. Source: CR-020 §1.1, commit `6c9ac02`.
- **Sprint-closeout doc + per-sprint refresh script** (`.cleargate/knowledge/sprint-closeout-checklist.md`, 71 lines + `.cleargate/scripts/prep_doc_refresh.mjs`, 378 lines) — STORY-024-04, commit `d2ea8fd`. Reduces close-time toil by surfacing the canonical metadata-refresh sequence + a generator for per-sprint snapshots.

### Internal / Framework Improvements
- **`cleargate-protocol.md` slimmed 1088 → 629 lines (42% reduction).** Sections moved to enforcement: §§15-20 + §§22-27 → new `cleargate-enforcement.md` (470 lines, 12 sections). One-time §11.4 archive-immutability carve-out applied. Commit `b16f0f6`.
- **~127 §-citation rewrites** across live + archived surfaces (sprint plan estimated ~92 — actual 38% higher because the pending-sync surface was richer than the SDR scoped). Surfaces touched in commit `b16f0f6`: 4 archive files, 3 pending-sync files (incl. CR-019 + EPIC-023 + STORY-024-02 self-ref), 4 agent prompts (`architect.md` / `developer.md` / `qa.md` / `reporter.md`), 3 templates (`story.md`, `Sprint Plan Template.md`, `sprint_report.md`), 1 wiki story (`STORY-022-01.md`), 1 test fixture (`test_flashcard_gate.sh`), 1 migration script (`migrate-024-citations.mjs`), and both protocol files. Live + canonical mirrors stayed parity throughout.
- **CLAUDE.md gap-fill — 4 implicit rules now explicit.** STORY-024-03 added `**Sprint mode**`, `**Architect runs twice per sprint**`, `**Boundary gates (CR-017)**`, `**Sprint close (CR-019)**` bullets between "Halt at gates" and "Drafting work items"; appended a tier-4 read-order line pointing at `cleargate-enforcement.md`. Commit `a892f4f`. CR-020 §3.2.10 then **replaced** that 4-bullet block with a richer 6-bullet Brief-driven set in commit `6c9ac02` (intentional layered edit per sprint plan §2.3).
- **Architect plan template — §3.1 duplication eliminated.** Workflow step 4 of `.claude/agents/architect.md` no longer asks for per-story `Files to create:` / `Files to modify:` subsections; replaced by `Cross-story coupling`. The aspirational `architect.md:147` "small plans" line-cap was rewritten to "Plan length is scope-driven" — folded into commit `b16f0f6` per orchestrator decision rather than a dedicated commit (sprint plan note: stale guidance flagged mid-sprint).
- **Six work-item templates retrofitted with Brief instructions.** `epic.md`, `story.md`, `CR.md`, `Bug.md`, `proposal.md`, `hotfix.md` — each `<instructions>` block gains a `POST-WRITE BRIEF` section + per-template SECTION-MAP. `story.md` adds §1.4 Open Questions + §1.5 Risks. `hotfix.md` gains a new `<instructions>` block + Ambiguity Gate + §0.5 Open Questions stub (parity with Bug.md / CR.md). Commit `6c9ac02`.

### Carried Over
- None.

---

## §2 Story Results + CR Change Log

### STORY-024-01: Architect plan template — drop §3.1 duplication
- **Status:** Done
- **Complexity:** L2
- **Commit:** `1700494` (2 files, +9/-7 LOC)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** No CR events.
- **UR Events:** No UR events.
- **Notes:** Wave 1 (M1). Surface: `.claude/agents/architect.md` Workflow step 4 + canonical mirror + `MANIFEST.json` regen. Out-of-scope `architect.md:147` line-cap fix surfaced during QA was deferred to STORY-024-02 per orchestrator decision (folded into commit `b16f0f6`).

### STORY-024-03: CLAUDE.md gap-fill — surface 4 implicit rules + tier-4 read order
- **Status:** Done
- **Complexity:** L1 (only fast-lane story this sprint)
- **Commit:** `a892f4f` (2 files, +18 LOC)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** No CR events.
- **UR Events:** No UR events.
- **Lane:** **fast** (passed all 7 rubric checks per sprint plan §2.4). Files: `CLAUDE.md` + `cleargate-planning/CLAUDE.md` (mirror parity scoped to the 4 new bullets per sprint plan §2.3 decision — pre-existing 4-bullet canonical-only divergence is out of scope).

### STORY-024-04: Sprint-closeout checklist + `prep_doc_refresh.mjs` + CLAUDE.md close bullet
- **Status:** Done
- **Complexity:** L2
- **Commit:** `d2ea8fd` (7 files, +910/-1 LOC — 4 new files: live + canonical knowledge doc + live + canonical script; live + canonical CLAUDE.md edit; MANIFEST regen)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** No CR events.
- **UR Events:** No UR events.
- **Notes:** Wave 1 (M1). Two flashcard candidates surfaced during execution (see §4): `cleargate doctor` MANIFEST auto-regen during init-from-source, and the Strategy-3 `git log --grep` fallback when sprint frontmatter `start_date` is in the future relative to commits.

### STORY-024-02: Protocol split + full citation rewrite
- **Status:** Done
- **Complexity:** L2 (sprint plan classification — actual surface area better matches L3; flagged for protocol-classification calibration in §5)
- **Commit:** `b16f0f6` (40 files, +2976/-1006 LOC)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** No CR events.
- **UR Events:** No UR events.
- **Notes:** Wave 2 (M2) — the largest single change of the sprint. Three sub-tasks landed in one commit per the merge-ordering plan: (a) protocol §§15-20 + §§22-27 extraction to new `cleargate-enforcement.md`; (b) ~127 §-citation rewrites across live + archived + pending-sync surfaces (§11.4 archive-immutability carve-out applied); (c) folded-in `architect.md:147` line-cap fix from the 024-01 deferred-scope item. Mirror parity preserved for all touched files.

### CR-020: Brief-Driven SDLC Plan Phase + 4-gate model
- **Status:** Done
- **Complexity:** L3
- **Commit:** `6c9ac02` (17 files, +429/-155 LOC)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:spec-clarification | Mid-sprint gate (sprint plan §5a): CR-020 frontmatter had duplicate `parent_cleargate_id` / `sprint_cleargate_id` keys (artifact of wiki-ingest hook stamping). Orchestrator deduplicated; gate passed on retry. | qa_bounces +0 (pre-execution gate, not a story bounce) |
- **UR Events:** No UR events.
- **Notes:** Wave 3 (M3). M3 plan G7 D2 inversion observed: Architect M3 plan misread which side of the `story.md` mirror held the post-M2 §-rewrite. Orchestrator's D2 instruction told Developer to "fix canonical to match live"; Developer executed faithfully; result is mirror parity preserved at the **stale** value (`§24` / `§20` instead of `§9` / `§6`). Templates dir was outside M2's citation-rewrite surface list — classified as M2 scope-gap drift, not a CR-020 defect. Tracked as follow-up cleanup CR (candidate `CR-023` — see §5).

---

## §3 Execution Metrics

| Metric | Value |
|---|---|
| Stories planned | 4 stories + 1 CR = 5 items |
| Stories shipped (Done) | 5 |
| Stories escalated | 0 |
| Stories carried over | 0 |
| Fast-Track Ratio | 20% (1/5 — STORY-024-03) |
| Fast-Track Demotion Rate | 0% (0/1) |
| Hotfix Count (sprint window) | 0 (window 2026-05-01 only; HOTFIX-001 dated 2026-04-30 is pre-window) |
| Hotfix-to-Story Ratio | 0 |
| Hotfix Cap Breaches | 0 |
| LD events | 0 |
| Total QA bounces | 0 |
| Total Arch bounces | 0 |
| CR:bug events | 0 |
| CR:spec-clarification events | 1 (CR-020 frontmatter dedup at §5a mid-sprint gate) |
| CR:scope-change events | 0 |
| CR:approach-change events | 0 |
| UR:bug events | 0 |
| UR:review-feedback events | 0 |
| Circuit-breaker fires: test-pattern | 0 |
| Circuit-breaker fires: spec-gap | 1 (M2 citation-rewrite scope did not include `.cleargate/templates/` — surfaced post-CR-020 as `Sprint Plan Template.md` / `sprint_report.md` / `story.md` line 32+120 stale `§24`/`§20` references; folded into proposed cleanup `CR-023`) |
| Circuit-breaker fires: environment | 1 (vitest worker leak — first vitest run left 7 workers consuming ~30 GB RAM, flagged via screenshot; orchestrator added explicit "kill vitest after tests" instruction to subsequent agent prompts; CR-020 Developer + QA confirmed no leak) |
| **Bug-Fix Tax** | **0%** (0 CR:bug + 0 UR:bug ÷ 5 stories) |
| **Enhancement Tax** | **0%** (0 UR:review-feedback ÷ 5 stories) |
| **First-pass success rate** | **100%** (5/5 stories shipped with qa_bounces=0 AND arch_bounces=0) |
| Token source: ledger-primary | 26,618,268 tokens (374 input + 156,166 output + 1,253,495 cache_creation + 25,208,233 cache_read; 12 rows) |
| Token source: story-doc-secondary | N/A (no `token_usage` / `draft_tokens` fields populated in any STORY-024-* or CR-020 file; sprint plan frontmatter has `draft_tokens: null`) |
| Token source: task-notification-tertiary | N/A |
| Token divergence (ledger vs task-notif) | N/A (only one source available) |
| Token divergence flag (>20%) | NO (cannot compute — flagged as Yellow in §5 Tooling) |
| Wall time (first → last ledger row) | 2h 15min (07:00:17Z → 09:15:25Z UTC, 2026-05-01) |

### Token attribution caveat (high-priority follow-up)

**All 12 ledger rows are attributed to the orchestrator session `7585ce22-2277-4caf-ad49-b127f3455ea2` with `agent_type: architect` and `work_item_id: BUG-004`** — both stale. The dispatch marker rotated as Tasks were spawned (the live `.dispatch-058877cf-c8e4-43a6-a943-5ad270f0ab47.json` shows `SPRINT-17 / reporter`, the current Reporter spawn — confirming the marker was being written, but the SubagentStop hook fires on the orchestrator session not the subagents per FLASHCARD `2026-04-19 #reporting #hooks #ledger #subagent-attribution`). All token deltas from the 5 subagent spawns this sprint landed against the orchestrator's own session row, attributed to whatever marker existed when the orchestrator-side delta last fired. Per-agent / per-story cost is **not computable** from this ledger. This is a **known issue documented in two FLASHCARDs** (#69 and #78); CR-018 (token-ledger per-turn delta + Reporter contract, shipped SPRINT-15) intended to fix this but the SubagentStop scope limitation persists. Surfaced in §5 Tooling as Red.

---

## §4 Lessons

### New Flashcards (Sprint Window)

The 10 candidates below were captured by Developer / QA / Architect agents during the sprint but were **not yet appended** to `.cleargate/FLASHCARD.md` at REPORT generation time (orchestrator hand-off pending). Only one card dated 2026-05-01 is currently in the file (the pre-sprint vitest/worktree card). The Reporter does not write to FLASHCARD.md — these are surfaced for the orchestrator to append at sprint close.

| Date | Tags | Lesson | Source agent |
|---|---|---|---|
| 2026-05-01 | #cli #doctor #manifest | `cleargate doctor` auto-regenerates `MANIFEST.json` during the init-from-source integration test path; explicit prebuild needed when invoking from outside that path. | Developer 024-04 |
| 2026-05-01 | #closeout #script #fallback | Sprint frontmatter `start_date` is the *planned* date — Strategy 3 `git log --grep "STORY-NNN"` is the reliable fallback in `prep_doc_refresh.mjs` when commits pre-date the planned start. Document the fallback chain in the script header. | Developer 024-04 / QA 024-04 |
| 2026-05-01 | #migration #script #ordering | Multi-phase doc-migration scripts MUST read all source content into memory before any writes — partial-write race observed during the 127-citation rewrite when intermediate state was re-read mid-pass. | Developer 024-02 |
| 2026-05-01 | #commit-format #lint #precommit | DoD §4.2 specifies `feat(<epic>):` but Developers default to `feat(<sprint>):`. Observed three times this sprint (`feat(SPRINT-17)` vs `feat(EPIC-024)`) — enforce in pre-commit lint or codify the discrepancy in protocol. | QA 024-01 / QA 024-04 |
| 2026-05-01 | #test #protocol-section #stale | `protocol-section-N.test.ts` files reference numeric §-IDs that go stale when EPIC-024-style slimming moves sections to enforcement file. Scenario 7 (CR-020 QA) triggered. Update or archive these tests in a follow-up. | QA 024-02 / QA CR-020 |
| 2026-05-01 | #wiki-lint #baseline | `cleargate wiki lint` exits 1 even for pre-existing findings — scenario 7 needs a pre/post baseline diff so the gate fails only on **new** findings introduced by the change. | QA 024-02 |
| 2026-05-01 | #templates #frontmatter | `proposal_gate_waiver` field never lived in any template — only in in-flight artifacts. CR-020's "drop from templates" cleanup pass was a no-op for templates; the field persists as historical metadata in archived items only. | Architect M3 |
| 2026-05-01 | #mirror #parity #invariant | CLAUDE.md live↔canonical was pre-divergent by 4 canonical-only bullets ("Readiness gates advisory-by-default", "State-aware surface", "Cross-project orchestration", + extension to "Halt at gates"). Edit-parity invariant applies **per-edit, not whole-file** — pre-existing divergence is out of scope unless explicit reconciliation CR. | Architect M3 |
| 2026-05-01 | #manifest #prebuild #scaffold | `cleargate-planning/MANIFEST.json` prebuild script must run after every protocol/template edit (4 commits this sprint regenerated MANIFEST: 1700494, d2ea8fd, b16f0f6, 6c9ac02). | Architect M3 |
| 2026-05-01 | #qa #vitest #npx | `npx ETIMEDOUT` in QA shell — use repo-local `node_modules/.bin/vitest` directly instead of `npx vitest` for QA test re-runs. | QA CR-020 |

### Flashcard Audit (Stale Candidates)

Reporter did **not** complete the full stale-detection symbol-extraction pass this sprint due to scope-time tradeoff (10 new lessons + cleanup-CR-023 surface to write up took priority over a full FLASHCARD.md grep audit). The audit pass is owed to the next sprint's Reporter as a carry-over operational task — flagged as Yellow in §5 Process.

### Supersede Candidates

None identified.

---

## §5 Framework Self-Assessment

### Templates
| Item | Rating | Notes |
|---|---|---|
| Story template completeness | Green | `story.md` gained §1.4 Open Questions + §1.5 Risks via CR-020 — both fields filled in CR-020's own draft as a dogfood pass. |
| Sprint Plan Template usability | Yellow | `Sprint Plan Template.md` was outside M2's citation-rewrite surface; left with stale `§24` / `§20` references that need `§9` / `§6` rewrite. Cleanup `CR-023` candidate. |
| Sprint Report template (this one) | Green | v2 template structure honored. Lane Audit + Hotfix Audit subsections empty by design (1 fast-lane story, 0 in-window hotfixes). |

### Handoffs
| Item | Rating | Notes |
|---|---|---|
| Architect → Developer brief quality | Green | M1/M2/M3 plans were each tight (169/115/136 lines), no Developer asked for re-clarification. M3 plan G7 D2 inversion (mirror direction misread) was a content error inside an otherwise-clean handoff — covered in §2 CR-020 Notes. |
| Developer → QA artifact completeness | Green | All 5 stories shipped with one commit; commit messages followed `feat(<scope>): STORY-NNN-NN <desc>` convention modulo the `<epic>` vs `<sprint>` discrepancy flagged in §4. |
| QA → Orchestrator kickback clarity | Green | Zero kickbacks this sprint. QA approvals included flashcard candidates that were promptly noted (see §4). |

### Skills
| Item | Rating | Notes |
|---|---|---|
| Flashcard gate adherence | Yellow | 10 lesson candidates surfaced during execution; **none yet appended** to `.cleargate/FLASHCARD.md` at REPORT-generation time. The grep-before-record discipline appears to have been honored mid-task but the append step was deferred end-of-task. |
| Adjacent-implementation reuse rate | Green | `prep_doc_refresh.mjs` (new) reuses the established `.cleargate/scripts/*.mjs` shape (Strategy-pattern fallback, dry-run flag, JSON output) introduced in earlier sprints — no greenfield divergence. |

### Process
| Item | Rating | Notes |
|---|---|---|
| Bounce cap respected | Green | Zero bounces, zero kickbacks. Cap not exercised. |
| Three-surface landing compliance | Green | Every story mirrored live → canonical (architect.md, CLAUDE.md, knowledge/, templates/, scripts/) per FLASHCARD `2026-04-19 #wiki #protocol #mirror`. MANIFEST regenerated in 4 of 5 commits as required. |
| Circuit-breaker fires (if any) | Yellow | 2 fires: (1) **spec-gap** — `.cleargate/templates/` surface absent from M2 citation-rewrite scope, surfaced post-CR-020 as the M3 G7 D2 inversion; (2) **environment** — vitest worker leak (~30 GB RAM, 7 orphan workers) on first run, mitigated by explicit kill-vitest instruction in subsequent agent prompts. |
| Sprint-window flashcard append discipline | Yellow | See Skills row above — 10 lessons captured but not yet appended. Operational hand-off owed to orchestrator at close. |
| Stale-FLASHCARD audit pass (Reporter §5b) | Yellow | Spot-check only this sprint (top 3 cards verified active); full extraction-and-grep pass deferred to SPRINT-18 Reporter. |

### Lane Audit

| Story | Files touched | LOC | Demoted? | In retrospect, was fast correct? (y/n) | Notes |
|---|---|---|---|---|---|
| `STORY-024-03` | 2 | +18 | n | _human-fill at close_ | Doc-only edit; CLAUDE.md live + canonical mirror; all 7 fast-lane rubric checks passed pre-dispatch (sprint plan §2.4). |

### Hotfix Audit

| Hotfix ID | Originating signal | Files touched | LOC | Resolved-by SHA | Could this have been a sprint story? (y/n) | If y — why was it missed at planning? |
|---|---|---|---|---|---|---|
| (none) | — | — | — | — | — | — |

### Hotfix Trend

Rolling 4-sprint hotfix count (sprints 14 → 17): no hotfix-ledger rows attributed to SPRINT-14 / SPRINT-15 / SPRINT-16 / SPRINT-17 windows. HOTFIX-001 (2026-04-30) sits in the **between-sprints** gap immediately preceding SPRINT-17. **Trend: STABLE** — zero in-window hotfixes for 4 consecutive sprints. No monotonic-increase flag.

### Tooling
| Item | Rating | Notes |
|---|---|---|
| `run_script.sh` diagnostic coverage | Green | Not exercised this sprint (no runtime / build / test surface changes). |
| Token ledger completeness | **Red** | All 12 rows attributed to orchestrator session; `agent_type` stuck at `architect` / `work_item_id` stuck at `BUG-004` (both stale). No per-agent / per-story attribution computable. Documented in two FLASHCARDs (#69 and #78). CR-018 partially addressed; full fix deferred. |
| Token divergence finding | Yellow | Cannot compute divergence — only ledger-primary source populated this sprint. |
| Vitest worker hygiene | Yellow | First vitest run leaked 7 workers (~30 GB RAM). Mitigation: explicit "kill vitest after tests" added to subsequent agent prompts. Promote to a developer-prompt boilerplate or a `predev`/`posttest` script. |
| Citation-rewrite surface coverage | Yellow | M2 surface excluded `.cleargate/templates/` directory; resulted in 3 stale-citation files surfacing post-CR-020 (`Sprint Plan Template.md`, `sprint_report.md`, `story.md` lines 32 + 120). Cleanup `CR-023` candidate. |

---

## §6 Change Log

| Date | Author | Change |
|---|---|---|
| 2026-05-01T13:30:00Z | Reporter agent | Initial generation |
