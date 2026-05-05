---
sprint_id: SPRINT-26
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-26
carry_over: false
lifecycle_init_mode: warn
remote_id: null
source_tool: local
status: Draft
execution_mode: v2
start_date: 2026-05-06
end_date: 2026-05-17
created_at: 2026-05-05T08:00:00Z
updated_at: 2026-05-05T08:00:00Z
created_at_version: cleargate@0.11.3
updated_at_version: cleargate@0.11.3
context_source: |
  First sprint after the SDLC Hardening arc closed in SPRINT-25. Triggered
  by the 2026-05-04 → 2026-05-05 dogfood test on
  /Users/ssuladze/Documents/Dev/markdown_file_renderer, where ClearGate
  scaffolded and executed a real product sprint (SPRINT-02, 6 stories,
  3 Observe-phase fix cycles on STORY-002-02, ~310k output tokens). The
  test surfaced THREE hot-shipped CLI bugs (0.11.1 doctor manifest path,
  0.11.2 session-load restart warning, 0.11.3 +x preservation in upgrade)
  AND five new items worth filing as standard work: 3 bugs (BUG-027/028/029)
  + 2 CRs (CR-059/060). All five are dogfood-surfaced — discovered while
  the framework was being used to ship product, not synthesized from
  requirements.

  Theme: "Dogfood Hardening — Issues Surfaced by Live Use". This sprint
  takes a step away from the SDLC Hardening internal arc and addresses
  the framework gaps that real users (starting with me) hit. Everything
  in scope is a fix or polish, not new capability.

  Items in scope:
  - BUG-027 token-ledger fallback grep regression (12× misattribution
    observed in SPRINT-02 dogfood; ~25% of ledger rows tagged wrong epic)
  - BUG-028 upgrade --dry-run vs real-run state mismatch + empty-diff
    render in merge prompt
  - BUG-029 parallel-eligible dispatches silently serialize (loses the
    parallelism intent without any error)
  - CR-059 smarter session-load restart warning (suppress no-op rewrites
    so warning fatigue doesn't erode signal)
  - CR-060 doc clarity in CLAUDE.md "Dogfood split" section (clarify that
    cleargate-planning/ does NOT land in target repos)

  Out-of-scope (acknowledged backlog):
  - Migration plan for 129 vitest files → node:test (CR-040 dropped per
    user direction, permanent two-runner state — see auto-memory)
  - SPRINT-04 wiki ingest improvements (separate epic)
  - Reporter cost-per-epic dashboard (depends on BUG-027 fix)
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-05T08:36:52Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
draft_tokens:
  input: 0
  output: 0
  cache_creation: 0
  cache_read: 0
  model: <synthetic>,claude-opus-4-7
  last_stamp: 2026-05-05T08:36:46Z
  sessions:
    - session: 5133efc1-8f4d-4d20-b17f-77a951223254
      model: <synthetic>,claude-opus-4-7
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-05-05T08:35:15Z
---

# SPRINT-26: Dogfood Hardening — Issues Surfaced by Live Use

## 0. Stakeholder Brief

First post-SDLC-Hardening sprint. Five items, all dogfood-surfaced from the 2026-05-04/05 test on `markdown_file_renderer`. Three bugs (one P2 regression, one P2 parallel-execution gap, one P3 UX), two CRs (one polish on the v0.11.2 hotfix, one doc clarification). Theme is "fix what real use surfaced", not new capability.

The framework already ships product end-to-end via the four-agent loop (verified in dogfood). This sprint closes the rough edges that real use exposed.

## 1. Consolidated Deliverables

| ID | Type | Title | Severity / Priority |
|---|---|---|---|
| [[BUG-027]] | Bug | Token-ledger fallback grep mis-tags work_item to first lexical EPIC-NNN (regression of BUG-024) | P2-Medium |
| [[BUG-028]] | Bug | Upgrade merge prompt: dry-run vs real-run state mismatch + empty diff render | P3-Low |
| [[BUG-029]] | Bug | Parallel-eligible story dispatches silently serialize | P2-Medium |
| [[CR-059]] | CR | Smarter session-load restart warning — suppress no-op rewrites | Polish |
| [[CR-060]] | CR | Doc clarity: cleargate-planning/ is meta-repo-only (CLAUDE.md edit) | Doc |

All items in `pending-sync/`; all gate-passing or close to it (CR-059 needs human ack of remaining ambiguity, CR-060 is doc-only).

## 2. Execution Strategy (Architect SDR — 2026-05-05)

### 2.1 Phase Plan

Five items, three waves. Authoritative — orchestrator dispatch text cannot deviate without a re-dispatched Architect amendment.

**Wave 1 — Spike + parallel-safe trio (parallel dispatches, single orchestrator turn):**
- **BUG-029-spike** (≤30 min, time-boxed) — read-only investigation of three suspect surfaces (`.claude/skills/sprint-execution/SKILL.md` dispatch instruction; `cleargate-planning/.claude/hooks/pending-task-sentinel.sh` + `pre-tool-use-task.sh`; `cleargate-planning/.claude/hooks/token-ledger.sh` SubagentStop session_id matcher). Output: a 5-line root-cause finding written into the BUG-029 file under `## 6. Spike Findings`. **Halt for orchestrator before Wave 2 BUG-029 dispatch.** This is a phase, not a story; no merge.
- **BUG-027** — token-ledger fallback resolver (`cleargate-planning/.claude/hooks/token-ledger.sh`). No file overlap with anything else.
- **CR-060** — CLAUDE.md doc paragraph. No file overlap with anything else.

These three dispatch in a single orchestrator message (true parallelism per Claude Code Task semantics; FLASHCARD 2026-05-02 `#hooks #attribution #pre-tool-use-task` confirms PreToolUse:Task hook handles parallel marker writes correctly even if BUG-029 itself reveals downstream failure).

**Wave 2 — Sequential pair on `upgrade.ts`:**
- **BUG-028** — dry-run/live state-parity fix + diff-render fallback in `merge-ui.ts`. Lands first.
- **CR-059** — normalized-sha session-load suppression. Rebases on BUG-028's tree.
- These cannot parallelize: both stories rewrite the same `for (const item of workItems)` loop body in `upgrade.ts:474–519` plus the same `SESSION_LOAD_PATHS` tracker block. Hard serialize.

**Wave 3 — BUG-029 fix (dispatch only after spike has named the surface):**
- Single-story wave, lane decided by spike outcome (see §2.4).

**Goal alignment:**
- Wave 1 BUG-027 + Wave 3 BUG-029 fix directly satisfy success criteria (a) + (c).
- Wave 2 BUG-028 satisfies success criterion (b).
- CR-059 + CR-060 are polish/doc, not gated by success criteria.

### 2.2 Merge Ordering (Shared-File Surface Analysis)

| Shared File | Stories | Order | Rationale |
|---|---|---|---|
| `cleargate-cli/src/commands/upgrade.ts` | BUG-028, CR-059 | BUG-028 → CR-059 | BUG-028 modifies dry-run path (lines 445–454) AND the sessionRestartFiles tracker block (lines 516–518) AND the post-SHA call site (507). CR-059 replaces the byte-equality check `postSha !== currentSha` at line 516 with a normalized-sha helper. CR-059's edit is conceptually one line deeper than BUG-028's — must rebase on the post-BUG-028 tree to avoid merge conflict. |
| `cleargate-cli/src/lib/merge-ui.ts` | BUG-028 | (single) | BUG-028 owns `renderInlineDiff()` at line 22 — adds whitespace/EOL fallback annotation. |
| `cleargate-cli/src/commands/init.ts` | CR-059 | (single) | CR-059 owns line 329 parallel suppression — apply same normalized-sha helper. |
| `cleargate-planning/.claude/hooks/token-ledger.sh` | BUG-027 (+ possibly BUG-029) | BUG-027 → BUG-029 if BUG-029 spike lands here | If BUG-029 spike concludes the SubagentStop session_id matcher is the root cause, BUG-029 will also touch this file. Spike output decides whether this becomes a 2-story shared file. Protect by deferring BUG-029 to Wave 3. |
| `CLAUDE.md` | CR-060 | (single) | Doc-only. |
| `.claude/skills/sprint-execution/SKILL.md` | BUG-029 (conditional) | (single, Wave 3) | Only if spike points here. |

### 2.3 Shared-Surface Warnings

- **`upgrade.ts` BUG-028 ↔ CR-059** — Append-vs-rewrite collision on the `sessionRestartFiles.push(entry.path)` block at lines 516–518. BUG-028 may not edit this block, but BUG-028's dry-run fix path may move `currentSha` plumbing in ways that shift line numbers. CR-059's Developer must NOT use line-number references in the M-plan; reference by symbol (`SESSION_LOAD_PATHS`, `sessionRestartFiles.push`).
- **`upgrade.ts` BUG-028 dry-run vs. live path** — BUG-028 fixes a state-mismatch where dry-run reads stale `currentSha`. The current code computes `currentSha` once at line 418 (Promise.all over filteredFiles); both dry-run and live consume the same FileWork object. Root cause is *not* a dual-cache; it is that dry-run skips the post-mutation re-hash at line 507 while live executes it. Architect M-plan must spec this: dry-run path needs to compute a hypothetical postSha by reading the upstream payload, not just printing pre-state.
- **`token-ledger.sh` mirror chain (BUG-027)** — Canonical `cleargate-planning/.claude/hooks/token-ledger.sh` → derived `cleargate-cli/templates/cleargate-planning/.claude/hooks/token-ledger.sh` (regenerated by `npm run prebuild`, FLASHCARD 2026-05-01 `#scaffold #mirror #prebuild`) → live `/.claude/hooks/token-ledger.sh` (gitignored, manual `cleargate init` re-sync). Same dogfood-split risk that bit BUG-024 (CLAUDE.md root §"Dogfood split"). Developer must edit canonical only, run prebuild, and the orchestrator must remind the user to `cleargate init` post-merge before BUG-027 verification re-run on `markdown_file_renderer`.
- **`token-ledger.sh` snapshot lock (BUG-027, also BUG-029 conditional)** — FLASHCARD 2026-05-04 `#snapshot #hooks` + 2026-05-02 `#snapshot #hooks`: every edit to this hook requires updating `cleargate-cli/test/snapshots/token-ledger.cr-NNN.sh` (new authoritative baseline, supersedes prior `cr-N-1.sh` to existence-only check). Architect M-plan must explicitly include this snapshot-lock update line item; Dev cannot skip it without breaking `hooks-snapshots.test.ts`.
- **BUG-029 spike scope warning** — The spike is read-only; no code change in Wave 1. If the orchestrator dispatches a Developer for BUG-029 in Wave 1, that violates this plan. Re-dispatch Architect to amend if the spike result demands urgent action.

### 2.4 Lane Audit

Per the 7-check rubric in `.claude/agents/architect.md` §"Lane Classification":

| Item | Lane | Rationale (≤80 chars) |
|---|---|---|
| BUG-027 | **standard** | Touches mirror chain + snapshot lock; >50 LOC across canonical + tests. |
| BUG-028 | **standard** | Two files (`upgrade.ts` + `merge-ui.ts`) + 2 new test cases; >50 LOC. |
| BUG-029 | **standard (post-spike)** | Lane locked after spike; multi-surface root-cause uncertainty. |
| CR-059 | **standard** | Two files (`upgrade.ts` + `init.ts`) + 3 test cases; >50 LOC. |
| CR-060 | **fast** | Single file (`CLAUDE.md`); doc-only ≤4 sentences; no test exec needed. |

**Fast-lane justification for CR-060** (all 7 checks pass): (1) ≤2 files ≤50 LOC ✓ — one paragraph in one file; (2) no forbidden surfaces ✓ — root `CLAUDE.md` is doc, not auth/db/config/adapter; (3) no new dependency ✓; (4) zero acceptance scenarios ✓ — pure doc CR; (5) no runtime change to test ✓ — verification is human read-through per §4 of the CR; (6) `expected_bounce_exposure: low` ✓ — implicit for doc-only; (7) no epic-spanning subsystem ✓ — meta-repo doc.

**BUG-029 lane caveat (spike-then-classify):** Root cause is uncertain across three surfaces. Recommendation: **spike-then-classify, do NOT split-into-two-stories**. After the time-boxed read-only spike (Wave 1, ≤30 min), the BUG-029 fix lane is one of:
- Spike → SKILL.md is the cause: lane = **standard**, 1-file edit + 1 test, ~20 LOC.
- Spike → sentinel hook is the cause: lane = **standard**, mirror-chain + snapshot lock applies (same as BUG-027 surface).
- Spike → SubagentStop session_id matcher is the cause: lane = **standard**, ledger snapshot lock applies + risk of regressing the BUG-024 dispatch-marker fix; high-care.
- Spike → no clear cause within 30 min: **escalate to user** with the three findings, do not auto-promote a fix story. Sprint absorbs the spike cost; BUG-029 fix carries to SPRINT-27.

Do not pretend certainty here. The spike output is gating.

### 2.5 ADR-Conflict Flags

Cross-checked each item against `.cleargate/knowledge/cleargate-protocol.md`, `.cleargate/knowledge/cleargate-enforcement.md`, recent flashcards, and locked architectural decisions in root `CLAUDE.md`.

- **BUG-027** ✓ Aligned with FLASHCARD 2026-05-02 `#hooks #ledger #dispatch` (newest-file lookup, not session-id-keyed) — this fix refines the *resolver* fallback in the same direction (sentinel-first / dispatch-marker-first) and does not contradict the dispatch-marker write path.
- **BUG-028** ✓ No conflict. The dry-run/live parity expectation is implicit in the v0.10 upgrade UX design; codifying it.
- **BUG-029** ⚠️ **Conditional flag.** If the spike concludes the orchestrator skill (`SKILL.md`) is the cause and the fix requires changing how the orchestrator dispatches in parallel, this borders on a protocol-level change to the four-agent-loop dispatch contract. If so, the BUG-029 fix story must include a one-line update to `.cleargate/knowledge/cleargate-protocol.md` declaring the parallel-dispatch invariant, and a flashcard entry. Do not let the fix land as a SKILL.md-only edit if it changes contract semantics. No conflict if the cause is a downstream hook.
- **CR-059** ✓ Aligned with the v0.11.2 hotfix decision (track session-load file mods); refines, does not contradict. The "false-negative is worse than false-positive" constraint in CR-059 §context_source preserves the safety polarity of the original decision.
- **CR-060** ✓ No conflict. Pure clarification of existing CLAUDE.md text. The dogfood-split semantics it documents are already enforced by `cleargate-cli/src/init/copy-payload.ts:54` SKIP_FILES; the CR aligns the doc to the code (code-truth principle, FLASHCARD 2026-05-02 `#protocol #templates #readiness #code-truth`).

No locked-decision divergences. One conditional flag on BUG-029 pending spike outcome.

## 3. Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| BUG-029 root cause ambiguous (orchestrator skill vs sentinel hook vs SubagentStop) | High | Story may stall during M1 spike | Architect produces spike plan first; if root cause unclear after 30 min, escalate to user for direction; do not let one story block the sprint. |
| BUG-027 fix mirrored canonical/payload/live — easy to forget the mirror step | Medium | Live hooks drift from fixed payload | DevOps post-merge step: confirm `.claude/hooks/token-ledger.sh` in repo root matches canonical post-fix. |
| CR-059 normalized-sha logic over-suppresses (false negative, missed restart prompt) | Medium | User runs broken hooks unknowingly until next session start | Conservative scoping in CR-059: only suppress when the changed bytes are demonstrably non-functional (formatting, key order). When in doubt, warn. Verification test 1 must include a counter-example. |
| Vitest still in use for new tests against memory `Prefer node:test over vitest for new tests` | Low | Style drift | Per memory: existing 129 vitest files stay; new tests for these stories should use `*.node.test.ts` + `tsx --test`. Architect M1 plan explicitly directs Developer per story. |

## 4. Execution Log

_Populated by DevOps as merges land._

## 5. Metrics & Metadata

- Stories planned: 5 (3 Bug + 2 CR)
- Estimated wall clock: ~5–7 days for v2 mode (3 stories Wave 1 parallel, 1 Wave 2, 1 Wave 3)
- Estimated token cost: ~150–200k output (smaller than SPRINT-02 dogfood — these are surgical fixes, not feature work)
- Owning epic refs: BUG-027 → BUG-024 (regression), BUG-028 → EPIC-016 (Upgrade UX), BUG-029 → EPIC-013 (Execution Phase v2), CR-059 → EPIC-016, CR-060 → EPIC-013

## Execution Guidelines (Local Annotation — Not Pushed)

- All 5 items are gate-passing or close (CR-059 has open questions on schema-meaningful key scope — resolve at Gate 1 ack).
- Sprint runs `execution_mode: v2`. Architect Sprint Design Review required before sprint init.
- DevOps subagent registration confirmed in CR-051 — single-agent escape hatch acceptable per SPRINT-22..24 findings.
- Reporter at sprint close must explicitly call out whether BUG-027 fix eliminated the EPIC-001 fallback hits (verifiable by re-running a dogfood pass on `markdown_file_renderer` post-upgrade).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity** — sprint scope is concrete; BUG-029's root cause uncertainty is acknowledged in §3 Risks but not eliminated.

Requirements to pass to Green (Ready for Execution):
- [x] Risk table populated with at least one row.
- [x] Discovery-checked (`context_source` set).
- [x] All in-scope items exist in `pending-sync/` and are gate-passing or have a documented remaining-ambiguity reason.
- [ ] `approved: true` is set in the YAML frontmatter.
