---
sprint_id: "SPRINT-20"
parent_cleargate_id: null
sprint_cleargate_id: "SPRINT-20"
carry_over: false
lifecycle_init_mode: "block"
remote_id: null
source_tool: "local"
status: "Completed"
execution_mode: "v2"
start_date: "2026-05-16"
end_date: "2026-05-29"
created_at: "2026-05-02T13:30:00Z"
updated_at: "2026-05-02T13:30:00Z"
created_at_version: "cleargate@0.10.0"
updated_at_version: "cleargate@0.10.0"
context_source: "SPRINT-19 close 2026-05-02 — 13 milestones shipped; SDLC redesign trilogy completed (CR-022 + CR-024 + CR-025 + BUG-024 spike). SPRINT-20 picks up: (1) [[EPIC-026]] Sprint Execution Skill Adoption (drafted 2026-05-02, V-Bounce-style skill auto-load + CLAUDE.md prune); (2) CR-026 token-ledger attribution fix (BUG-024 spike's downstream — diagnosis lived in SPRINT-19, fix lands here, ~100 LOC); (3) [[BUG-025]] PostToolUse stamp hook duplicate `parent_cleargate_id` (orchestrator-diagnosed during SPRINT-19 close 2026-05-02, blocked Gate 4 until manual dedupe applied); plus carry-forward debt from SPRINT-19 REPORT.md §6 (state.json schema for `runtime` lane, prep_reporter_context.mjs canonical mirror, 34 wiki-lint broken-backlinks batch fix, vitest pool-cap follow-up if RAM still tight)."
epics: ["EPIC-026"]
stories: ["STORY-026-01", "STORY-026-02"]
crs: ["CR-026", "CR-027", "CR-028"]
bugs: ["BUG-025"]
proposals: []
approved: true
approved_at: "2026-05-02T14:00:00Z"
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

# SPRINT-20: Skill Adoption + Tooling Cleanup (Post-SDLC-Trilogy)

## 0. Stakeholder Brief

> Sponsor-readable summary. Pushed to PM tool.

- **Sprint Goal:** Adopt the V-Bounce-style sprint-execution skill as the single source of truth for orchestration (EPIC-026); fix the token-ledger attribution defect that's been Red since SPRINT-15 (CR-026); fix the PostToolUse hook bug that duplicates frontmatter keys (BUG-025); raise the planning-quality bar with composite per-item readiness gates at preflight + new Discovery/Risk criteria (CR-027); codify the code-truth triage principle (Reuse / Right-Size / Justify-Complexity) as protocol + template + predicate edits (CR-028); clear SPRINT-19 carry-forward debt.
- **Business Outcome:** Orchestrator behavior becomes deterministic + skill-driven; per-agent / per-story token accounting becomes recoverable for the first time since SPRINT-15; close pipeline stops jamming on hook-induced YAML corruption; sprint preflight starts validating the *content* of in-scope work items (not just environment health) and fires Discovery + Risk + Reuse + Right-Size + Justify-Complexity gates that were absent from the predicate set; downstream cleargate users get the skill + the new principle stack via `cleargate init`.
- **Risks (top 3):** (i) STORY-026-02's CLAUDE.md prune is the largest doc-surface change since EPIC-024 AND collides with CR-027/CR-028 CLAUDE.md edits — merge ordering critical (Wave-3-last). (ii) CR-026's hook fix touches token-ledger attribution which has been broken since SPRINT-15 — long-tail untested code paths may surface. (iii) CR-027 + CR-028 expand the readiness-gate predicate set; pre-existing drafts in `pending-sync/` may newly fail under v2 — one-cycle backfill window enabled by v1-warn-only fallback per CR-014's severity model.
- **Metrics:** EPIC-026 — CLAUDE.md ≥60-line reduction; SessionStart banner emits load directive on sprint-active; one full sprint executed with skill loaded end-to-end. CR-026 — `token-ledger.jsonl` per-row attribution matches dispatched (work_item, agent) pair >95% of rows for SPRINT-21; zero rows attributed to `BUG-004 / architect` fallback. BUG-025 — `grep -c "^parent_cleargate_id:" .cleargate/delivery/**/*.md` returns ≤1 per file; regression test asserts hook idempotency. CR-027 — `cleargate sprint preflight` runs all five checks; on a v2 sprint with one in-scope item failing gate, preflight exits 1 and names the item + failing criteria. CR-028 — fresh draft from `templates/{epic,story,CR}.md` produces a body containing both `## Why not simpler?` and `## Existing Surfaces` headings; gate check fires `simplest-form-justified` + `reuse-audit-recorded` on fixtures missing the sections.

## 1. Consolidated Deliverables

