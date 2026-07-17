---
cr_id: CR-074
parent_ref: EPIC-044
parent_cleargate_id: EPIC-044
sprint_cleargate_id: SPRINT-33
carry_over: false
status: Completed
approved: true
area: framework/hygiene
created_at: 2026-06-01T00:00:00Z
updated_at: 2026-07-17T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.14.0
server_pushed_at_version: null
context_source: "Direct user direction 2026-07-17 (this session): one and only execution path, no naming, no fallback, no CLEARGATE_PARALLEL_WAVES — execution ALWAYS runs the Architect's waves via /workflows (Workflow tool). Completes [[CR-070]]/[[STORY-070-01]] (enforcement-axis collapse) by cutting the residual topology axis. Consumes [[EPIC-033]]'s Workflow/launch_wave one-true-path. Surfaces verified on disk 2026-07-17: sprint-execution SKILL §2/§C.0 (34 refs), launch_wave.mjs shouldRunParallel:137-140, cleargate-cli execution-mode.ts (169 lines), agents architect.md/developer.md, cleargate-enforcement.md, cleargate-protocol.md §23."
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-07-17T14:30:54Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-074
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-07-17T16:03:23Z
  sessions: []
---

# CR-074: One and only execution path — always fan out via `/workflows`, retire all `execution_mode` vocabulary and every alternate/fallback

> **Decision (2026-07-17, hard line).** There is **one and only one** way a sprint executes: the Orchestrator runs the Architect's `waves.json` through the Workflow tool (`/workflows`) via the `launch_wave` contract — worktree-isolated parallel segments, serial-barrier merge. **No naming** (`execution_mode`/`wave_mode`/`v1`/`v2`/`serial`/`parallel` all gone), **no fallback** sequential loop, **no `CLEARGATE_PARALLEL_WAVES` kill-switch.** If `/workflows` is unavailable the Orchestrator **halts and tells the human** — it does not degrade. (Earlier drafts of this CR kept a serial default + env lever; both are removed.)

## 0.5 Open Questions — RESOLVED

- **Question:** Is there a selectable topology / mode?
- **Resolved (human, 2026-07-17):** No. One execution path, no name. Every sprint runs its `waves.json` via `/workflows`. There is nothing to select.

- **Question:** Does any lever survive to force sequential execution (`CLEARGATE_PARALLEL_WAVES=off`, a frontmatter field)?
- **Resolved:** No. The `CLEARGATE_PARALLEL_WAVES` env var is **removed** everywhere. `CLEARGATE_ADVISORY=1` is untouched — that is the *enforcement-strength* break-glass (a different axis, settled by CR-070), not an execution lever.

- **Question:** What happens if the Workflow tool (`/workflows`) is not available (headless/cron, or a consumer install without it)?
- **Resolved (accepted consequence):** Execution **halts** with a clear message; it does **not** silently run stories sequentially. There is no non-`/workflows` execution code path. This is the deliberate cost of "one and only path."

- **Question:** Does "one path" mean deleting the per-story dispatch steps?
- **Resolved:** No — those steps (QA-Red → TPV → Developer → QA-Verify → Architect → Merge → Flashcard) are the **body of a wave segment**. They are not an alternate loop; they only ever run *inside* a `/workflows` segment. A single-story wave runs them as one segment. What is deleted is any invocation of them *outside* the wave fan-out.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- `execution_mode` is dead in every form. STORY-070-01 (`b87f6ac0`) already retired its **enforcement** meaning (`v1`/`v2` → always-enforced, `CLEARGATE_ADVISORY=1` the sole break-glass) and dropped it from `state.json` (schema v3). This CR removes the **remainder**: the topology meaning (`v2-serial`/`v2-parallel`) and every last `v1`/`v2` string in the live scaffold.
- The sprint-execution SKILL's **§2 "v1 / v2 Mode Switch"** section and the **§C.0 kill-switch table** (serial-vs-parallel selector) are obsolete — delete entirely.
- The **serial five-dispatch loop as an alternate execution path** is obsolete. The "kill-switch reverts to the serial loop with zero behavior change" guarantee, the "SPRINT-32 note" about shipping-but-running-serially, and every "fall back to serial" clause are removed.
- `shouldRunParallel(executionMode, env)` and the entire **`CLEARGATE_PARALLEL_WAVES`** env var are obsolete.
- The `cleargate-cli` `execution-mode.ts` **`ExecutionMode` type + `V1_INERT_MESSAGE` + `execution_mode`-parsing** are obsolete (the v1-inert routing is already dead code — every caller comments "always run… no v1-inert path").
- All `execution_mode: v2` / "under v1 informational" gating prose in `agents/architect.md`, `agents/developer.md`, `cleargate-enforcement.md`, and `cleargate-protocol.md` §23 is obsolete.

