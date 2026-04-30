---
sprint_id: SPRINT-15
source_tool: local
status: Active
start_date: 2026-04-28
end_date: 2026-05-12
created_at: 2026-04-28T00:00:00Z
updated_at: 2026-04-28T00:00:00Z
created_at_version: cleargate@0.8.2
updated_at_version: cleargate@0.8.2
context_source: "Conversation 2026-04-28 — user asked for a process-refinement sprint. Picked Option A expanded: Wiki contradiction (EPIC-020) + ledger hook v2 (CR-016) + hierarchy frontmatter (PROPOSAL-009 schema half) + Upgrade UX (EPIC-016 decomp) + 4 process CRs + PROPOSAL-013 Approved this sprint, decomposed for SPRINT-16. SPRINT-14 cohort archive sweep + STORY-003/004/005 ghost audit + Approved-bug triage are M0 hygiene."
epics:
  - EPIC-020
crs:
  - CR-002
  - CR-011
  - CR-012
  - CR-016
  - CR-017
  - CR-018
bugs: []
proposals: []
approved: true
approved_at: 2026-04-30T00:00:00Z
approved_by: sandrinio
activated_at: 2026-04-30T00:00:00Z
execution_mode: v2
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
sprint_cleargate_id: SPRINT-15
children:
  - "[[STORY-015-05]]"
  - "[[STORY-015-06]]"
---

# SPRINT-15: Process v3 — Awareness, Ledger, Hierarchy, Upgrade

## Sprint Goal

Tighten ClearGate's *internal* process layer so the framework can describe its own state honestly to itself, its agents, and its operators. Five things land together:

1. **Wiki tells the truth about contradictions.** EPIC-020 ships an advisory contradiction-check phase in wiki-ingest so Draft work items get screened against their cited neighborhood. No new gates blocked; surfaces drift the lint pass can't see.
2. **The token ledger reports real cost.** Two sequential CRs in M3 split per the granularity rubric (L3+high default split): **CR-016** replaces transcript-scan attribution with explicit dispatch markers (closes BUG-021); **CR-018** replaces cumulative-snapshot rows with per-turn deltas + flips the Reporter contract + cuts the 0.9.0 release (closes BUG-022). Reporter math becomes additive across multi-session sprints; Anthropic-dashboard reconciliation becomes possible.
3. **The hierarchy becomes machine-readable.** Two stories pulled from PROPOSAL-009's schema half: formalise `parent_cleargate_id:` and `sprint_cleargate_id:` as top-level frontmatter keys; `cleargate push` and wiki-ingest learn to extract and propagate them. Wiki, ledger, and Reporter can finally traverse the tree without prose-key sniffing.
4. **CR-017 ships the decomposition discipline this sprint relies on next sprint.** PROPOSAL-013 (Approved 2026-04-28) decomposition into EPIC‑023 is **between-sprints transition work**, not a SPRINT-15 deliverable. Per the rule formalized in CR-017's protocol §26: a proposal must be decomposed (Epic + Gherkin'd stories) before the sprint executing against it can activate. The Architect performs that decomposition between SPRINT-15 close and SPRINT-16 activation; SPRINT-16's sprint-init gate then verifies it. EPIC-016 (Upgrade UX, 6 stories) — originally bundled in SPRINT-15 — was deferred end-to-end to SPRINT-16 on 2026-04-29 (over-sizing). SPRINT-16 anchors on EPIC-016 + EPIC‑023 sub-epic 1 (Work-Item Sync v2) and is the first sprint to exercise CR-017's reconciler + decomposition gate at close.