| Item | Type | Title | Lane | Complexity | Parallel? | Bounce Exposure | Milestone |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [`EPIC-026`](EPIC-026_Sprint_Execution_Skill_Adoption.md) | Epic | Sprint Execution Skill Adoption | standard | L2 | y (Wave 1+3) | low | M1 + M2 |
| → [`STORY-026-01`](STORY-026-01_Skill_Auto_Load_And_Mirror.md) | Story | Skill Auto-Load + Canonical Mirror (M1.1+M1.2+M1.3) | standard | L2 | y (Wave 1) | low | M1 |
| → [`STORY-026-02`](STORY-026-02_CLAUDE_Md_Prune.md) | Story | CLAUDE.md Prune (M2.1) | standard | L1 | n (Wave 3) | low | M2 |
| [`CR-026`](CR-026_Token_Ledger_Attribution_Fix.md) | CR | Token-Ledger Attribution Fix (BUG-024 follow-on) | standard | L2 | y (Wave 1) | med | M3 |
| [`CR-027`](CR-027_Composite_Planning_Readiness_At_Sprint_Preflight.md) | CR | Composite Planning Readiness — preflight check #5 + Discovery/Risk criteria | standard | L2 | y (Wave 2) | med | M5 |
| [`CR-028`](CR-028_Code_Truth_Triage_Reuse_Right_Size_Justify.md) | CR | Code-Truth Triage — Reuse + Right-Size + Justify-Complexity | standard | L1 | y (Wave 2) | low | M6 |
| [`BUG-025`](BUG-025_PostToolUse_Duplicates_Parent_Cleargate_Id.md) | Bug | PostToolUse stamp hook duplicates `parent_cleargate_id` | fast | L1 | y (Wave 1) | low | M4 |

**Estimated totals:** 6 dispatch units across 6 anchor files (1 Epic decomposed into 2 Stories + 3 CRs + 1 Bug). Complexity: 3×L1 + 3×L2. Lane mix: 1 fast / 5 standard. Wave 1 = 3 parallel dev dispatches over disjoint hook + ledger + corpus surfaces; Wave 2 = 2 parallel dev dispatches over readiness-gate + protocol + template surfaces (with explicit merge ordering on `readiness-gates.md` + CLAUDE.md regions); Wave 3 = 1 sequential dispatch (STORY-026-02 lands LAST so its CLAUDE.md prune cleans up post-CR-027/CR-028 state).

