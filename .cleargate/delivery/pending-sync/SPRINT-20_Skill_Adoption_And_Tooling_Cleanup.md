---
sprint_id: "SPRINT-20"
parent_cleargate_id: null
sprint_cleargate_id: "SPRINT-20"
carry_over: false
lifecycle_init_mode: "block"
remote_id: null
source_tool: "local"
status: "Draft"
execution_mode: "v2"
start_date: "2026-05-16"
end_date: "2026-05-29"
created_at: "2026-05-02T13:30:00Z"
updated_at: "2026-05-02T13:30:00Z"
created_at_version: "cleargate@0.10.0"
updated_at_version: "cleargate@0.10.0"
context_source: "SPRINT-19 close 2026-05-02 — 13 milestones shipped; SDLC redesign trilogy completed (CR-022 + CR-024 + CR-025 + BUG-024 spike). SPRINT-20 picks up: (1) [[EPIC-026]] Sprint Execution Skill Adoption (drafted 2026-05-02, V-Bounce-style skill auto-load + CLAUDE.md prune); (2) CR-026 token-ledger attribution fix (BUG-024 spike's downstream — diagnosis lived in SPRINT-19, fix lands here, ~100 LOC); (3) [[BUG-025]] PostToolUse stamp hook duplicate `parent_cleargate_id` (orchestrator-diagnosed during SPRINT-19 close 2026-05-02, blocked Gate 4 until manual dedupe applied); plus carry-forward debt from SPRINT-19 REPORT.md §6 (state.json schema for `runtime` lane, prep_reporter_context.mjs canonical mirror, 34 wiki-lint broken-backlinks batch fix, vitest pool-cap follow-up if RAM still tight)."
epics: ["EPIC-026"]
crs: ["CR-026"]
bugs: ["BUG-025"]
proposals: []
approved: false
approved_at: null
approved_by: null
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

# SPRINT-20: Skill Adoption + Tooling Cleanup (Post-SDLC-Trilogy)

## 0. Stakeholder Brief

> Sponsor-readable summary. Pushed to PM tool.

- **Sprint Goal:** Adopt the V-Bounce-style sprint-execution skill as the single source of truth for orchestration (EPIC-026); fix the token-ledger attribution defect that's been Red since SPRINT-15 (CR-026, the BUG-024 spike's follow-on); fix the PostToolUse hook bug that duplicates frontmatter keys (BUG-025); clear SPRINT-19 carry-forward debt.
- **Business Outcome:** Orchestrator behavior becomes deterministic + skill-driven (no more reconstruction-from-fragments at every dispatch); token accounting becomes recoverable per-agent / per-story for the first time since SPRINT-15; close pipeline stops getting jammed by hook-induced YAML corruption; downstream cleargate users get the skill via `cleargate init`.
- **Risks (top 3):** (i) EPIC-026's M2.1 prune of CLAUDE.md is the largest doc surface change since EPIC-024; mid-conversation regression risk if pruning is too aggressive. (ii) CR-026's hook fix touches token-ledger attribution which has been broken since SPRINT-15 — long-tail untested code paths may surface. (iii) BUG-025 dedupe pass touches every CR/Bug/Story/Epic/Sprint file in the corpus; diff noise will be substantial — review batch must be checkpointed.
- **Metrics:** EPIC-026 — CLAUDE.md ≥60-line reduction; SessionStart banner emits load directive on sprint-active; one full sprint executed with skill loaded end-to-end. CR-026 — `token-ledger.jsonl` per-row attribution matches dispatched (work_item, agent) pair >95% of rows for SPRINT-21; zero rows attributed to `BUG-004 / architect` fallback (the canary for the SessionStart-banner-poisoned grep). BUG-025 — `grep -c "^parent_cleargate_id:" .cleargate/delivery/**/*.md | sort -u` returns only `1` (or `0`); regression test asserts hook idempotency.

## 1. Consolidated Deliverables

