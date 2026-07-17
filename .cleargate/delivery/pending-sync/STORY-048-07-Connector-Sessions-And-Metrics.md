---
story_id: STORY-048-07
parent_epic_ref: EPIC-048
parent_cleargate_id: "EPIC-048"
sprint_cleargate_id: null
carry_over: false
status: Draft
ambiguity: 🟢 Low
context_source: EPIC-048 (INITIATIVE-001 direct-approval + §6 decisions acked 2026-06-06) + connector/docs/{event-contract,spike-findings-claude-2.1.161,envelope-protocol,auth-seam}.md + verified codebase grounding (M0 daemon on disk)
actor: Connector daemon (on the user's machine)
complexity_label: L3
parallel_eligible: y
expected_bounce_exposure: medium
lane: standard
db_write_set: []
dep_predecessors: []
deferred_verification: []
area: connector
created_at: 2026-06-06T00:00:00Z
updated_at: 2026-06-06T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: existing-surfaces-verified
      detail: "cited paths do not exist on disk: connector/daemon/src/spawn.ts, connector/daemon/src/backend.ts, connector/daemon/src/normalize.ts, connector/daemon/src/sessions.ts, connector/docs/event-contract.md"
  last_gate_check: 2026-06-05T20:14:35Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-048-07
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-05T20:14:34Z
  sessions: []
---

# STORY-048-07: Connector M2 — sessions via --resume + metrics derivation from result.modelUsage
**Complexity:** L3 — two cohesive subsystems (session continuity delegated to `claude` + token/cost/context metrics) keyed off the same `result` record, wired through the already-plumbed-but-unused `resume` param and extending the `result` mapper, with subtle null-vs-0 and never-unlink-the-transcript correctness traps.

## 1. The Spec (The Contract)

### 1.1 User Story
As the Connector daemon on the user's machine, I want to delegate session continuity to `claude` via `--resume` (new / continue / list / reset / delete) and derive turn and session metrics from the authoritative `result.modelUsage` record, so that apps can resume prior context and display accurate token / cost / context figures **without the connector owning a session store or mis-counting subagent tokens**.

### 1.2 Detailed Requirements
- **`sessions.ts` (new — EPIC-048 `<target_files>` create target) — session lifecycle delegated to `claude`:**
  - **New** = run a turn with **no `--resume`**; `claude` mints the `session_id`, which the daemon reads from the `turn_start` event (`normalize.ts` `normalizeSystem` already echoes `session_id`). No connector-side mint.
  - **Continue** = run with `--resume <session_id>` — this flows through the **already-plumbed** `BackendSpawnOpts.resume` (`backend.ts:26`) → `BuildSpawnOpts.resume` → `buildSpawnArgs` which already pushes `["--resume", opts.resume]` (`spawn.ts:75–77`). The only net-new wiring is at the **turn-path** (`index.ts` `handlePrompt`), which today calls `backend.spawn(prompt, { cwd: opts.turnCwd })` with **no resume**; pass through the prompt envelope's `session_id` when present.
  - **List** = enumerate **top-level `<id>.jsonl` only** under `~/.claude/projects/<cwd-hash>/`; **exclude** `<session_id>/subagents/` transcripts and the memory artifact (event-contract §Sessions — "or the list is polluted"). Filename == `session_id` == `--resume` token (verified, spike §B).
  - **Reset** = omit `--resume` (start a fresh session); the prior transcript is untouched.
  - **Delete** = **stop resuming that id only**; **NEVER `unlink` the transcript on disk** — `claude` owns the disk via `cleanupPeriodDays`. There is no connector session store, so "delete" is purely "forget the id for resume."
  - **`<cwd>`-as-dashes path-mangling self-check at startup:** the project-dir name is the cwd with `/` replaced by `-`; assert the daemon's derivation of `<cwd-hash>` matches an existing on-disk dir (or no-op cleanly if none) before serving list requests.
- **`normalize.ts` — extend the `result` mapper for metrics extraction:** today `normalizeResult` (`normalize.ts:246`) maps only `is_error`, `result`, `session_id`. Add a **pure** metrics extractor that reads:
  - **Session/turn totals** from `result.modelUsage.<model>` (**includes subagents**) and `total_cost_usd` (== `modelUsage.costUSD`). **NEVER sum `result.usage`** across turns — it is the main/last-turn slice only (measured: `result.usage.input_tokens` 8,116 main-only vs `modelUsage` 27,628 with subagents — spike §C).
  - **`context_pct`** = latest input tokens ÷ `result.modelUsage.<model>.contextWindow` (present in-stream; 1,000,000 for `opus-4-8[1m]`). **No hardcoded window table.** Marked **derived / display-only / approximate** — not enforced.
  - **Per-agent breakdown** via `task_progress` / `task_notification.usage.total_tokens` keyed by `task_id`, or sum `assistant.usage` by `parent_tool_use_id`.
  - **null vs 0 convention:** `task_notification.usage` is **null** for `local_bash` background tasks (no model tokens) — treat **null (unknown/unsupported) ≠ 0 (measured zero)**. Propagate `null` through; never coerce to 0.
  - **`partial:true` aggregate flag:** when computing a **session** aggregate across turns, set `partial:true` if any turn lacked a derivable metric (missing `modelUsage`, null usage, etc.).
- **`index.ts` — turn-path wiring:** thread the resume token from the prompt envelope into `backend.spawn(prompt, { cwd, resume })`, and on resume-spawn failure fall back to a fresh turn (no `--resume`) rather than hanging (the runner already treats an empty stream as a fatal `spawn_failed` error — `turn-runner.ts:205–215`).

### 1.3 Out of Scope
- **Turn-event resume-from-seq replay (STORY-048-05)** — distinct: 048-05 resumes the **wire/envelope stream** after a reconnect; this story resumes the **`claude` session** (context recall). Do not conflate.
- **Sandboxing / `--allowedTools` policy enforcement (STORY-048-08).**
- **`rate_limit` surfacing, `thinking_delta`, agent sub-stream rendering** beyond the per-agent metric attribution needed here.
- **A connector-owned transcript / session store** — sessions are delegated to `claude` entirely (event-contract §Sessions: "No connector session store").
- **Auto-compaction counter** (never triggered in-box; watch-list, unverified).

### 1.4 Open Questions
The §6 forks are **RESOLVED at the epic level** (all four §6 answers acked by Sandro 2026-06-06). The resolved decisions that bind this story: (a) metrics source is `result.modelUsage` + `total_cost_usd`, never summed `result.usage`; (b) `context_pct` is display-only/approximate, no hardcoded window table; (c) delete never unlinks the transcript (`claude` owns disk via `cleanupPeriodDays`); (d) list excludes `subagents/` + memory. No open questions remain at draft time.

- **Split-trigger note (for the Architect SDR):** this story **deliberately joins two cohesive subsystems** — sessions and metrics — because both key off the same `result` record and the §1.2 requirements are tightly coupled there. The Architect's Story-Decomposition Review SHOULD **split into STORY-048-07 (sessions) + a new STORY-048-0x (metrics)** if *either* half exceeds 5 Gherkin scenarios under decomposition **or** the seam between them proves clean (sessions touches `sessions.ts`/`index.ts`; metrics touches `normalize.ts`/`turn-runner.ts` — minimal overlap). Splits are free pre-execution (no remote IDs).

### 1.5 Risks
- **Risk:** Summing `result.usage` instead of `result.modelUsage` silently undercounts subagent tokens (8,116 vs 27,628 measured).
  - **Mitigation:** A dedicated red test (`metrics-from-modelUsage-not-usage-sum`) asserts totals come from `modelUsage`; a grep/review check confirms no `result.usage` summation path feeds session totals.
- **Risk:** Delete unlinks the transcript — destroying disk `claude` owns and cannot reconstruct.
  - **Mitigation:** Delete is "stop resuming the id" only; a `delete-no-unlink` test asserts the `<id>.jsonl` file still exists on disk after a delete call. No `fs.unlink`/`rm` on a transcript path anywhere in `sessions.ts`.
- **Risk:** Resume of a corrupt / version-mismatched session silently uses stale context.
  - **Mitigation:** Assert the `<id>.jsonl` session file exists before issuing `--resume`; on resume-spawn failure (empty stream → `spawn_failed`), fall back to a fresh turn rather than hanging or serving stale context.
- **Risk:** Coercing `null` usage to `0` reports a measured-zero where the value is unknown.
  - **Mitigation:** A `partial-flag-on-missing-metric` test asserts `null` propagates and the session aggregate is flagged `partial:true`.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Connector sessions via --resume and metrics from result.modelUsage

  Scenario: Resume recalls prior context
    Given a prior session_id with a transcript on disk
    When the daemon runs a turn with --resume <session_id>
    Then the turn is spawned with --resume <session_id> and prior context is preserved

  Scenario: A new turn omits --resume
    Given a prompt with no session_id
    When the daemon spawns the turn
    Then the argv contains no --resume flag and claude mints a fresh session_id

  Scenario: List enumerates top-level transcripts only
    Given a project dir containing <id>.jsonl files, a subagents/ subdir, and a memory artifact
    When the daemon enumerates sessions
    Then it returns the top-level <id>.jsonl ids only
    And it excludes subagents/ transcripts and the memory artifact

  Scenario: Delete stops resuming but never unlinks the transcript
    Given a session id known to the daemon
    When a delete-session request is handled
    Then the daemon stops resuming that id
    And the <id>.jsonl transcript still exists on disk

  Scenario: Metrics derive from modelUsage, not summed usage
    Given a completed turn whose result has modelUsage by model and total_cost_usd
    When the daemon derives metrics
    Then totals come from result.modelUsage.<model> and total_cost_usd
    And result.usage is not summed for the session totals
    And context_pct is flagged display-only/approximate

  Scenario: Missing per-turn metric flags the session aggregate partial
    Given a session whose turns include one with null usage (local_bash background task)
    When the session aggregate is computed
    Then null is preserved as unknown (not coerced to 0)
    And the session aggregate is flagged partial:true
```

### 2.2 Verification Steps (Manual)
- [ ] Run a turn with no `session_id`; inspect argv → no `--resume`. Capture the minted `session_id` from `turn_start`. Re-run with `--resume <that id>` → context recalled.
- [ ] Seed a project dir with `a.jsonl`, `b.jsonl`, `b/subagents/x.jsonl`, and the memory artifact → list returns `[a, b]` only.
- [ ] Call delete on a known id, then `ls ~/.claude/projects/<cwd-hash>/<id>.jsonl` → file still present.
- [ ] Feed a captured `result` with `modelUsage` + a null-usage `task_notification` → derived totals match `modelUsage`, aggregate is `partial:true`.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Session lifecycle (new) | `connector/daemon/src/sessions.ts` |
| Metrics extractor (extend `result` mapper) | `connector/daemon/src/normalize.ts` |
| Turn-path resume wiring (extend) | `connector/daemon/src/index.ts` |
| Resume param (already plumbed, reuse) | `connector/daemon/src/backend.ts`, `connector/daemon/src/spawn.ts` |
| Sessions tests (new) | `connector/daemon/test/sessions.node.test.ts` |
| Metrics tests (new) | `connector/daemon/test/metrics.node.test.ts` |

### 3.2 Technical Logic
The resume plumbing **already exists end-to-end but is unused**: `BackendSpawnOpts.resume` (`backend.ts:26`) forwards to `spawnTurn` (`backend.ts:73–80`), and `buildSpawnArgs` already appends `["--resume", opts.resume]` when `opts.resume !== undefined` (`spawn.ts:75–77`). This story's only spawn-side change is at the **turn path**: `index.ts` `handlePrompt` currently calls `backend.spawn(prompt, { cwd: opts.turnCwd })` (`index.ts:110`) with no resume — thread the prompt envelope's `session_id` through to `{ cwd, resume }`. `sessions.ts` is net-new: it owns `new` (no resume), `continue` (resume), `list` (read the `~/.claude/projects/<cwd-hash>/` dir, keep only top-level `*.jsonl`, drop the `subagents/` subdirs and the memory artifact), `reset` (omit resume), and `delete` (drop the id from the in-memory resume set — **no `fs.unlink`**). The `<cwd-hash>` is the cwd with `/`→`-`; a startup self-check validates the derivation against the on-disk dir name.

For metrics, extend the `result` mapper: today `normalizeResult` (`normalize.ts:246–257`) only reads `is_error`/`result`/`session_id`. Add a pure `extractMetrics(result)` that reads `result.modelUsage.<model>` (per-model, includes subagents) and `total_cost_usd`, computes `context_pct = latestInputTokens / modelUsage.<model>.contextWindow` (flagged display-only), and reads per-agent usage from `task_progress`/`task_notification.usage.total_tokens` keyed by `task_id` (or sums `assistant.usage` by `parent_tool_use_id`). It **never** sums `result.usage` for session totals. A session-aggregate helper folds per-turn metrics and sets `partial:true` if any turn yielded a non-derivable metric; `null` usage (e.g. `local_bash` `task_notification.usage`) is preserved as unknown, never coerced to 0. All of this stays under `connector/**` with no PM-tool SDK (EPIC-027 boundary); it is process + JSON parsing only — no Postgres/Redis.

### 3.3 API Contract (if applicable)

| Surface | Shape |
|---|---|
| `listSessions(cwd)` | `→ string[]` (top-level `<id>` ids only; excludes `subagents/` + memory) |
| `deleteSession(id)` | stops resuming `id`; transcript on disk untouched (no `unlink`) |
| `backend.spawn(prompt, opts)` | reuse — `opts.resume?: string` (already plumbed `backend.ts:26` → `spawn.ts:75`) |
| `extractMetrics(result)` | `→ { totals: byModel, costUsd, contextPct (display-only), perAgent, partial }`; `null` preserved, never coerced |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 6 | resume-recalls-context, new-no-resume, list-excludes-subagents, delete-no-unlink, metrics-from-modelUsage-not-usage-sum, partial-flag-on-missing-metric |
| E2E / acceptance tests | 0 | E2E is the connector E2E story; daemon-level is process + JSON, no broker round-trip needed here |

### 4.2 Definition of Done (The Gate)
- [ ] `--resume` wired through `backend.spawn` → `spawn.ts` (the existing resume param) into the turn path; new / continue / list / reset / delete implemented.
- [ ] Delete NEVER unlinks the transcript; list excludes `subagents/` + memory.
- [ ] Metrics from `result.modelUsage` by model + `total_cost_usd`; `context_pct` display-only/approximate; null-vs-0 honored; `partial:true` aggregate flag.
- [ ] `<cwd>`-as-dashes session-dir path-mangling self-check at startup.
- [ ] Unit tests ≥6: resume-recalls-context, new-no-resume, list-excludes-subagents, delete-no-unlink, metrics-from-modelUsage-not-usage-sum, partial-flag-on-missing-metric.
- [ ] Peer / Architect Review passed (+ split decision recorded if the §1.4 split-trigger fires).

## Existing Surfaces

- **Surface:** `connector/daemon/src/spawn.ts` — `buildSpawnArgs` already appends `["--resume", opts.resume]` (lines 75–77); the resume argv path exists and is tested-clean but **unused** at M0.
- **Surface:** `connector/daemon/src/backend.ts` — `BackendSpawnOpts.resume` (line 26) is already plumbed through `ClaudeBackend.spawn` into `spawnTurn`; net-new wiring is only at the `index.ts` turn path.
- **Surface:** `connector/daemon/src/normalize.ts` — `normalizeResult` (lines 246–257) is the `result` mapper to extend for metrics; `normalizeSystem` already echoes `session_id` (line 196) for new-session capture.
- **Surface:** `connector/daemon/src/sessions.ts` — EPIC-048 `<target_files>` create target (line 66 of the epic); does not exist yet.
- **Surface:** `connector/docs/event-contract.md` §Sessions + §Metrics derivation — the literal delegation + source-of-truth rules implemented here.
- **Coverage of this requirement:** partial — extends the existing resume argv plumbing (`spawn.ts`/`backend.ts`, ~100% reuse, only turn-path wiring net) and the `result` mapper (`normalize.ts`); net-new is `sessions.ts` (list/delete lifecycle) and the metrics extractor.

## Why not simpler?

- **Smallest existing surface that could carry this:** `spawn.ts`/`backend.ts` already carry the `--resume` flag, so resume itself is nearly free — but enumerating/deleting sessions and deriving metrics from `modelUsage` has no existing home; `normalize.ts` only maps records, it does not aggregate.
- **Why isn't extension / parameterization / config sufficient?** The metrics correctness traps (use `modelUsage` not summed `usage`; null≠0; `partial:true`) and the disk-safety invariant (delete must never unlink the transcript `claude` owns) are behavioral logic, not config — the spike proved naive approaches silently undercount and orphan. This needs a net-new `sessions.ts` lifecycle module plus a metrics extractor, not a parameter.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Readied 2026-06-06: the §6 forks are resolved at the EPIC-048 level (metrics source, context_pct display-only, delete-never-unlink, list-excludes-subagents — acked by Sandro), and the M0 daemon modules (`spawn.ts`/`backend.ts`/`normalize.ts`/`index.ts`/`turn-runner.ts`) are on disk with the resume param already plumbed, so the spec is execution-ready.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific file paths traceable to EPIC-048 `<target_files>`.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path (`connector/daemon/src/spawn.ts`, `backend.ts`, `normalize.ts`, `sessions.ts`).
- [x] Why not simpler? has both sub-bullets answered.
- [x] §1.4 granularity decision recorded — kept whole (sessions + metrics) for draft; the split-trigger (>5 Gherkin per half OR clean seam) is **deferred to the Architect SDR**.