In parallel, four process-polish CRs (CR-002/-011/-012/-017) close small but persistent paperwork drift: wiki-lint drift, capability gating by membership, ingest-result feedback to chat, and **lifecycle reconciliation at sprint boundaries** (CR-017 — exactly the gap that let CR-001 sit Draft for 9 days while its code shipped; now `close_sprint.mjs` blocks on drift, `sprint init` warns, and `carry_over: true` becomes a first-class carry-over signal). (CR-001 itself was dropped pre-kickoff — already shipped in commit `54e0a1a`.) SPRINT-14 archive sweep + STORY-003/004/005 ghost audit + Approved-bug triage happen in M0 as orchestrator-only hygiene (not story-tracked).

This sprint deliberately skips Multi-Participant Sync (PROPOSAL-007 → EPIC-010) — superseded by PROPOSAL-013 — and Project Config MCP-Authoritative (PROPOSAL-008) — depends on PROPOSAL-013 architecture. Both get archived/parked in M0 / M6.

## 1. Consolidated Deliverables

| Item | Type | Title | Lane | Complexity | Parallel? | Bounce Exposure | Milestone |
|---|---|---|---|---|---|---|---|
| `STORY-020-01` | Story | Contradict subagent + schema delta (`last_contradict_sha` additive) | standard | L2 | n | med | M1 |
| `STORY-020-02` | Story | Wiki-ingest Phase 4 + advisory contradictions log | standard | L2 | n | med | M1 |
| `STORY-020-03` | Story | `cleargate wiki contradict` CLI subcommand | standard | L1 | y | low | M1 |
| `STORY-015-05` | Story | Templates: add `parent_cleargate_id:` + `sprint_cleargate_id:` top-level keys to epic.md / story.md / Sprint Plan Template.md / CR.md / Bug.md / hotfix.md | fast | L1 | y | low | M2 |
| `STORY-015-06` | Story | `cleargate push` + wiki-ingest extract & propagate hierarchy keys; one-shot backfill on next ingest pass | standard | L2 | n | med | M2 |
| [`CR-016`](CR-016_Token_Ledger_Hook_v2.md) | CR | Token Ledger — dispatch-marker attribution (closes BUG-021) | standard | L2 | n | med | M3 |
| [`CR-018`](CR-018_Token_Ledger_Per_Turn_Delta_Math.md) | CR | Token Ledger — per-turn delta math + Reporter contract + 0.9.0 bump (closes BUG-022) | standard | L2 | n | med | M3 |
| [`CR-002`](CR-002_Wiki_Lint_Drift_Cleanup.md) | CR | Wiki lint drift cleanup | standard | L1 | y | low | M4 |
| [`CR-011`](CR-011_Capability_Gating_By_Membership.md) | CR | Capability gating by membership | standard | L2 | y | med | M4 |
| [`CR-012`](CR-012_Surface_Ingest_Result_To_Chat.md) | CR | Surface ingest result to chat | fast | L1 | y | low | M4 |
| [`CR-017`](CR-017_Lifecycle_Status_Reconciliation_At_Sprint_Boundaries.md) | CR | Lifecycle status reconciliation at sprint boundaries — close_sprint.mjs blocks on drift; sprint init warns; verb→status map; carry_over key | standard | L2 | y | med | M4 |

**Totals: 1 Epic (EPIC-020 = 3 stories) + 6 CRs + 2 stand-alone Stories = 10 items.** Complexity: 4×L1 + 6×L2 + 0×L3. No L4. Lane mix: 2 fast / 8 standard (20%).

**Sprint sizing (2026-04-29):** Originally 17 items; right-sized to 10 by (a) deferring EPIC-016 (6 stories) → SPRINT-16 over-sizing fix; (b) removing PROPOSAL-013 decomp from deliverables — decomposition is between-sprints transition work, not a sprint deliverable (rule formalized in CR-017 protocol §26). Theme stays "process tightening": EPIC-020 (wiki awareness) + ledger v2 (CR-016/-018) + hierarchy keys (STORY-015-05/-06) + lifecycle reconciler (CR-017, now also covering decomposition gate) + 3 polish CRs.