| Item | Type | Title | Lane | Complexity | Parallel? | Bounce Exposure | Milestone |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [`EPIC-026`](EPIC-026_Sprint_Execution_Skill_Adoption.md) | Epic | Sprint Execution Skill Adoption | standard | L2 | y (Wave 1) | low | M0–M2 (3 stories — see EPIC-026 §2 IN-SCOPE) |
| [`CR-026`](#cr-026-placeholder) | CR | Token-Ledger Attribution Fix (BUG-024 follow-on) | standard | L2 | y (Wave 1) | med | M3 |
| [`BUG-025`](BUG-025_PostToolUse_Duplicates_Parent_Cleargate_Id.md) | Bug | PostToolUse stamp hook duplicates `parent_cleargate_id` | fast | L1 | y (Wave 1) | low | M4 |

**Estimated totals:** 3 anchor items decomposed across ~5 dispatch units (EPIC-026 ships as 3 milestones M1.1/M1.2/M1.3 + M2.1; CR-026 = 1 milestone; BUG-025 = 1 milestone). Complexity: 3×L1 + 2×L2. Lane mix: 1 fast / 4 standard.

**Carry-forward from SPRINT-19 REPORT.md §6 (out of this sprint's scope unless capacity allows):**
- state.json schema update for `runtime` lane (CR-024 introduced lane semantics in M2/M8; schema validation needs to learn it). ~30 LOC, candidate for fast-lane mid-sprint pickup.
- `prep_reporter_context.mjs` canonical mirror (M7 Option B accepted SPRINT-19 deferral). ~470 LOC mechanical copy + MANIFEST regen.
- 34 wiki-lint broken-backlink findings — batch-fix by populating `children:` arrays on epic wiki pages. ~50 LOC across multiple raw EPIC files.
- Reporter bundle 226KB exceeds 160KB cap (advisory in SPRINT-19) — trim sprint-plan §2.2 in-place at next opportunity.

**Wave structure (preliminary — Architect SDR confirms):**

- **Wave 1 — 3 parallel anchors over disjoint surfaces:** EPIC-026 M1 (skill auto-load + canonical mirror) ‖ CR-026 (token-ledger hook + dispatch marker fix) ‖ BUG-025 (stamp hook idempotency + corpus dedupe).
- **Wave 2 — EPIC-026 M2.1 alone:** CLAUDE.md prune (live + canonical). Lands AFTER Wave 1 to avoid touching CLAUDE.md while other anchors run; M2.1 deletes ~60 lines per file, mirror-parity-sensitive.
- **Wave 3 (capacity-permitting):** state.json `runtime` lane schema + carry-forward debt items, picked up if Wave 1+2 finish ahead of schedule.

## 2. Execution Strategy

*(Populated by Architect Sprint Design Review — DEFERRED. SDR runs after the 3 anchor files reach 🟢 in pending-sync, and updates this section in-place before Gate 2.)*

### 2.1 Phase Plan (preliminary)

EPIC-026 has explicit M1.1 / M1.2 / M1.3 / M2.1 milestone breakdown in §2 IN-SCOPE. Wave 1 spawns 3 Developer agents in parallel:
- **EPIC-026 M1 group** (M1.1 SessionStart hook + M1.2 sprint CLI directives + M1.3 canonical skill mirror + prebuild) — single-developer dispatch since the three files are tightly coupled.
- **CR-026** — token-ledger.sh hook fix (PreToolUse:Task hook OR `parent_session_id` lookup — see BUG-024 §3.1 Defect 1) + write_dispatch.sh refactor + settings.json wiring + CLAUDE.md update.
- **BUG-025** — stamp-and-gate.sh idempotency + new `dedupe_frontmatter.mjs` corpus pass.

Wave 2 spawns 1 Developer agent for EPIC-026 M2.1 (CLAUDE.md prune live + canonical) after Wave 1 lands.

### 2.2 Merge Ordering (preliminary)

Files touched by more than one milestone:

| Shared File | Milestones | Merge Order | Rationale |
| --- | --- | --- | --- |
| `CLAUDE.md` (live + canonical) | EPIC-026 M2.1 only | n/a | Wave 2 solo merge. |
| `.claude/hooks/stamp-and-gate.sh` (+ canonical mirror) | BUG-025 only | n/a | Wave 1 solo on this file. |
| `.claude/hooks/token-ledger.sh` (+ canonical mirror) | CR-026 only | n/a | Wave 1 solo. |
| `.claude/hooks/session-start.sh` (+ canonical mirror) | EPIC-026 M1.1 only | n/a | Wave 1 solo. |
| `.cleargate/scripts/write_dispatch.sh` (+ canonical mirror) | CR-026 only | n/a | Wave 1 solo (refactor for the new attribution path). |
| `cleargate-planning/MANIFEST.json` | EPIC-026 M1.3 only (auto-regen) | n/a | Skip — generated by `npm run prebuild`. |

### 2.3 Shared-Surface Warnings (preliminary)

- **EPIC-026 M2.1 + BUG-025 corpus dedupe both touch frontmatter prose surfaces.** M2.1 only edits CLAUDE.md (prose pruning); BUG-025 dedupe touches `.cleargate/delivery/**/*.md` (frontmatter only, not prose). Disjoint regions; no collision risk. Listed for completeness.
- **CR-026 fix may invalidate the BUG-024 spike's "fallback path poisoned by SessionStart banner" assumption.** If CR-026's design uses `parent_session_id` (see BUG-024 §3.1 Q2), the fallback grep path can be removed entirely. Architect M3 plan must decide.

### 2.4 Lane Audit (preliminary)

| Story | Lane | Rationale (≤80 chars) |
| --- | --- | --- |
| BUG-025 (M4) | fast | Hook idempotency one-liner + dedupe script ≤50 LOC; no schema change |

EPIC-026 stories and CR-026 are `lane: standard`. Architect SDR confirms via 7-check rubric.

### 2.5 ADR-Conflict Flags (preliminary)

- **None blocking.** SPRINT-20's design lives within established invariants (mirror-parity, file-surface contract, real-infra-no-mocks, archive-immutability §11.4).
- **Soft flag (informational):** EPIC-026 M2.1 deletes ~60 lines from CLAUDE.md. The ClearGate convention is "CLAUDE.md is always-on context for the conversational agent" — the prune relies on the skill auto-loading reliably (EPIC-026 §3 acknowledges this is advisory, not contractually forced). Mitigation: M2.1 retains explicit one-liner pointers to the skill so the orchestrator can find it from the always-on surface even if auto-load misses.
- **Soft flag (informational):** CR-026 fix may touch settings.json (PreToolUse:Task hook wiring). Settings changes should not be auto-applied to user repos — flag in MANIFEST as `overwrite_policy: preserve-on-conflict` or equivalent. Architect M3 plan to confirm.

## 3. Risks & Dependencies

| Risk | Mitigation |
| --- | --- |
| **EPIC-026 M2.1 prune is the largest CLAUDE.md change since EPIC-024.** Mid-conversation regression if the orchestrator can no longer find dispatch-marker syntax in the always-on surface. | M2.1 retains an explicit one-liner pointer to the skill. EPIC-026 §6 Q3 confirms "when banner says Load skill X, invoke Skill tool" rule is added to the post-prune CLAUDE.md as the contract. Smoke-test with a real dispatch in Wave 2 acceptance. |
| **CR-026 fix touches the long-Red token-ledger.** Tests may surface untested code paths from SPRINT-15+ era. | Real-infra integration test. Verify SPRINT-21 ledger attribution >95% correct (success metric). If <95%, file follow-up CR for SPRINT-21. |
| **BUG-025 corpus dedupe pass produces large diff.** All `.cleargate/delivery/**/*.md` files edited since SPRINT-15+ era are suspect. Review batch may be unwieldy. | Dedupe script idempotent — run once, commit as a single chore commit, gate with `git diff --stat` review. Hook fix MUST land first; corpus dedupe second; otherwise re-edits re-introduce duplicates. |
| **Token-ledger Red that has carried since SPRINT-15.** Per BUG-024 §3, three concrete defects (session-id mismatch + transcript-grep banner poison + manual write_dispatch unreliable). CR-026 must address all three OR explicitly defer. | CR-026 spec must enumerate which of BUG-024's three defects ship in SPRINT-20 vs deferred. Architect M3 plan decides. |
| **EPIC-026's auto-load directive is advisory, not contractually forced** (per EPIC-026 §3). The orchestrator must read the SessionStart banner and explicitly invoke `Skill(sprint-execution)`. | M2.1 prune adds an explicit "when banner says Load skill X" rule to CLAUDE.md (per EPIC-026 §6 Q3). Smoke-test verifies the orchestrator follows the rule. |
| **Pre-existing admin/+mcp/ vitest failures** (5-7 files; mcp/ subrepo absent in worktrees). Carried forward from SPRINT-15+. | Out of scope. Track in REPORT.md §6 as carry-over. Surface as candidate for a SPRINT-21 infra-cleanup hotfix if not already covered. |
| **Vitest pool-cap may need further tightening** if SPRINT-20 dispatches >2 parallel Wave 1 agents on a memory-tight laptop. SPRINT-19 set maxForks=2 in vitest.config.ts; user reported computer-RAM concerns mid-sprint. | Default cap holds for ≤2 simultaneous test runs. If Wave 1 dispatches 3 agents, orchestrator either drops to VITEST_MAX_FORKS=1 or serializes the third. Document the pattern in EPIC-026's skill §1 wall-clock budget table. |

## 4. Execution Log

_(Populated by orchestrator + Reporter during sprint execution. Empty at draft time.)_

| Date | Event Type | Description |
| --- | --- | --- |

## 5. Metrics & Metadata

- **Expected Impact:** Orchestrator behavior becomes deterministic + skill-driven; per-agent / per-story cost accounting becomes recoverable for the first time since SPRINT-15; close pipeline stops jamming on hook-induced YAML corruption; downstream cleargate users get a single playbook entry point via `cleargate init`. Closes the highest-leverage tooling debt items from SPRINT-15→19.
- **Priority Alignment:** Direct user ask 2026-05-02 — adopt V-Bounce SKILL pattern. SDLC charter §2.4 trilogy is now closed (SPRINT-19 shipped); SPRINT-20 is the first sprint of the post-trilogy phase, focusing on tooling polish + skill adoption before the next product feature wave (Admin UI / Multi-Participant MCP Sync / etc.).
- **Outstanding from SPRINT-19** (carry-forward to §6 Tooling, picked up here if capacity allows): state.json schema for `runtime` lane; prep_reporter_context.mjs canonical mirror; 34 wiki-lint broken-backlinks batch fix; Reporter bundle 226KB cap-exceedance; pre-existing admin/+mcp/ vitest failures.

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** Wave 1 spawns 3 Developer agents in parallel (EPIC-026 M1, CR-026, BUG-025). Each Developer reads its anchor file + the corresponding M1/M3/M4 milestone plan from `.cleargate/sprint-runs/SPRINT-20/plans/`. EPIC-026 M2.1 (CLAUDE.md prune) waits for Wave 1 merge.
- **Relevant Context:** EPIC-026's `<agent_context>` block in §0 is the authoritative scope spec. BUG-024 §3 is the authoritative defect catalog for CR-026. BUG-025 §1-§2 is the authoritative repro for the hook idempotency fix.
- **Constraints:**
  - No CLAUDE.md changes outside CLEARGATE-tag-block region (live).
  - Mirror parity per-edit, not state-parity (FLASHCARD `2026-04-19 #wiki #protocol #mirror`).
  - Real infra, no mocks for hook fixture tests.
  - Vitest cap is in vitest.config.ts (maxForks=2). Override via VITEST_MAX_FORKS env. CLI flag `--pool-options.forks.maxForks=N` collides with tinypool (FLASHCARD `2026-05-02 #vitest #ram #pool`).
  - `npm run prebuild` MUST run after canonical-skill changes in EPIC-026 M1.3 (FLASHCARD `2026-05-01 #scaffold #mirror #prebuild`).
  - DoD §4.1 test counts ENFORCED, not advisory (SPRINT-19 lesson).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Yellow — pending Architect SDR + 3 anchor 🟢-confirmation**

Requirements to pass to Green (Gate 2 — Sprint Ready):
- [x] All 3 anchor items decomposed and linked in §1 (EPIC-026 has milestone breakdown; CR-026 needs drafting; BUG-025 ready).
- [x] Sprint Goal articulated (§0 Stakeholder Brief).
- [x] Wave structure preview present (§1).
- [ ] **CR-026 file drafted** in `pending-sync/CR-026_Token_Ledger_Attribution_Fix.md`. Currently a placeholder anchor in §1 — needs spec following BUG-024 §3 defect catalog.
- [ ] **Architect SDR** populates §§2.1-2.5 (DEFERRED to post-approval; updates this section in-place before Gate 2).
- [x] Risks enumerated with mitigations (§3).
- [ ] All anchors at 🟢: EPIC-026 ✅, BUG-025 ✅, CR-026 needs drafting + 🟢 review.
- [ ] Sprint Execution Gate (Gate 3) preflight will run before Ready → Active transition (post-approval).