**New Logic (The New Truth):**
- **Execution has no name, no modes, no alternates.** A sprint runs exactly one way. The Architect SDR always produces `waves.json`; the Orchestrator always runs every wave through `/workflows` via the `launch_wave` contract. Full stop.
- **`/workflows` fan-out is unconditional** — not "when available," not "unless a flag." It is the only dispatch. `launch_wave.mjs` no longer takes or reads a mode/env selector; it always fans out.
- **No fallback.** There is no code path that runs a story outside a wave segment. If `/workflows` is unavailable, the Orchestrator halts and surfaces the reason to the human.
- **One token → gone.** After this CR, `grep -rn 'execution_mode\|v2-serial\|v2-parallel\|CLEARGATE_PARALLEL_WAVES\|shouldRunParallel'` over the live scaffold (excluding `archive/`) returns **zero** hits — no live read, no live prose, no selector, no env var. `\bv1\b`/`\bv2\b` return no execution-mode gating language.

## 2. Blast Radius & Invalidation
*(A CR acts as a "Gate Reset" — all affected downstream items revert to 🔴 High Ambiguity.)*

- [ ] **`sprint-execution/SKILL.md`** (34 refs) — **delete** §2 "v1 / v2 Mode Switch" and the §C.0 kill-switch table wholesale; replace §C.0 with one line: "Execution = run each Architect-planned wave through `/workflows` via the `launch_wave` contract (§C.0.1)." Remove every "serial loop / fall back / kill-switch / SPRINT-32 note" clause in §C.0, §C.7, §C.9. Strip every `execution_mode`/`v1`/`v2` conditional in §A.4 (SDR), §C.3.5 (TPV), §C.6 (Architect pass), §C.9 (flashcard gate), §6 (walkthrough) — the steps are unconditional. Canonical → payload → live (BUG-024 class).
- [ ] **`.cleargate/scripts/launch_wave.mjs`** (9 refs) — **delete** `shouldRunParallel` (lines 137-140) and **all** `CLEARGATE_PARALLEL_WAVES` reads; the module always fans out. Scrub the `execution_mode`/`v2-serial`/`v2-parallel` header + doc comments and the exports line that names `shouldRunParallel`.
- [ ] **`cleargate-cli/src/commands/execution-mode.ts`** (169 lines) — **change, not delete.** Strip `ExecutionMode` type, `V1_INERT_MESSAGE`, and all `execution_mode` frontmatter parsing; keep the live path-resolution seam (`sprintFilePath`/`cwd`/`sentinelFallback` + `resolveSprintIdFromSentinel`) that `sprint.ts`/`gate.ts`/`story.ts`/`state.ts` import, renamed to a neutral module (e.g. `sprint-file-locate.ts` / `SprintFileOptions`). Update the 4 import sites + the dead "v1: print inert message" doc-comments in each.
- [ ] **`cleargate-cli/src/commands/fixtures/SPRINT-99-v1.md` + `SPRINT-99-v2.md`** — retire; any test asserting v1-inert vs v2 or serial-vs-parallel routing is deleted or repointed to the single-path behavior.
- [ ] **`.cleargate/scripts/*.test.mjs` / `test/*.sh`** — remove `shouldRunParallel` unit tests and any kill-switch/serial-fallback parity test; add a test asserting `launchWave` always fans out (no env gate).
- [ ] **`.claude/agents/architect.md`** (10 refs) — drop "under `execution_mode: v2` … v1 informational" gating from SDR/TPV/lane prose; the architect-synth planning-workflow path (line 104) becomes **unconditional** (N>2 fan-out; N≤2 → one-wave `waves.json`, still run via `/workflows`) with no `v2-parallel`/kill-switch predicate.
- [ ] **`.claude/agents/developer.md`** (4 refs) — remove the three "apply under v2 / informational under v1" footers; rules are unconditional.
- [ ] **`.cleargate/knowledge/cleargate-enforcement.md`** (21 refs) — strip residual `v1` advisory lines (§2.7/§2.8 "advisory in v1", §10.2 "Verb-to-Status Map (v1)", §5/§6/§7 v1/v2 conditionals); rewrite §101/§106 to state fan-out is unconditional and **remove the `CLEARGATE_PARALLEL_WAVES` kill-switch clause entirely**.
- [ ] **`.cleargate/knowledge/cleargate-protocol.md`** §23 (9 refs) — rewrite "Parallel-Wave Execution Contract" as *the* (sole) Execution Contract; remove `execution_mode` keying and any fallback language.
- [ ] **`.cleargate/scripts/init_sprint.mjs` (3) + `state.schema.json` (3) + `constants.mjs` (1)** — audit-and-scrub residual `execution_mode` comments/keys (mostly historical; state.json already v3).
- [ ] **Re-sync** canonical → `cleargate-cli/templates/...` payload (`npm run prebuild`) → live `/.claude/` (`cleargate init` or hand-port). Canonical edits do not auto-propagate (BUG-024).
- [ ] Database schema impacts? **No** — no `mcp/`, `admin/`, or DB surface. State is `state.json` (v3, already migrated).
- [ ] Downstream item invalidation: parent **[[EPIC-044]]** (Agent Dispatch Reliability) — informational; EPIC-044 not yet approved, so no story reset needed. No shipped stories depend on the retired vocabulary or the removed fallback.

## Existing Surfaces

> L1 reuse audit. Source-tree implementations this CR modifies. Cite file:line.