**Carry-forward from SPRINT-19 REPORT.md §6 (out of this sprint's scope unless capacity allows):**
- state.json schema update for `runtime` lane (CR-024 introduced lane semantics in M2/M8; schema validation needs to learn it). ~30 LOC, candidate for fast-lane mid-sprint pickup.
- `prep_reporter_context.mjs` canonical mirror (M7 Option B accepted SPRINT-19 deferral). ~470 LOC mechanical copy + MANIFEST regen.
- 34 wiki-lint broken-backlink findings — batch-fix by populating `children:` arrays on epic wiki pages. ~50 LOC across multiple raw EPIC files.
- Reporter bundle 226KB exceeds 160KB cap (advisory in SPRINT-19) — trim sprint-plan §2.2 in-place at next opportunity.

**Wave structure (preliminary — Architect SDR confirms):**

- **Wave 1 — 3 parallel anchors over disjoint hook/ledger/corpus surfaces:** STORY-026-01 (skill auto-load + canonical mirror) ‖ CR-026 (token-ledger hook + dispatch marker fix) ‖ BUG-025 (stamp hook idempotency + corpus dedupe).
- **Wave 2 — 2 parallel anchors over disjoint readiness-gate / protocol / template surfaces:** CR-027 (composite preflight gate + Discovery/Risk criteria) ‖ CR-028 (code-truth principle stack + Reuse/Justify criteria). Both touch `readiness-gates.md` (different gate entries) and `CLAUDE.md` (different regions — CR-027 edits the "Sprint Execution Gate" paragraph, CR-028 inserts after "Triage first" / extends "Duplicate check"). Merge ordering: CR-027 first, CR-028 second on rebase. Wave 2 starts after Wave 1 fully merges to avoid stacking CLAUDE.md pressure.
- **Wave 3 — STORY-026-02 alone:** CLAUDE.md prune (live + canonical). Lands LAST so its prune is the *final* CLAUDE.md edit, cleaning up post-CR-027/CR-028 state. Deletes ~60 lines per file; mirror-parity-sensitive. Note: CR-027's "five checks" content lives in the sprint-execution skill (canonical post-prune); CR-028's "Codebase is source of truth" line is preserved (always-on triage rule, outside the prune surface).
- **Wave 4 (capacity-permitting):** state.json `runtime` lane schema + carry-forward debt items, picked up if Waves 1–3 finish ahead of schedule.

## 2. Execution Strategy

### 2.1 Phase Plan

Three waves confirmed. The 3-wave structure is correct; collapsing Wave 2 into Wave 1 is unsafe because both CR-027 and CR-028 touch CLAUDE.md and `cleargate-planning/CLAUDE.md`, and parallel CLAUDE.md edits in a single wave would force the Developer agents into manual conflict resolution on the bounded `<!-- CLEARGATE:START -->...<!-- CLEARGATE:END -->` block.

**Wave 1 — 3 parallel Developer dispatches over disjoint surfaces:**
- **STORY-026-01** (M1) — SessionStart hook + sprint CLI directives + canonical skill mirror creation + `npm run prebuild`. Single-developer dispatch since the three surfaces are tightly coupled (the testable outcome — "skill auto-loads on sprint-active sessions" — requires all three). **Critical:** STORY-026-01 R5 creates `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` (verified absent today via `ls`); this dir must exist before CR-027's M5 plan adds a per-edit mirror-parity edit there. **Wave-1-must-finish gate** for the skill update CR-027 ships in Wave 2.
- **CR-026** (M3) — token-ledger.sh hook fix (`parent_session_id` lookup or newest-file fallback per BUG-024 §3.1 Defect 1) + new PreToolUse:Task hook (~30-40 LOC) + write_dispatch.sh refactor + settings.json wiring + CLAUDE.md "Orchestrator Dispatch Convention" paragraph update. Disjoint from STORY-026-01 surface (different hooks; different CLAUDE.md region — CR-026 edits dispatch-convention paragraph, STORY-026-01 doesn't touch CLAUDE.md prose).
- **BUG-025** (M4) — `cleargate stamp-tokens` CLI command idempotency fix (the bash hook `stamp-and-gate.sh` is a wrapper that shells to `cleargate stamp-tokens`; the producer-side defect lives in the TS handler, not the bash hook — verified by Read of `.claude/hooks/stamp-and-gate.sh`) + new `dedupe_frontmatter.mjs` corpus pass. Disjoint from STORY-026-01 + CR-026.

**Wave 2 — 2 parallel Developer dispatches after Wave 1 fully merges:**
- **CR-027** (M5) — extend `sprintPreflightHandler` (verified at `cleargate-cli/src/commands/sprint.ts:1075`) with check #5 + add `discovery-checked` to 4 enforcing gate types + new `sprint.ready-for-execution` gate with `risk-table-populated`. Touches `readiness-gates.md` (live + canonical), `cleargate-protocol.md` (Gate 3 section, live + canonical), CLAUDE.md "Sprint Execution Gate" paragraph (live + canonical), AND `.claude/skills/sprint-execution/SKILL.md` + `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` (per §2.5 Hard-flag resolution — the skill file already has `### A.1 Sprint Execution Gate (Gate 3) — preflight` at line 110, ready to receive the "five checks" edit). **REQUIRED CR-027 §3 amendment:** the Architect's M5 milestone plan MUST list the live + canonical skill files in CR-027's modify-list; the current CR-027 §3 omits the skill (verified by `grep -i skill CR-027*.md` → zero hits). Resolution path: M5 plan adds them.
- **CR-028** (M6) — protocol §0 Code-Truth Principle insertion + CLAUDE.md "Codebase is source of truth" line + `Why not simpler?` / `Existing Surfaces` template additions across `templates/{story,epic,CR}.md` + 2 new readiness criteria (`reuse-audit-recorded`, `simplest-form-justified`) + SPRINT-20-anchor backfill commit (see §2.3). 13 mirrored files + 4 fixture files.

**Wave 3 — 1 Developer dispatch after Wave 2 fully merges:**
- **STORY-026-02** (M2) — CLAUDE.md prune live + canonical. Removes the four-agent-loop / Sprint-Execution-Gate / Architect-runs-twice prose; preserves the new R3 "Skill auto-load directive" rule. Net delete ≥60 lines per file. Mirror-parity-sensitive.

### 2.2 Merge Ordering

Files touched by more than one milestone, with line-level conflict resolution:

| Shared File | Milestones | Merge Order | Rationale (line-level) |
| --- | --- | --- | --- |
| `CLAUDE.md` (live + canonical) | CR-026 + CR-027 + CR-028 + STORY-026-02 | CR-026 (W1) → CR-027 + CR-028 (W2, parallel — different regions) → STORY-026-02 (W3, prune) | CR-026 edits the "Orchestrator Dispatch Convention" paragraph (CLEARGATE-block, verified present). CR-027 edits the "Sprint Execution Gate" paragraph. CR-028 inserts a new "Codebase is source of truth" bullet between "Triage first" and "Duplicate check" + extends the "Duplicate check" paragraph. STORY-026-02 prunes the four-agent-loop block + dispatch-convention paragraph + Sprint-Execution-Gate paragraph + Architect-runs-twice paragraph last. CR-026's region is part of the prune surface — its content moves to the skill in W1 (via STORY-026-01 R5 byte-copy of the live skill, which already documents dispatch conventions in §1). CR-028's "Codebase is source of truth" insertion lands OUTSIDE the prune surface and survives. CR-027's "five checks" content survives via the skill update (resolution: §2.5 Hard-flag). |
| `.cleargate/knowledge/readiness-gates.md` (+ canonical mirror) | CR-027 + CR-028 | CR-027 first, CR-028 rebases | CR-027 adds `discovery-checked` to 4 enforcing types + new `sprint.ready-for-execution` gate. CR-028 adds `reuse-audit-recorded` to 3 enforcing types + `simplest-form-justified` to 2 enforcing types. Different criterion IDs, different gate entries; merge cleanly with rebase awareness. |
| `.cleargate/knowledge/cleargate-protocol.md` (+ canonical mirror) | CR-027 + CR-028 | parallel — different sections | CR-027 updates Gate 3 / Sprint Execution Gate section (lists fifth check) — verified Gate 3 at line ~104. CR-028 inserts new pre-§0 "Code-Truth Principle" block (see §2.5 escalated flag — the existing `## 0. The Five Phases` lives at line 7; CR-028 must insert as a NEW pre-§0 preamble, NOT renumber existing §0). Disjoint regions; safe to parallel. |
| `.claude/skills/sprint-execution/SKILL.md` (live, 24KB; canonical = NEW via STORY-026-01 R5) | STORY-026-01 (W1, byte-copy) + CR-027 (W2, "five checks" edit) | STORY-026-01 first (creates canonical mirror); CR-027 edits live AFTER mirror exists, then mirrors live→canonical via per-edit invariant + `npm run prebuild` | STORY-026-01 R5 copies live → canonical byte-for-byte. CR-027 then edits §A.1 (line ~110, verified) in BOTH live AND canonical (mirror parity per FLASHCARD `2026-05-01 #scaffold #mirror #prebuild`). Order is non-negotiable: if CR-027 ships first, the canonical edit target doesn't exist. **Wave 1 → Wave 2 sequencing enforces this.** |
| `.claude/hooks/stamp-and-gate.sh` (+ canonical mirror) | BUG-025 (audit-only — see Wave 1 §2.1) | n/a | The bash hook is a wrapper for `cleargate stamp-tokens`; the actual idempotency defect is in the CLI command (TS handler). BUG-025 §4 already lists `cleargate-cli/src/commands/` as the audit target. Solo edit. |
| `.claude/hooks/token-ledger.sh` (+ canonical mirror) | CR-026 only | n/a | Wave 1 solo. |
| `.claude/hooks/session-start.sh` (+ canonical mirror) | STORY-026-01 only | n/a | Wave 1 solo. |
| `.claude/hooks/pre-tool-use-task.sh` (NEW + canonical mirror) | CR-026 only | n/a | Wave 1 solo — net-new file. Make executable post-write (FLASHCARD `2026-04-08 #init #scaffold #hook-exec-bit`). |
| `.cleargate/scripts/write_dispatch.sh` (+ canonical mirror) | CR-026 only | n/a | Wave 1 solo (refactor for the new attribution path). |
| `cleargate-planning/MANIFEST.json` | STORY-026-01 + CR-026 + CR-028 (auto-regen via `npm run prebuild`) | post-merge prebuild after each wave | Auto-generated. Run `npm run prebuild` in `cleargate-cli/` after each wave's canonical-skill / template / mirror file edits. CR-027 doesn't add scaffold files (only edits existing readiness-gates + protocol + skill mirrors — those mirrors regenerate via prebuild too). |
| `.claude/settings.json` (+ canonical mirror if present) | CR-026 only | n/a | Wave 1 solo (PreToolUse:Task hook wiring). Tag MANIFEST entry `overwrite_policy: preserve-on-conflict` for downstream user repos (§2.5 Soft flag). |
| `cleargate-cli/src/commands/sprint.ts` | STORY-026-01 (W1) + CR-027 (W2) | STORY-026-01 first, CR-027 rebases | STORY-026-01 emits load directives in `sprintInitHandler` (verified at line 91, `init_sprint.mjs` invocation at line 234) AND `sprintPreflightHandler` (verified at line 1075, success-path `stdoutFn` at line 1051). CR-027 extends `sprintPreflightHandler` with check #5 (different region of the same handler — checks array at line 1098-1103 is the insertion point). Different functions / different regions of the same handler; rebase is safe. |
| `.cleargate/templates/{story,epic,CR}.md` (+ canonical mirrors) | CR-028 only | n/a | Wave 2 solo on templates. |
| `.cleargate/scripts/assert_story_files.mjs` (+ canonical mirror) | CR-027 only | n/a | Wave 2 solo. **Verified:** `extractWorkItemIds` (line 74) and `findWorkItemFile` (line 90) exist as plain `function` declarations — NOT exported. CR-027's M5 plan must EITHER add `export` keywords + a TS wrapper OR shell out to the mjs script from `sprint.ts` and parse stdout (see §2.3 warning). |
| `cleargate-cli/test/lib/readiness-predicates.test.ts` | CR-028 only | n/a | Wave 2 solo (4 new vitest scenarios). |
| `cleargate-cli/test/commands/sprint-preflight.test.ts` | CR-027 only | n/a | Wave 2 solo (6 new scenarios). |
| `.cleargate/delivery/pending-sync/{EPIC-026,STORY-026-01,STORY-026-02,CR-026,CR-027,CR-028}.md` (frontmatter only) | BUG-025 (corpus dedupe) + CR-028 (anchor backfill) | BUG-025 first (W1) → CR-028 rebase (W2) | BUG-025's `dedupe_frontmatter.mjs` runs across all `.cleargate/delivery/**/*.md` and removes duplicate `parent_cleargate_id:` lines (frontmatter only). CR-028's anchor backfill adds `## Existing Surfaces` + `## Why not simpler?` sections (body only). Disjoint regions of the same files; no line-level conflict. |

### 2.3 Shared-Surface Warnings

- **CR-027/STORY-026-02 CLAUDE.md collision (verification status: feasibility CONFIRMED).** Live skill exists at `.claude/skills/sprint-execution/SKILL.md` (verified by `ls`, 24499 bytes) AND has a Sprint Execution Gate section ready to receive the "five checks" edit at line 110 (`### A.1 Sprint Execution Gate (Gate 3) — preflight`, verified by grep). Canonical mirror is missing today (`cleargate-planning/.claude/skills/sprint-execution/` absent — verified by `ls`); STORY-026-01 R5 creates it in Wave 1. **Resolution requires CR-027 §3 to list the skill file in its modify-list.** Verified by `grep -i skill .../CR-027*.md` → zero hits. The Architect's M5 milestone plan (the SECOND Architect run, not this SDR) MUST add `.claude/skills/sprint-execution/SKILL.md` AND `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` to CR-027's surface list, with the `### A.1` section receiving the "five checks" content. Without that addition, CR-027's CLAUDE.md "five checks" edit gets pruned to nothing in Wave 3.
- **CR-028 SPRINT-20 anchor backfill (verification status: explicit list).** CR-028 adds `## Existing Surfaces` + `## Why not simpler?` sections to templates. Pre-existing SPRINT-20 anchor files would newly fail `reuse-audit-recorded` + `simplest-form-justified` under v2 unless backfilled. Backfill list (in CR-028's M6 commit): EPIC-026, STORY-026-01, STORY-026-02, CR-026 (apply both sections); CR-027 + CR-028 (already meta-aware — verify and add if missing); BUG-025 (apply NEITHER — Bugs are exempted from `simplest-form-justified` per CR-028 §0.5 Q2; `reuse-audit-recorded` is also not on the bug gate per CR-028 §3 readiness-gates surface list). Net: 4 anchors get both sections; 2 anchors are verified meta-aware; 1 anchor is exempted.
- **`assert_story_files.mjs` exports missing (NEW warning surfaced this SDR).** CR-027 §3 says "Reuse the existing `extractWorkItemIds` + `findWorkItemFile` helpers" but verified those are unexported `function` declarations (line 74, line 90). M5 milestone plan must decide: (a) add `export` to the mjs + import via `child_process` + JSON-stdout protocol from `sprint.ts`, OR (b) extract the helpers to `cleargate-cli/src/lib/work-item-extractor.ts` (TS) and refactor the mjs to import from the TS lib via a `createRequire` shim. Option (b) is the protocol-§24-aligned single-source-of-truth path; option (a) is the smaller-diff path. Architect M5 plan decides; the choice affects M5's LOC estimate (option b = ~80 LOC extraction + 2 callsites updated; option a = ~30 LOC).
- **BUG-025 actual defect lives in the CLI command, NOT the bash hook (NEW warning surfaced this SDR).** Verified by `Read .claude/hooks/stamp-and-gate.sh` (32 lines): the hook shells to `cleargate stamp-tokens "$FILE"` and the bash itself never writes `parent_cleargate_id`. The producer-side defect is in the `stamp-tokens` TS handler under `cleargate-cli/src/commands/`. BUG-025 §4 already lists `.cleargate/scripts/stamp_*.{mjs,sh}` as audit candidates — the M4 milestone plan should expand the audit surface to include the `cleargate stamp-tokens` TS handler as the primary suspect.
- **CR-027 + CR-028 backfill window for pre-existing pending-sync drafts (severity model).** Per CR-014's posture: v2 hard-blocks, v1 warns. SPRINT-20 is `execution_mode: v2`. Pre-existing drafts in `pending-sync/` may newly fail `discovery-checked` (if `context_source: null` — verified all SPRINT-20 anchors have non-null `context_source`); `reuse-audit-recorded` (no `## Existing Surfaces` section — backfill commit handles); `simplest-form-justified` (no `## Why not simpler?` section — backfill commit handles). Backfill must complete inside Wave 2 (CR-028's commit) before any Wave 3 preflight rerun would trip the new criteria.
- **Vitest pool-cap parallelism constraint (FLASHCARD `2026-05-02 #vitest #ram #parallel-agents`).** The cap is per-process: 3 Wave-1 agents × maxForks=2 = 6 forks ≈ 2.4GB. On tight-RAM laptops, set `VITEST_MAX_FORKS=1` for Wave 1 OR serialize the third agent. Wave 2 has 2 agents — within budget. Surface this in the orchestrator's pre-Wave-1 dispatch decision.

### 2.4 Lane Audit

7-check rubric applied per protocol §24. Any single false flips a story to `standard`. Lane decisions:

| Story | Lane | Rationale (≤80 chars) |
| --- | --- | --- |
| STORY-026-01 (M1) | standard | 6 files (hooks×2 + sprint.ts + skill mirror + MANIFEST + tests); over cap |
| STORY-026-02 (M2) | standard | 5 Gherkin scenarios + multi-paragraph prune; single-scenario rule fails |
| CR-026 (M3) | standard | settings.json (config-schema-adjacent forbidden surface) + ~100 LOC |
| BUG-025 (M4) | fast | Hook idempotency ≤30 LOC + dedupe script ≤50 LOC; corpus diff is auto-generated (not counted toward cap per protocol §24 check #1); 1 repro scenario; no forbidden surface; existing tests cover the corpus shape |
| CR-027 (M5) | standard | 8+ mirrored files + new test file + skill update; far over file cap |
| CR-028 (M6) | standard | 13 mirrored files + 4 fixtures; SDR considered fast-downgrade and rejected (file count + 4 new test scenarios trip cap + single-scenario rule) |

**Re-confirmation BUG-025 fast:** all 7 checks pass. Size cap (≤2 files, ≤50 LOC for runtime change) met if the corpus dedupe diff is treated as a generated artifact (the dedupe SCRIPT itself is the runtime code, ≤50 LOC). No forbidden surface (hooks not in §24 forbidden list; CLI handler edit is bug-fix-shaped). No new dependency. Single repro scenario. Existing tests under `cleargate-cli/test/hooks/` cover stamp-tokens handler. `expected_bounce_exposure: low`. No epic-spanning subsystem (single bug, single subsystem).

**SDR reconsidered CR-028 borderline-fast and rejected:** file count (13 mirrored docs) trips check #1 size cap; 4 new vitest scenarios trip check #4 single-acceptance-scenario rule; touches `readiness-predicates.test.ts` which is engine-adjacent. Stays `standard`.

### 2.5 ADR-Conflict Flags

- **HARD flag — RESOLVED-VIA-M5-PLAN (CR-027/STORY-026-02 CLAUDE.md collision).** CR-027 wants to update "four checks" → "five checks" in CLAUDE.md "Sprint Execution Gate" paragraph; STORY-026-02 prunes the entire paragraph. Resolution feasibility VERIFIED this SDR: live skill exists, has `### A.1 Sprint Execution Gate (Gate 3) — preflight` section ready, canonical mirror is created by STORY-026-01 R5 in Wave 1. **CR-027 §3 currently omits the skill file from its modify-list (verified — zero `skill` hits in CR-027 body).** Resolution: the Architect's M5 milestone plan (separate run, pre-Wave-2 dispatch) MUST add both live + canonical skill files to CR-027's surface list with the "five checks" edit landing in `### A.1`. Mark the resolution as a Wave-2-dispatch precondition: orchestrator MUST verify the M5 plan includes the skill files before launching CR-027's Developer agent.

- **HARD flag — REQUIRES-CR-028-M6-PLAN-DECISION (protocol §0 insertion semantics).** Verified by Read of `.cleargate/knowledge/cleargate-protocol.md` line 7: there is ALREADY a `## 0. The Five Phases` section. CR-028 §3 says "insert new §0 'Code-Truth Principle' block at top, ahead of Gate definitions." This is ambiguous — it could mean: (a) renumber existing §0 → §1, §1 → §2, etc. (cascading shift across 161 numeric `protocol §N` refs in the live tree, including the 12-row mapping table at `cleargate-enforcement.md:9-20`), OR (b) insert a NEW pre-§0 preamble (e.g., as an unnumbered "Principle" preamble before `## 0. The Five Phases`), preserving all existing §-numbers. CR-028's M6 milestone plan MUST specify (b) — the unnumbered-preamble insertion — and explicitly state "no existing §-numbers shift." If the developer interprets this as (a), 161 ref sites cascade-break. Per FLASHCARD `2026-04-21 #protocol #section-numbering`. Architect M6 plan must enforce option (b) and add a §-numbering-stability assertion to verification (`grep -c "## [0-9]" .cleargate/knowledge/cleargate-protocol.md` count unchanged pre/post).

- **SOFT flag (informational) — settings.json overwrite policy.** CR-026's PreToolUse:Task hook wiring touches `.claude/settings.json`. Settings changes should not be auto-applied to user repos — flag the new MANIFEST entry as `overwrite_policy: preserve-on-conflict` (existing protocol §13.2 vocabulary). Architect M3 plan to specify the overwrite_policy literal.

- **SOFT flag (resolved-by-backfill-commit) — CR-027 + CR-028 new readiness criteria.** Pre-existing SPRINT-20 anchor files would newly fail under v2. Resolution: CR-028's M6 commit includes the explicit anchor backfill (§2.3 list). EPIC-026/STORY-026-01/STORY-026-02/CR-026 get both sections appended; BUG-025 is exempted; CR-027/CR-028 already meta-aware. `discovery-checked` already passes for all SPRINT-20 anchors (`context_source` populated). `risk-table-populated` already passes for SPRINT-20 (§3 has the `| Mitigation` header).

- **SOFT flag (informational) — STORY-026-02 advisory auto-load.** EPIC-026 §3 acknowledges "skill auto-load directive is advisory, not contractually forced." STORY-026-02's prune relies on the skill loading reliably AND on the orchestrator reading the new R3 always-on rule ("when banner says Load skill X, invoke Skill tool"). Mitigation: R3 + STORY-026-01 R1's banner emit are the joint contract. Smoke-test in §2.2 by inspecting one full Task() spawn after the prune.

## 3. Risks & Dependencies

| Risk | Mitigation |
| --- | --- |
| **STORY-026-02 prune is the largest CLAUDE.md change since EPIC-024.** Mid-conversation regression if the orchestrator can no longer find dispatch-marker syntax in the always-on surface. | STORY-026-02 retains an explicit one-liner pointer to the skill. EPIC-026 §6 Q3 confirms "when banner says Load skill X, invoke Skill tool" rule is added to the post-prune CLAUDE.md as the contract. Smoke-test with a real dispatch in Wave 3 acceptance. |
| **CR-026 fix touches the long-Red token-ledger.** Tests may surface untested code paths from SPRINT-15+ era. | Real-infra integration test. Verify SPRINT-21 ledger attribution >95% correct (success metric). If <95%, file follow-up CR for SPRINT-21. |
| **BUG-025 corpus dedupe pass produces large diff.** All `.cleargate/delivery/**/*.md` files edited since SPRINT-15+ era are suspect. Review batch may be unwieldy. | Dedupe script idempotent — run once, commit as a single chore commit, gate with `git diff --stat` review. Hook fix MUST land first; corpus dedupe second; otherwise re-edits re-introduce duplicates. |
| **Token-ledger Red that has carried since SPRINT-15.** Per BUG-024 §3, three concrete defects (session-id mismatch + transcript-grep banner poison + manual write_dispatch unreliable). CR-026 must address all three OR explicitly defer. | CR-026 spec must enumerate which of BUG-024's three defects ship in SPRINT-20 vs deferred. Architect M3 plan decides. |
| **EPIC-026's auto-load directive is advisory, not contractually forced** (per EPIC-026 §3). The orchestrator must read the SessionStart banner and explicitly invoke `Skill(sprint-execution)`. | STORY-026-02 prune adds an explicit "when banner says Load skill X" rule to CLAUDE.md (per EPIC-026 §6 Q3). Smoke-test verifies the orchestrator follows the rule. |
| **Pre-existing admin/+mcp/ vitest failures** (5-7 files; mcp/ subrepo absent in worktrees). Carried forward from SPRINT-15+. | Out of scope. Track in REPORT.md §6 as carry-over. Surface as candidate for a SPRINT-21 infra-cleanup hotfix if not already covered. |
| **Vitest pool-cap may need further tightening** if SPRINT-20 dispatches >2 parallel Wave 1 agents on a memory-tight laptop. SPRINT-19 set maxForks=2 in vitest.config.ts; user reported computer-RAM concerns mid-sprint. | Default cap holds for ≤2 simultaneous test runs. If Wave 1 dispatches 3 agents, orchestrator either drops to VITEST_MAX_FORKS=1 or serializes the third. Document the pattern in EPIC-026's skill §1 wall-clock budget table. |
| **CR-027 + CR-028 expand the readiness-gate predicate set; pre-existing pending-sync drafts may newly fail under v2** (`discovery-checked`, `reuse-audit-recorded`, `simplest-form-justified`). Sprint preflight could reject SPRINT-20 itself if the anchor files don't satisfy the new criteria. | (a) v1-warn-only fallback per CR-014 severity model. (b) Wave 2 includes a one-time backfill commit that adds `## Existing Surfaces` + `## Why not simpler?` sections to the SPRINT-20 anchor files (CR-028 dispatch handles). (c) `discovery-checked` already passes for all SPRINT-20 anchors (`context_source` populated). (d) Risk-table-populated already passes for SPRINT-20 itself (§3 has the `| Mitigation` header). |
| **CR-027's preflight check #5 introduces a coupled dependency on `assert_story_files.mjs` helpers** (`extractWorkItemIds`, `findWorkItemFile`). If that script's contract drifts post-CR-014, the composite check breaks silently. **SDR-verified:** those functions are NOT exported today (plain `function` decls at line 74/90). | Architect M5 plan: extract those helpers as a reusable lib (`cleargate-cli/src/lib/work-item-extractor.ts` or equivalent) and import from both `sprint.ts` and the mjs script. Single source of truth; mirror parity preserved. Decision recorded in §2.3. |
| **CR-028's protocol §0 insertion may collide with existing `## 0. The Five Phases` section.** Per FLASHCARD `2026-04-21 #protocol #section-numbering`. **SDR-verified:** existing §0 lives at `cleargate-protocol.md:7`. 161 numeric `protocol §N` refs in the live tree. | Architect M6 plan MUST specify "unnumbered preamble insertion" (option b in §2.5 Hard flag) — preserve all existing §-numbers; new Code-Truth content is a pre-§0 preamble, not a §0 renumber. M6 verification asserts `grep -c "## [0-9]" cleargate-protocol.md` count unchanged pre/post. |
| **Wave 3 (STORY-026-02) merge ordering is critical** — runs LAST after Waves 1+2 to avoid CLAUDE.md churn during their development. If STORY-026-02 ships first by accident, CR-027/CR-028 lose CLAUDE.md edit anchors. | Orchestrator MUST hold STORY-026-02 dispatch until Wave 2 fully merges. Architect SDR enforces wave ordering via dispatch sequencing, not just file-level merge order. |
| **STORY-026-01 → CR-027 mirror-creation dependency.** CR-027's M5 plan must edit `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` (canonical) which DOES NOT EXIST today; STORY-026-01 R5 creates it. If CR-027 ships before STORY-026-01 merges, the mirror edit target is missing. | Wave-1-must-finish gate (per §2.1). Orchestrator does not dispatch CR-027's Developer until STORY-026-01 is merged to `main` AND `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` exists (verifiable via `ls`). |

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

- **Starting Point:** Wave 1 spawns 3 Developer agents in parallel (STORY-026-01, CR-026, BUG-025). Each Developer reads its anchor file + the corresponding M1/M3/M4 milestone plan from `.cleargate/sprint-runs/SPRINT-20/plans/`. Wave 2 spawns 2 Developer agents (CR-027, CR-028) after Wave 1 fully merges. Wave 3 spawns 1 Developer agent (STORY-026-02) after Wave 2 fully merges.
- **Relevant Context:** EPIC-026's `<agent_context>` block in §0 is the authoritative scope spec. BUG-024 §3 is the authoritative defect catalog for CR-026. BUG-025 §1-§2 is the authoritative repro for the hook idempotency fix. CR-027 §1 + §3 is the authoritative spec for the composite preflight gate. CR-028 §1 + §3 is the authoritative spec for the four-layer code-truth principle stack.
- **Constraints:**
  - No CLAUDE.md changes outside CLEARGATE-tag-block region (live).
  - Mirror parity per-edit, not state-parity (FLASHCARD `2026-04-19 #wiki #protocol #mirror`).
  - Real infra, no mocks for hook fixture tests.
  - Vitest cap is in vitest.config.ts (maxForks=2). Override via VITEST_MAX_FORKS env. CLI flag `--pool-options.forks.maxForks=N` collides with tinypool (FLASHCARD `2026-05-02 #vitest #ram #pool`).
  - `npm run prebuild` MUST run after canonical-skill changes in EPIC-026 M1.3 (FLASHCARD `2026-05-01 #scaffold #mirror #prebuild`).
  - DoD §4.1 test counts ENFORCED, not advisory (SPRINT-19 lesson).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Green — Ready for Sprint Execution Gate (Gate 3 preflight)**

Approved 2026-05-02T14:00:00Z by sandrinio. Anchor corrections applied: BUG-025 §4 (audit-surface expanded to TS handlers, bash hook demoted to secondary suspect); CR-027 §3 (skill files added to modify-list; `assert_story_files.mjs` export step explicit with M5-plan path-(a)/(b) decision recorded).

Requirements to pass to Green (Gate 2 — Sprint Ready):
- [x] All 6 anchor items decomposed and linked in §1 (EPIC-026 → STORY-026-01 + STORY-026-02; CR-026 ✅ drafted 2026-05-02; CR-027 ✅ Approved; CR-028 ✅ Approved; BUG-025 ✅).
- [x] Sprint Goal articulated (§0 Stakeholder Brief) — updated 2026-05-02 to include CR-027 + CR-028 scope.
- [x] Wave structure present (§1) — restructured to 3 waves with ordering rationale.
- [x] **All anchor files drafted + 🟢:** EPIC-026 ✅, STORY-026-01 ✅, STORY-026-02 ✅, CR-026 ✅, CR-027 ✅ (`approved: true`, `cached_gate_result.pass: true`), CR-028 ✅ (`approved: true`, `cached_gate_result.pass: true`), BUG-025 ✅.
- [x] **Architect SDR** populates §§2.1-2.5 in-place (SDR completed 2026-05-02). Critical SDR outcomes: (a) Hard flag CR-027/STORY-026-02 CLAUDE.md collision RESOLVED-VIA-M5-PLAN (skill update path verified feasible); (b) Hard flag CR-028 protocol §0 insertion ESCALATED — M6 plan MUST specify unnumbered-preamble insertion (option b); (c) wave-3 dispatch sequencing confirmed; (d) BUG-025 fast-lane re-confirmed; (e) NEW shared-surface warning: `assert_story_files.mjs` helpers are not exported (M5 plan decides extraction strategy); (f) NEW shared-surface warning: BUG-025 actual defect is in `cleargate stamp-tokens` TS handler, not the bash hook.
- [x] Risks enumerated with mitigations (§3) — updated to include CR-027 + CR-028 risks + SDR-surfaced mirror-creation dependency + protocol-§-numbering stability assertion.
- [ ] Sprint Execution Gate (Gate 3) preflight will run before Ready → Active transition (post-approval). Note: CR-027 ships a NEW preflight check #5 — once shipped mid-sprint, subsequent preflight runs (e.g., for SPRINT-21) will use the composite gate. SPRINT-20's own preflight runs against today's 4-check version.
- [ ] **Pre-Wave-2 backfill check:** before Wave 2 dispatch, verify SPRINT-20 anchor files satisfy CR-027's `discovery-checked` + `risk-table-populated` (pre-existing — should pass for all 6 anchors). Wave 2 itself adds the `## Existing Surfaces` + `## Why not simpler?` sections via CR-028's backfill commit.
- [ ] **Pre-Wave-2 mirror-existence check:** before Wave 2 dispatch, verify `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` exists (created by STORY-026-01 R5). If missing, CR-027's M5 plan cannot edit the canonical skill mirror.
