---
sprint_id: "SPRINT-16"
source_tool: "local"
status: "Draft"
start_date: "2026-05-13"
end_date: "2026-05-26"
created_at: "2026-04-29T00:00:00Z"
updated_at: "2026-04-29T00:00:00Z"
created_at_version: "cleargate@0.8.2"
updated_at_version: "cleargate@0.8.2"
context_source: "Conversation 2026-04-29 — two-decision evolution. (1) SPRINT-15 right-sizing: EPIC-016 (Upgrade UX, 6 stories) deferred from SPRINT-15 to here end-to-end (over-sizing fix). (2) Decomposition discipline (CR-017 protocol §26): proposals/epics must be fully decomposed BEFORE the sprint executing them activates. PROPOSAL-013 → EPIC-023 → sub-epic 1 stories are between-sprints transition work performed by Architect post-SPRINT-15 close, pre-SPRINT-16 activation. SPRINT-16 cannot activate until EPIC-023 file + sub-epic 1 stories exist and are gate-clean (CR-017 sprint-init gate enforces). M2 is pure execution, not decomposition."
epics: ["EPIC-016", "EPIC-023"]
crs: ["CR-019"]
bugs: []
proposals: []
approved: false
approved_at: null
approved_by: null
activated_at: null
execution_mode: "v2"
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
sprint_cleargate_id: "SPRINT-16"
---

# SPRINT-16: Upgrade UX + MCP-Native Source of Truth (slice 1)

## Sprint Goal

Two anchor epics, each previously locked at the architectural level, now executing:

1. **Upgrade UX (EPIC-016)** — close the three gaps EPIC-009 left open. Users on N-1 see an "available" notice within 24h; `cleargate upgrade` prints release narrative before the merge loop; the meta-repo installs through `--from-source` and runs the same scaffold-clean validation downstream users hit. Six stories pre-decomposed during SPRINT-15 prep; spec stable. Ships **0.10.0** (CHANGELOG ships in tarball + registry-check + delta print + dogfood path).
2. **EPIC-023 sub-epic 1 — Work-Item Sync v2** — first slice of PROPOSAL-013's "MCP as native source of truth" reframe. Replaces the `PmAdapter` noop indirection with direct `cleargate sync` for work items. Status-blind sync per PROPOSAL-013 §2.1 (Drafts and unapproved items ARE the in-progress thinking, belong in the source of truth). Story files (STORY-023-01-NN) are drafted by the Architect as **between-sprints transition work** (post-SPRINT-15 close, pre-SPRINT-16 activation) per CR-017 §26 — they exist in pending-sync, gate-clean, before this sprint activates. M2 is pure execution.

This is **the first sprint to exercise CR-017's full enforcement at close**: lifecycle reconciler (block-mode) + decomposition gate (block-mode at sprint init for SPRINT-17's anchor decomposition). Validates both gates.

## 1. Consolidated Deliverables

| Item | Type | Title | Lane | Complexity | Parallel? | Bounce Exposure | Milestone |
|---|---|---|---|---|---|---|---|
| `STORY-016-01` | Story | Registry-check library + 24h cache (`lib/registry-check.ts` + opt-out env var + offline silent) | standard | L2 | y | low | M1 |
| `STORY-016-02` | Story | `cleargate doctor --session-start` surfaces update notifier (consumes 016-01) | standard | L1 | n | low | M1 |
| `STORY-016-03` | Story | `CHANGELOG.md` backfill + ship in npm tarball | fast | L1 | y | low | M1 |
| `STORY-016-04` | Story | `cleargate upgrade` prints CHANGELOG delta before merge loop (consumes 016-03) | standard | L2 | n | med | M1 |
| `STORY-016-05` | Story | `cleargate init --from-source <path>` for meta-repo dogfood | standard | L2 | y | med | M1 |
| `STORY-016-06` | Story | E2E integration test — dogfood install → `doctor --check-scaffold` clean (consumes 016-05) | standard | L2 | n | med | M1 |
| `STORY-023-01-NN` | Story | EPIC-023 sub-epic 1 (Work-Item Sync v2) — **drafted as between-sprints transition work; concrete IDs assigned at draft time**. Expected ~3 stories from PROPOSAL-013 §2.2 (CLI sync command + MCP server-side recv handler + conflict-detector wiring). | standard | L2–L3 | n | med | M2 |
| [`CR-019`](CR-019_Sprint_Close_Requires_Explicit_Human_Ack.md) | CR | Sprint close requires explicit human ack — orchestrator MUST NOT pass `--assume-ack`; protocol §27 + CLAUDE.md guardrail + `close_sprint.mjs` usage doc | fast | L1 | y | low | M0 |