- **Surface:** `.cleargate/scripts/launch_wave.mjs:137` — `shouldRunParallel(executionMode, env)` returns `false` unless `executionMode === 'v2-parallel'` (and `CLEARGATE_PARALLEL_WAVES !== 'off'`); the live selector this CR **deletes** so fan-out is unconditional.
- **Surface:** `.claude/skills/sprint-execution/SKILL.md` §2 + §C.0 — the "v1/v2 Mode Switch" section and the serial-vs-parallel kill-switch table; the prose this CR deletes.
- **Surface:** `cleargate-cli/src/commands/execution-mode.ts:16,151` — `type ExecutionMode = 'v1' | 'v2'` + `fm['execution_mode']` parse + `V1_INERT_MESSAGE`; the module whose mode vocabulary is stripped while its path-resolution seam is preserved for its 4 importers.
- **Surface:** `cleargate-cli/src/util/gate-mode.ts:isAdvisory()` — the `CLEARGATE_ADVISORY=1` enforcement break-glass; **NOT touched** (different axis — enforcement strength, not execution).
- **Surface:** `.claude/agents/architect.md:104` — the architect-synth planning-workflow fan-out, currently predicated on `execution_mode: v2-parallel` + kill-switch; becomes unconditional.
- **Why this CR extends rather than rebuilds:** STORY-070-01/CR-070 already established the surgery — retire the conflated field, collapse to one behavior. This CR applies the identical cut to the *second* axis (topology) the first pass deferred, and per the human's 2026-07-17 hard-line direction goes further: it removes the alternate serial path and the env lever, leaving a single unconditional dispatch. No new dispatch machinery is built — EPIC-033's Workflow/`launch_wave` path is the existing one-true-path; this CR removes every way *not* to use it.

## 3. Execution Sandbox

**Modify (canonical first, then payload + live per BUG-024):**
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md`
- `cleargate-planning/.cleargate/scripts/launch_wave.mjs` (+ its unit/integration tests)
- `cleargate-planning/.claude/agents/architect.md`, `cleargate-planning/.claude/agents/developer.md`
- `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md`
- `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md`
- `cleargate-planning/.cleargate/scripts/init_sprint.mjs`, `state.schema.json`, `constants.mjs` (audit + scrub)
- `cleargate-cli/src/commands/execution-mode.ts` (→ neutral module) + import sites `sprint.ts`, `gate.ts`, `story.ts`, `state.ts`
- `cleargate-cli/src/commands/fixtures/SPRINT-99-v1.md`, `SPRINT-99-v2.md`
- Mirror: `cleargate-cli/templates/cleargate-planning/.claude/**` via `npm run prebuild`; live `/.claude/**` via `cleargate init` / hand-port

**Out of scope:** `mcp/`, `admin/`, DB, `gate-mode.ts`/`CLEARGATE_ADVISORY` (enforcement axis, correct as-is), any archived `delivery/archive/**` file (historical accuracy preserved).

## 4. Verification Protocol

**Grep gate (old logic + fallback + lever fully evicted):**
- `grep -rn "execution_mode\|v2-serial\|v2-parallel\|CLEARGATE_PARALLEL_WAVES\|shouldRunParallel" .cleargate/scripts .claude cleargate-cli/src cleargate-planning --exclude-dir=archive --exclude-dir=node_modules` → **zero** hits.
- `grep -rEn "\bv1\b|\bv2\b" cleargate-planning/.claude/skills/sprint-execution/SKILL.md cleargate-planning/.claude/agents/*.md` → no execution-mode gating language remains.
- `grep -rin "fall back\|fallback\|kill-switch\|serial loop" cleargate-planning/.claude/skills/sprint-execution/SKILL.md cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` → no alternate-execution-path language remains.

**Behavior (new logic works):**
- `launch_wave.mjs` has no `shouldRunParallel` export and no `CLEARGATE_PARALLEL_WAVES` read; `launchWave` fans out unconditionally. Unit test updated accordingly.
- Regression: `npm test` green in `cleargate-cli/` after the `execution-mode.ts` → neutral-module rename (4 importers compile; no `ExecutionMode` type leaks).
- `npm run typecheck` clean in `cleargate-cli/`.
- Payload parity: `npm run prebuild` then `git diff --stat` shows the payload mirror byte-matches canonical.

---

## Context Source

> Discovery audit. Direct human direction + verified codebase grounding.

**context_source:** Direct user direction (this session, 2026-07-17): "no naming for execution, it's just execution… enforce running it in /workflows if available… no fallback, no CLEARGATE_PARALLEL_WAVES, we have only one and only execution mode… remove the CLI command if not necessary or change it." Completes [[CR-070]]/[[STORY-070-01]] (enforcement-axis collapse) and consumes [[EPIC-033]]'s Workflow/`launch_wave` one-true-path. Surfaces verified on disk 2026-07-17.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready for Execution** *(pending `approved: true` on human "go".)*

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified. *(EPIC-044 parent, informational — not yet approved; no shipped story depends on the retired vocabulary or the removed fallback.)*
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [ ] `approved: true` is set in the YAML frontmatter. *(awaiting human "go" — set on approval.)*
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