**Between-sprints transition work (post-SPRINT-15 close, pre-SPRINT-16 activation; not story-tracked, not a SPRINT-15 deliverable):**
- Architect decomposes PROPOSAL-013 — `EPIC‑023_MCP_Native_Source_Of_Truth.md` (4 sub-epics per §2.5).
- Architect decomposes EPIC—023 sub-epic 1 — `STORY‑023‑01-NN_*.md` (~3 stories) with Gherkin + lane assignments.
- Status flips Draft → Approved on STORY-016-01..06 (already drafted; pre-staged for SPRINT-16).
- Gate-readiness sweep on EPIC-016 + EPIC‑023 + sub-epic-1 stories.
- SPRINT-16 cannot activate until **all** of the above complete (CR-017 sprint-init decomposition gate enforces).

**Pre-kickoff audit findings (2026-04-28):**
- **CR-001** dropped — already shipped in commit `54e0a1a` (2026-04-19); moved to archive as Completed.
- **STORY-015 namespace** — IDs -01..-04 taken by shipped EPIC-015 (Wiki Hygiene, SPRINT-11). Hierarchy stories use **-05 / -06**.
- **CR-011, CR-012, CR-002, EPIC-020, EPIC-016 stories** verified genuinely unshipped (no git log hits, no live artifacts).

**Hygiene running in M0 (not story-tracked):**
- SPRINT-14 archive sweep — move STORY-014-01/-02, STORY-022-01..08, STORY-099-01, CR-008/-009/-010/-014/-015, BUG-008/-009/-017/-018/-020, SPRINT-14 itself into `delivery/archive/`; flip wiki statuses.
- Ghost audit — STORY-003-01..12, STORY-004-01..06/-08/-09, STORY-005-06 in pending-sync. Decide: stale duplicates of archived (delete) or genuine pending (keep).
- Proposal hygiene — PROPOSAL-007 → Abandoned (superseded by PROPOSAL-013), PROPOSAL-011 → archive (shipped via EPIC-014), PROPOSAL-013-Fast-Track → archive (shipped via EPIC-022), PROPOSAL-008 → keep Draft (parked behind PROPOSAL-013).
- Approved-bug triage — confirm BUG-002 / BUG-003 / BUG-005 still real after SPRINT-14 changes; if stale, mark Verified + archive. If real, file under M7 backlog (out of sprint scope unless trivially adjacent).

**Follow-ups filed during sprint (for SPRINT-16+):**
- **EPIC‑023** (M6 deliverable) — full execution of PROPOSAL-013. Multi-sprint.
- **PROPOSAL-008 unblock** — once EPIC‑023 §1 (work-item sync v2) lands, project_config table can ride the same pipeline.
- **EPIC-006/EPIC-010 status** — both deferred indefinitely pending EPIC‑023; reconsider after SPRINT-16.

## 2. Execution Strategy

### 2.1 Phase Plan

**M0 — Sprint Kickoff Hygiene (orchestrator-only, no Developer spawns):**
- SPRINT-14 archive sweep (file moves + wiki status flips + `cleargate wiki build`).
- STORY-003/004/005 ghost audit (delete-or-keep decision documented in M0 notes).
- Proposal hygiene (PROPOSAL-007 abandoned, -011 archived, -013-Fast-Track archived).
- Approved-bug triage on BUG-002/-003/-005.
- Output: clean board, no story credit.

**M1 — Wiki Awareness (EPIC-020, sequential within epic):**
- **STORY-020-01 first.** Contradict subagent + `last_contradict_sha` schema delta. Read-only subagent, neighborhood-scoped, advisory v1.
- **STORY-020-02 second.** Wiki-ingest Phase 4 invocation + `wiki/contradictions.md` advisory log. Depends on 020-01's subagent contract.
- **STORY-020-03 in parallel with 020-02.** CLI `cleargate wiki contradict` subcommand. Disjoint surface (cleargate-cli/src/commands/wiki.ts).