**Estimated totals (firm after between-sprints decomp completes):** EPIC-016 = 6 stories + EPIC-023 sub-epic 1 = ~3 stories + CR-019 = **~10 items**. Complexity preview: ~3×L1 + ~6×L2 + 0–1×L3 + CR-019 (L1 fast). Lane mix preview: ~2 fast / ~8 standard.

**CR-019 origin (added 2026-04-30 retroactively):** filed immediately after SPRINT-15 close, when the conversational orchestrator passed `--assume-ack` to `close_sprint.mjs` autonomously without surfacing the script's `"Review the report, then confirm close by re-running with --assume-ack"` prompt to the human. CR-019 codifies the rule that was implicit in `close_sprint.mjs`'s design but not encoded in protocol or CLAUDE.md. Doc-only fix: protocol §27 + 1 CLAUDE.md bullet (×2 mirror) + 2-line usage docstring edit. Fast lane on M0; ships before M1 kicks off so SPRINT-16 close itself follows the corrected protocol.

**Between-sprints transition work (must complete before SPRINT-16 activation; not story-tracked, not a SPRINT-16 deliverable):**
- SPRINT-15 close passes its lifecycle reconciler gate (CR-017 layer 1 — first real test).
- Architect drafts `EPIC-023_MCP_Native_Source_Of_Truth.md` (4 sub-epics scoped per PROPOSAL-013 §2.5).
- Architect drafts `STORY-023-01-NN_*.md` files (~3) for sub-epic 1 with full §2.1 Gherkin + §3 Implementation Guide + lane assignments.
- Status flips Draft → Approved on STORY-016-01..06 + new STORY-023 files + EPIC-016 + EPIC-023.
- Gate-readiness pass: every item has `approved: true`, `cached_gate_result.pass: true`.
- `cleargate sprint init SPRINT-16` runs CR-017 layer 2 — decomposition gate verifies all `epics:` and proposed-deliverables-table items have files + stories + approval. Block-mode by 2026-05-13 (SPRINT-16's start_date).

## 2. Execution Strategy

### 2.1 Phase Plan

**M1 — Upgrade UX (EPIC-016, three parallel tracks; pre-decomposed in SPRINT-15):**
- **Track A (sequential):** STORY-016-01 → STORY-016-02. 016-01 ships registry-check lib + cache; 016-02 wires it into `doctor --session-start`.
- **Track B (sequential):** STORY-016-03 → STORY-016-04. 016-03 backfills CHANGELOG.md + adds to npm `files` array; 016-04 makes `cleargate upgrade` slice and print the delta.
- **Track C (sequential):** STORY-016-05 → STORY-016-06. 016-05 adds `--from-source` to `cleargate init`; 016-06 is the E2E integration test.
- All three tracks run in parallel. Three Developer agents in worktrees.

**M2 — Work-Item Sync v2 (EPIC-023 sub-epic 1, parallel with M1):**
- Stories STORY-023-01-NN already exist in pending-sync (drafted as between-sprints transition work; gate-clean by activation). M2 is **pure execution**, not decomposition.
- Stories execute per the Architect's pre-drafted phase plan recorded in EPIC-023 §2 (likely sequential — CLI surface + MCP server-side handler share the wire format, must serialize).
- M2 runs in parallel with M1 — disjoint surfaces (CLI sync + mcp/ vs CLI doctor/upgrade/init).

### 2.2 Merge Ordering (Shared-File Surface Analysis)

| Shared File | Items Touching It | Merge Order | Rationale |
|---|---|---|---|
| `cleargate-cli/src/commands/upgrade.ts` | STORY-016-04 | — | Single-touch this sprint. |
| `cleargate-cli/src/commands/doctor.ts` | STORY-016-02 | — | Single-touch. |
| `cleargate-cli/src/commands/init.ts` | STORY-016-05 | — | Single-touch. |
| `cleargate-cli/CHANGELOG.md` | STORY-016-03 | — | New file. |
| `cleargate-cli/package.json` | STORY-016-03 (`files` array), STORY-016-04 (no edit), 0.10.0 bump | sprint-close | Single version bump at sprint close (0.9.x → 0.10.0). |
| `cleargate-cli/src/lib/{registry-check,changelog,scaffold-source}.ts` | STORY-016-01, -04, -05 | parallel | Three new lib files; disjoint. |
| `cleargate-cli/src/commands/sync.ts` (new) | STORY-023-01-NN (TBD) | — | New CLI surface for work-item sync. |
| `mcp/src/...` | STORY-023-01-NN (TBD) | — | Server-side handler additions. |

### 2.3 Shared-Surface Warnings

- **EPIC-016 ↔ EPIC-023 forward-tension:** EPIC-016 ships the file-authoritative upgrade flow; EPIC-023 reframes file storage as MCP-cache. Re-evaluate `--from-source` semantics after EPIC-023 sub-epics 2-4 land in later sprints. The notifier + CHANGELOG paths are model-agnostic; only the dogfood install path may need adjustment.
- **STORY-016-04 ↔ CHANGELOG file shipped via package:** STORY-016-03 must merge before STORY-016-04 — the slicer needs the file to exist. Track-B sequencing enforces this.
- **STORY-016-01 API churn risk:** Architect locks `checkLatestVersion(opts?: { fetcher? }): Promise<{...}>` signature in 016-01's §3.1 before spawning 016-02; signature drift forces 016-02 re-bounce.
- **EPIC-023 sub-epic 1 wire-format coordination:** CLI sync command and MCP-side handler must agree on payload shape. The contract is pinned in EPIC-023 §2 during between-sprints decomposition; both stories' §3.3 API Contract tables reference it. Drift detected at gate-readiness pass blocks SPRINT-16 activation.

### 2.4 Lane Audit

| Story | Lane | Rationale (≤80 chars) |
|---|---|---|
| `STORY-016-03` | fast | CHANGELOG.md authoring + one-line package.json edit; doc-only |

All other items run `standard`. EPIC-023 sub-epic 1 stories' lanes assigned during between-sprints decomposition; reflected in this table once stories are drafted (concrete IDs replace `STORY-023-01-NN`).

### 2.5 ADR-Conflict Flags

- **None at draft time.** Re-check after between-sprints decomposition completes. PROPOSAL-013's locked decisions (§2.1) are the authority for sub-epic 1 work; conflict with prior ADRs would block at gate-readiness pass during transition (CR-017 decomposition gate).

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| EPIC-023 + sub-epic 1 stories not drafted before SPRINT-16 activation date | CR-017 decomposition gate at `cleargate sprint init SPRINT-16` blocks activation. Architect's between-sprints transition window is 2026-05-12 (SPRINT-15 close) → 2026-05-13 (SPRINT-16 start) — tight; if not feasible, push SPRINT-16 start by N days rather than relax the gate. |
| Sub-epic 1 decomp reveals L4 stories or scope creep during transition | Cap at ~3 stories; if Architect needs more, drop to 2 stories + carry remainder to SPRINT-17. Detected at decomp time (transition), not at sprint kickoff (too late). EPIC-023 is multi-sprint by design. |
| STORY-016-01 registry-check API churns mid-execution, bouncing 016-02 | Architect locks signature in 016-01's §3.1 before spawning 016-02. |
| STORY-016-03 CHANGELOG backfill incomplete (git-archeology error) | Format-test catches structural drift; bullet accuracy verified manually pre-Approved. |
| STORY-016-06 E2E test flaky in CI | Test sets `CLEARGATE_NO_UPDATE_CHECK=1`, spawns CLI via local `dist/cli.js`, runtime-budget ≤30s. |
| **CR-017 reconciler false-positives at SPRINT-16 close (first real test)** | First sprint with full reconciler discipline. If false-positives emerge, file follow-up CR for SPRINT-17; do not weaken the gate. |

## Metrics & Metadata

- **Expected Impact:**
  - Users on N-1 see an "available" notice within 24h (STORY-016-02).
  - `cleargate upgrade` prints release narrative for every intermediate version (STORY-016-04).
  - Meta-repo install path exercised E2E on every release (STORY-016-05/-06).
  - `cleargate sync` ships work items to MCP without `PmAdapter` indirection (EPIC-023 sub-epic 1).
  - 0.10.0 release cut.
  - First clean SPRINT close under CR-017's lifecycle reconciler (validates the gate).
- **Priority Alignment:** Closes the EPIC-016 deferral from SPRINT-15; starts EPIC-023 execution per PROPOSAL-013.
- **Lane Distribution Target:** 15–20% fast lane (~1 of ~9 items = ~11% — slightly under target; STORY-023-01-NN decomp may add fast candidates).

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** M1 EPIC-016 + M2 EPIC-023 sub-epic 1 — both run in parallel from activation. All decomposition is complete by definition (CR-017 decomposition gate enforced at sprint init).
- **Relevant Context:**
  - EPIC-016 stories (STORY-016-01..06) drafted 2026-04-28 during SPRINT-15 prep; specs stable.
  - PROPOSAL-013 (Approved 2026-04-28) is the spec source for EPIC-023.
  - EPIC-023 file authored at SPRINT-15 M5; verify it exists before activating SPRINT-16.
- **Constraints:**
  - **No EPIC-023 sub-epics 2-4 work this sprint** (sprint-plans, sprint-reports, server-recompute wiki — those follow in SPRINT-17+).
  - **No 0.10.0 → 0.11.0 bump pressure** — keep version churn minimal; one bump at sprint close.
  - **CR-017 reconciler runs in block mode at close.** First real exercise — do NOT pass `--allow-drift` unless explicitly approved.