**M2 — Hierarchy Foundation (sequential):**
- **STORY-015-05 first** (fast lane). Pure template edits — add `parent_cleargate_id:` + `sprint_cleargate_id:` top-level keys to 6 templates. No code, no schema. fast-lane eligible: single-surface, doc-only, no schema.
- **STORY-015-06 second.** `cleargate push` extracts the keys from frontmatter; wiki-ingest propagates them; one-shot backfill rewrites existing pending-sync items by sniffing prose references (`parent_ref`, body cross-refs).

**M3 — Ledger Correctness (sequential, parallel with M1/M2):**
- **CR-016 first.** Adds dispatch-file read at the top of `token-ledger.sh` SubagentStop handler + orchestrator helper `write_dispatch.sh` + CLAUDE.md convention doc. Row schema unchanged here — just `story_id`/`agent_type` accuracy.
- **CR-018 second.** Wraps row-write step in `token-ledger.sh` with delta computation; new row schema (`delta` + `session_total` blocks); switches Reporter contract to read `.delta.*`; cuts 0.9.0 bump. Sequenced after CR-016 because both modify the same hook file.
- M3 runs **parallel with M1 and M2** — surface (`token-ledger.sh`, `reporter.md`, `lib/ledger.ts`, `write_dispatch.sh`) is disjoint from wiki/template surfaces.

**M4 — Process Polish CRs (all parallel after M0):**
- CR-002 ‖ CR-011 ‖ CR-012 ‖ CR-017. Four disjoint surfaces. Spawn four Developer agents in worktrees concurrently. CR-012 fast-lane eligible (single-file CLI + chat-render addition, no schema). CR-017's templates touch (`carry_over:` key) **must merge after STORY-015-05** so it edits the post-hierarchy-keys YAML structure — see §2.2 merge ordering. CR-001 was dropped pre-kickoff — already shipped (see Pre-kickoff audit findings above).


### 2.2 Merge Ordering (Shared-File Surface Analysis)

| Shared File | Items Touching It | Merge Order | Rationale |
|---|---|---|---|
| `.claude/agents/cleargate-wiki-ingest.md` | STORY-020-01, STORY-020-02 | 020-01 → 020-02 | 020-01 declares the subagent contract; 020-02 wires it into the ingest pipeline. |
| `.claude/agents/cleargate-wiki-lint.md` | STORY-020-01 (additive `last_contradict_sha` field) | — | Single-touch. |
| `.cleargate/knowledge/cleargate-protocol.md` | STORY-020-02 (§10.4 schema delta), STORY-015-06 (frontmatter §X), CR-011 (capability §Z), CR-017 (§25 lifecycle reconciliation) | 020-02 → 015-06 → CR-011 → CR-017 | Disjoint sections; serialize for clean diff history. |
| `.cleargate/templates/{epic,story,Sprint Plan Template,CR,Bug,hotfix}.md` | STORY-015-05 (parent/sprint cleargate_id), CR-017 (carry_over: false) | 015-05 → CR-017 | 015-05 lands the additive hierarchy keys; CR-017's `carry_over:` key extends the same frontmatter region. |
| `.cleargate/scripts/close_sprint.mjs` | CR-017 | — | Single-touch this sprint (extends STORY-022-07's validator). |
| `cleargate-cli/src/commands/sprint.ts` | CR-017 | — | Single-touch this sprint (sprint init pre-activation hook). |
| `cleargate-cli/src/lib/lifecycle-reconcile.ts` | CR-017 (new) | — | New file. |
| `.claude/hooks/token-ledger.sh` | CR-016 (dispatch read), CR-018 (delta computation) | CR-016 → CR-018 | Both sit in the SubagentStop handler; CR-016 at top, CR-018 wraps the row-write at bottom. Sequenced for clean diffs. |
| `.claude/agents/reporter.md` | CR-018 (delta read + format-fallback caveat) | — | Single-touch this sprint. CR-016 does NOT touch reporter — row schema unchanged in CR-016. |
| `cleargate-planning/CLAUDE.md` | CR-016 (orchestrator dispatch-write convention) | — | Single-touch this sprint. |
| `.cleargate/scripts/write_dispatch.sh` | CR-016 (new) | — | New file. |
| `cleargate-cli/src/lib/ledger.ts` | CR-018 (new — Reporter-side reader with backwards-compat) | — | New file. |
| `cleargate-cli/src/commands/push.ts` | STORY-015-06 | — | Single-story surface. |
| `cleargate-cli/src/commands/wiki.ts` | STORY-020-03 | — | Single-story surface (new subcommand). |
| `cleargate-cli/package.json` | CR-018 (0.9.0 bump) | — | Single-touch this sprint. |

### 2.3 Shared-Surface Warnings

- **CR-018 ↔ Reporter contract.** CR-018 swaps the ledger row format (`flat fields` → `delta + session_total` blocks). The Reporter agent contract at `.claude/agents/reporter.md` MUST land in the same commit as CR-018 — partial-shipped state where the hook writes the new schema but the Reporter still reads flat fields produces silent zero-cost reports. Mitigation: CR-018 acceptance scenario 4 verifies Reporter reads `.delta.*` directly.
- **CR-016 → CR-018 sequencing in `token-ledger.sh`.** Both CRs modify the same hook file; CR-016's dispatch-file read sits at the top of the SubagentStop handler, CR-018's delta wrapper sits around the row-write at the bottom. Reverse order produces a merge conflict. The two cannot run as parallel Developer agents in M3 — they sequence within the same milestone.
- **STORY-015-05 vs PROPOSAL-013 schema overlap.** PROPOSAL-013 §2 defines `last_synced_body_sha` and similar frontmatter fields. STORY-015-05 adds `parent_cleargate_id` / `sprint_cleargate_id`. These are *additive* on both sides — no collision — but the EPIC‑023 architect (at M6) MUST verify the two namespaces stay disjoint when designing the work-item sync v2 schema. Flagged here for M6 reviewer attention.
- **CR-017 templates touch ↔ STORY-015-05.** Both edit the same six template files' frontmatter region. STORY-015-05 lands first (adds `parent_cleargate_id` / `sprint_cleargate_id`); CR-017's `carry_over: false` follows and extends the YAML block. Reverse order produces a merge conflict. Merge ordering in §2.2 is non-negotiable.
- **CR-017 v1 warn-mode at sprint init is deliberate.** SPRINT-15's own kickoff would trip a block-mode reconciler (CR-001 only just got reconciled; SPRINT-14 cohort awaits M0). v1 warn-only at init lets M0 hygiene run; SPRINT-16 init flips to block after one clean SPRINT-15 close. Documented in CR-017 §1 final paragraph.

### 2.4 Lane Audit

| Story | Lane | Rationale (≤80 chars) |
|---|---|---|
| `STORY-015-05` | fast | 6-template doc-only edit; no code, no schema, no auth, deterministic verify |
| `CR-012` | fast | single CLI surface + chat-render string; no schema, no migration |

All other items run `standard`. CR-016 + CR-018 both **not** fast-lane — they sequence on a shared hook file and CR-018 carries a schema change + Reporter contract change.

### 2.5 ADR-Conflict Flags

- **None identified.** PROPOSAL-013's "MCP as authority for state" framing has forward-tension with file-authoritative storage; flagged for M5 (decomposition) reviewer attention but no in-sprint conflict.

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| CR-018 introduces silent zero-cost reports if Reporter not updated in same commit | Acceptance scenario 4 (Reporter reads `.delta.*`) is mandatory; QA verifies on real ledger sample. CR-018's `.claude/agents/reporter.md` edit is in the same commit as the hook delta wrapper. |
| CR-016 + CR-018 split reintroduces "half-broken ledger" risk if only one ships | Both are M3 in same sprint, sequenced. SPRINT-15 close cannot complete with one shipped + one Draft (CR-017's lifecycle reconciler will catch it). 0.9.0 release is gated on both. |
| STORY-020-02 advisory log drifts (false positives) | v1 always exits 0; no gate blocks. Three sprints of corpus before tightening per PROPOSAL-012. |
| CR-017 reconciler false-positives on legitimate bundled commits (e.g., one commit advancing two artifacts) | Multi-ID parser tested explicitly via §4 Scenario 3; punch-list groups by commit SHA so a single bundled commit produces one "stale-companion" warning, not N spurious entries. Layer 3 (per-commit hook) explicitly out of scope to avoid noise here. |
| CR-017 sprint-close block fires legitimately on SPRINT-15 itself if M0 sweep incomplete | SPRINT-15 close runs the reconciler against its own start_date `2026-04-28`. M0 hygiene archives all SPRINT-14 cohort + CR-001 BEFORE `close_sprint.mjs` runs. If M0 is incomplete, sprint cannot close — by design. |
| M0 ghost audit reveals real undelivered work in STORY-003/004/005 | Add to backlog for SPRINT-16; do not expand current sprint scope. |
| PROPOSAL-013 decomp at M6 reveals 5+ sub-epics or L4 stories | Cap EPIC‑023 at the 4 sub-epics named in PROPOSAL-013 §2.5; anything bigger gets its own follow-up proposal. |

## Metrics & Metadata

- **Expected Impact:**
  - Wiki contradictions surfaced advisory in every ingest pass (EPIC-020).
  - Ledger sum-of-rows = real cost within ±5% of Anthropic dashboard (CR-016).
  - 100% of pushed work items in SPRINT-16+ carry hierarchy keys (STORY-015-06).
  - **Lifecycle drift across sprint boundaries goes to zero** — `close_sprint.mjs` blocks on unreconciled artifacts; sprint init warns at kickoff (CR-017). The CR-001 9-day-Draft case becomes structurally impossible.
- **Priority Alignment:** Process refinement first; user-facing UX (EPIC-006 Admin UI, EPIC-021 Solo Onboarding) deferred until process floor is solid.
- **Lane Distribution Target:** 15–20% fast lane (2 of 10 items = 20%).

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** M0 hygiene first. Don't spawn Developer agents until SPRINT-14 archive sweep is done — otherwise the wiki-build during M1 will pick up stale "Approved" statuses on shipped items and corrupt the contradiction baseline.
- **Relevant Context:**
  - PROPOSAL-012 (Approved) is the spec for EPIC-020.
  - PROPOSAL-009 §2.1, §2.2 is the spec for STORY-015-05/-06 (schema half only; UI half deferred).
  - PROPOSAL-013 (Approved 2026-04-28) is the M6 deliverable's source.
  - BUG-021 + BUG-022 (now Abandoned) cite the SPRINT-001 Hakathon ledger as concrete repro evidence for CR-016.
- **Constraints:**
  - **No PROPOSAL-008 work this sprint** (parked behind PROPOSAL-013).
  - **No EPIC-006/EPIC-010 work this sprint** (both deferred indefinitely).
  - **No PROPOSAL-013 / EPIC‑023 work this sprint** — decomposition is between-sprints transition work per CR-017 §26, not a sprint deliverable. Architect performs it post-SPRINT-15 close, pre-SPRINT-16 activation.
  - **No EPIC-016 work this sprint** — deferred to SPRINT-16 per the 2026-04-29 right-sizing decision. STORY-016-* files remain in pending-sync awaiting SPRINT-16 kickoff.
  - **No mid-sprint fast-lane retroactive promotion.** Lane fixed at sprint planning per PROPOSAL-013-Fast-Track §1.3.
  - **CR-016 + Reporter agent change ship in same commit.** Non-negotiable per §2.3.
