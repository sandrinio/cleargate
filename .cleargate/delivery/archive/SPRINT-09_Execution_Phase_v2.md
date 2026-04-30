---
sprint_id: "SPRINT-09"
remote_id: null
source_tool: "local"
status: "Completed"
start_date: "2026-04-21"
end_date: "2026-04-21"
activated_at: "2026-04-21T00:00:00Z"
completed_at: "2026-04-21T08:30:00Z"
synced_at: null
created_at: "2026-04-21T00:00:00Z"
updated_at: "2026-04-21T00:00:00Z"
created_at_version: "post-SPRINT-08"
updated_at_version: "post-SPRINT-08"
context_source: "EPIC-013_Execution_Phase_v2.md"
epics: ["EPIC-013"]
approved: true
approved_at: "2026-04-21T00:00:00Z"
approved_by: "sandro"
execution_mode: "v1"
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
sprint_cleargate_id: "SPRINT-09"
---

# SPRINT-09: Execution Phase v2 — Bounce Loop, Worktrees, Pre-Gates, Self-Improvement

## Sprint Goal

Ship **EPIC-013 (Execution Phase v2)** — port V-Bounce's mechanized execution primitives (worktree-per-story, pre-gate scanner, `state.json` + independent bounce counters, circuit-breaker Blockers Report, immediate flashcard gate, user walkthrough, mid-sprint CR triage, sprint-close self-improvement pipeline, Architect Sprint Design Review) into `cleargate-planning/` scaffold + `cleargate-cli/` wrappers + live `.cleargate/` dogfood, all guarded behind `execution_mode: v2` so SPRINT-10 can be the first validation run without risking SPRINT-09 itself.

After this sprint: the framework can measure its own quality (bounce ratio, correction tax, first-pass success), refine its own process (`suggest_improvements.mjs` runs every close), and isolate stories safely (`.worktrees/STORY-NNN-NN/`) — setting up every future sprint to be cheaper and more auditable than the last.

## Consolidated Deliverables

### EPIC-013 — Execution Phase v2 (9 stories)

**M1 — Infrastructure (4 stories)**

- [`STORY-013-01`](STORY-013-01_Worktree_Branch_Hierarchy.md): Git worktree + branch hierarchy — `.worktrees/STORY-NNN-NN/` on `story/*` branches cut from `sprint/S-XX`; `developer.md` + protocol §10 + `.gitignore` updated · **L3**
- [`STORY-013-02`](STORY-013-02_State_Json_Bounce_Counters.md): `state.json` schema + `init_sprint.mjs` + `update_state.mjs` + `validate_state.mjs` + `validate_bounce_readiness.mjs` — terminal-state list, independent `qa_bounces` / `arch_bounces` with 3-strike escalation · **L3**
- [`STORY-013-03`](STORY-013-03_Run_Script_Wrapper_PreGate.md): `run_script.sh` wrapper (stdout/stderr split, diagnostic block, self-repair recipes) + `pre_gate_runner.sh qa|arch` + `gate-checks.json` — Node+TS-only stack detection · **L2**
- [`STORY-013-04`](STORY-013-04_Sprint_Context_Adjacent_Impl.md): `.cleargate/templates/sprint_context.md` + per-sprint `sprint-runs/<id>/sprint-context.md` auto-inject into every agent brief + Architect's adjacent-implementation check (scan already-merged stories for reusable modules) · **L2**

**M2 — Agent + protocol changes (5 stories)**

- [`STORY-013-05`](STORY-013-05_Orchestrator_Interrupt_Handling.md): Orchestrator interrupt handling — circuit breaker in `developer.md` (50-tool-call heuristic + Blockers Report) · Blockers triage in `architect.md` · user walkthrough on sprint branch (`UR` events) · mid-sprint CR triage (Bug / Spec-Clarification / Scope-Change / Approach-Change, `CR` events) — protocol §§12–13 · **L3**
- [`STORY-013-06`](STORY-013-06_Immediate_Flashcard_Gate.md): Immediate flashcard hard-gate between stories — `flashcards_flagged` required in Dev + QA report frontmatter; orchestrator cannot create next worktree until flagged cards are approved/rejected; protocol §11 · **L2**
- [`STORY-013-07`](STORY-013-07_Sprint_Report_Close_Pipeline.md): Sprint Report v2 template + `prefill_report.mjs` + `close_sprint.mjs` (refuse non-terminal state, archive report pre-flip, auto-run `suggest_improvements.mjs`) + three-source token reconciliation with >20% divergence flag + `reporter.md` rewrite against new template · **L3**
- [`STORY-013-08`](STORY-013-08_Execution_Mode_Flag.md): `execution_mode: v1 | v2` frontmatter on Sprint Plan template + orchestrator gate that routes v1 vs v2 loops + `cleargate-cli` wrappers (`sprint init|close`, `story start|complete`, `gate qa|arch`, `state update|validate`) · **L2**
- [`STORY-013-09`](STORY-013-09_Sprint_Planning_v2.md): Sprint Planning v2 — Architect Sprint Design Review (writes §2 Execution Strategy with phase plan + merge-ordering from shared-file surface analysis + ADR-conflict flags) · story template gains `parallel_eligible` + `expected_bounce_exposure` · Sprint Plan template gains §2 + new §1 columns · protocol §2 Gate-2 becomes enforcing for v2 sprints · **L2**

**Total: 9 stories, 1 Epic. Complexity: 4 × L3 + 5 × L2.**

## Milestones

- **M1 — Infrastructure (STORY-013-01 → 04).** Scaffold-first: land all scripts, templates, state schema, agent-spec shells. No v2 behavior is live yet — agents can still run on v1. Milestone ends when all four stories have passed QA + Architect and landed in `cleargate-planning/`.
- **M2 — Agent + protocol changes (STORY-013-05 → 09).** Wires behavior on top of M1 infrastructure. `execution_mode: v2` flag (STORY-013-08) ships LAST — only after 05/06/07/09 have merged — so turning v2 on is a single-line change, not a migration. Milestone ends when all five stories pass and Reporter confirms `close_sprint.mjs` can run against itself.

### Execution Ordering (strict within milestones)

**M1:** `STORY-013-01` (worktree + protocol §10) → `STORY-013-02` (state.json schema) → `STORY-013-03` (script wrapper + pre-gate) → `STORY-013-04` (sprint context + adjacent-impl). 01 first because protocol §10 is the foundation every other story references. 02 before 03 because pre-gate scripts read `state.json`. 04 last because it extends `architect.md` which 01 also touches — do it after 01 to avoid merge-conflict noise.

**M2:** `STORY-013-05` → `STORY-013-07` → `STORY-013-09` → `STORY-013-06` → `STORY-013-08`. 05 first — defines the orchestrator rules 06/07/09 reference. 07 after 05 (sprint-close pipeline needs the event-type vocabulary from 05's mid-sprint CR triage). 09 (planning v2) after 05/07 to anchor Sprint Design Review to the same event-type + state-transition vocabulary. 06 (flashcard gate) second-to-last — smallest delta, fewest dependencies. 08 last — flips the flag that routes everything.

### Surface-Landing Order (per milestone)

Each story lands changes in this order: (1) **`cleargate-planning/`** (canonical scaffold) → (2) **`cleargate-cli/`** (wrappers/commands, if any) → (3) **`.cleargate/`** (live dogfood, pulled via `cleargate upgrade` once M1 closes). This sequence is a story-level acceptance criterion on every story.

## Risks & Dependencies

**Status legend:** `open` · `mitigated` · `hit-and-handled` · `did-not-fire`. QA updates column at each milestone; reporter audits at sprint close.

| ID | Risk | Mitigation | Owner | Status |
|---|---|---|---|---|
| R1 | **SPRINT-09 itself runs on v1 while building v2** — developer agents may reach for new v2 commands (`cleargate sprint init`, `state update`) that don't exist yet. | Every M2 story's task file explicitly states: "SPRINT-09 executes under `execution_mode: v1`. Do not invoke v2 commands mid-sprint." Orchestrator gates: if a developer agent's tool log shows `cleargate sprint init` during SPRINT-09, QA kicks back. Flashcard (`#execution #dogfood`) captures the rule. | **STORY-013-08** + **orchestrator** | `open` |
| R2 | **Nested `mcp/` repo + worktrees are a known git footgun.** EPIC-013 Q3 resolved this (single outer-repo worktree; edit `mcp/` inside it normally), but an agent may still try `git worktree add` inside `mcp/` by habit. | STORY-013-01 ships a flashcard (`#worktree #mcp`) with the rule BEFORE `.worktrees/` starts getting used. `.gitignore` + protocol §10 both carry the rule in prose. No story in SPRINT-09 exercises worktrees against `mcp/` — deferred to SPRINT-10 validation. | **STORY-013-01** | `open` |
| R3 | **`state.json` schema lock-in.** Once STORY-013-02 ships, every M2 story depends on the field names + shape. A mid-sprint schema change ripples through 05/06/07/08/09. | STORY-013-02 acceptance criteria includes the full v1 schema inline in `schema.json` with a version field (`"schema_version": 1`) — any future change bumps the field, no silent edits. Architect M1 plan reviews schema before dev spawn. | **STORY-013-02** | `open` |
| R4 | **`.worktrees/` gitignore collides with existing patterns.** Current `.gitignore` has many entries; a bad precedence collision could track worktree content accidentally. | STORY-013-01 acceptance scenario: `git status` inside a populated `.worktrees/STORY-FAKE-01/` reports zero tracked files. CI's existing typecheck-on-clean-tree run detects untracked-but-should-be-ignored drift. | **STORY-013-01** | `open` |
| R5 | **`suggest_improvements.mjs` write conflicts.** Script writes `.cleargate/sprint-runs/<id>/improvement-suggestions.md` which the user may be editing manually to approve/reject items. | Script is auto-append-only — never rewrites existing sections. Each suggestion gets a stable ID (`SUG-<sprint>-<n>`); reruns that produce the same ID are no-ops. Acceptance scenario: run twice on same sprint, second run produces no new entries. | **STORY-013-07** | `open` |
| R6 | **`cleargate-cli` command collision.** New `sprint`, `story`, `gate`, `state` command groups may collide with existing CLI surfaces or future reservations. | STORY-013-08 audits `cleargate-cli/src/commander.ts` for conflicts pre-impl; any collision forces a rename rather than silent override. All new commands gated behind `execution_mode: v2` → inert under v1, zero behavioral change to existing users until flag flips. | **STORY-013-08** | `open` |
| R7 | **Architect Sprint Design Review has no test target inside SPRINT-09.** STORY-013-09 ships the Architect contract but SPRINT-09 itself was planned under v1 rules — there's no live v2 plan to validate against. | STORY-013-09 DoD includes a **dry-run acceptance**: Architect generates SPRINT-10's Execution Strategy §2 using the new contract as the story's final scenario. Output lives at `.cleargate/sprint-runs/S-09/sprint-10-design-review-dryrun.md` — reviewed by user, not auto-promoted. | **STORY-013-09** | `open` |
| R8 | **Reporter rewrite regresses SPRINT-09's own close.** STORY-013-07 rewrites `reporter.md` against the new template — if buggy, SPRINT-09 itself can't close cleanly. | Fallback: keep the current `.claude/agents/reporter.md` unchanged until STORY-013-07's final scenario (self-run on a captured SPRINT-08-shaped fixture) passes. Only THEN swap the agent spec. Reporter for SPRINT-09 runs on the new spec after the swap — if it fails, roll back the agent spec and run the old Reporter; STORY-013-07 is returned to developer. | **STORY-013-07** | `open` |
| R9 | **Three-surface landing creates long-lived drift.** Changes must reach `cleargate-planning/`, `cleargate-cli/`, and `.cleargate/` — if one surface lags, the dogfood diverges from the scaffold. | Every story's DoD includes all three landing points (grep for `cleargate-planning/.../<file>`, `cleargate-cli/src/...`, and `.cleargate/<file>`). Reporter's §1 "What Was Delivered" must list all three for every story or flag the missing surface as a Framework Self-Assessment finding. | **every story** | `open` |
| R10 | **Sprint scope too wide for one sprint** — 9 stories (4 × L3 + 5 × L2) is at the upper end of what SPRINT-01..08 have sustained. Bounce + correction-tax compounding risk. | Checkpoint at M1 close: if M1 took >60% of sprint budget (wall-clock or tokens), defer STORY-013-09 (planning v2, 🟡 medium-priority — it enables SPRINT-10's v2 plan but doesn't block SPRINT-10 running on v1 if needed). Reporter flags the defer in §3. | **orchestrator** | `open` |

**Dependencies:**

- SPRINT-08 shipped EPIC-011 (end-to-end production readiness). Existing infra: token-ledger hook on SubagentStop, flashcard skill, four-agent definitions, wiki ingest/lint/query subagents.
- EPIC-013 `<agent_context>` pins 15 target files across `.claude/agents/`, `.cleargate/knowledge/`, `.cleargate/templates/`, `.cleargate/scripts/`. All new scripts are `.mjs` + `.sh`; no new runtime deps (Node built-ins + git).
- V-Bounce Engine — `github.com/sandrinio/V-Bounce-Engine@main`. Architect pins the exact HEAD SHA during M1 planning (per EPIC-013 §Ambiguity Gate open-item).
- No MCP adapter changes. No wiki-writer changes. No admin-UI changes.
- External infra: none. Sprint is entirely local-repo mechanics.

## Metrics & Metadata

- **Expected Impact:** After SPRINT-09 merges, `cleargate-planning/` contains a complete v2 execution loop. SPRINT-10 becomes the first sprint planned with `execution_mode: v2`, which will (a) isolate stories into `.worktrees/`, (b) gate QA/Architect spawns behind a pre-scan, (c) emit a Sprint Report with bounce ratio + correction tax + first-pass success rate, (d) auto-run `suggest_improvements.mjs` at close. Every sprint from SPRINT-10 onward gets cheaper, more auditable, and self-refining.
- **Priority Alignment:** Platform priority = **Critical** (every future sprint rides on this loop). Codebase priority = **High** (no user-facing surface; process infrastructure only, but compounding).
- **Token budget:** Target ≤1.5M total tokens. SPRINT-08 baseline was ~820k for 4 stories; 9 stories at similar per-story cost = ~1.85M — budget trims 20% via the pre-gate scanner catching mechanical failures before QA/Architect spawn (the whole point).
- **Budget guardrail:** if actual >1.8M by M1 close, orchestrator invokes R10 (defer STORY-013-09).

## Definition of Done

Sprint-level DoD (in addition to per-story DoD):

- [ ] All 9 stories `STORY-013-01..09` have status `Done` in sprint markdown §1 and terminal state in whatever state.json artefacts exist post-STORY-013-02.
- [ ] `npm run typecheck` green in `cleargate-cli/`, `cleargate-planning/`, `admin/`.
- [ ] `cleargate-planning/` contains the canonical scaffold; `cleargate-cli/` publishes the wrapper commands; `.cleargate/` has received all changes via `cleargate upgrade` (or manual patch if upgrade itself depends on unshipped work). R9 closure confirmed for every story.
- [ ] `execution_mode: v2` flag is **present and inert** — SPRINT-09 ran under v1, but a test Sprint Plan with `execution_mode: v2` set can be parsed and routed by the orchestrator (STORY-013-08 acceptance scenario).
- [ ] Architect Sprint Design Review dry-run for SPRINT-10 exists at `.cleargate/sprint-runs/S-09/sprint-10-design-review-dryrun.md` (STORY-013-09 R7 closure).
- [ ] REPORT.md written against the new Sprint Report v2 template BEFORE sprint status flips to Completed (the very rule we're shipping — SPRINT-09 dogfoods it).
- [ ] `.cleargate/sprint-runs/S-09/improvement-suggestions.md` generated by `suggest_improvements.mjs` on sprint close. User reviews verbally; approvals feed a SPRINT-10 scope input.
- [ ] Every story's flashcards processed at the Step-5.5-equivalent gate (we're building this rule during the sprint — apply it manually from STORY-013-06 onwards, as a dogfood check).
- [ ] `FLASHCARD.md` gains ≥2 new entries (minimum — expect more given the R1/R2 risk surface).

---

## Execution Guidelines (Local Annotation — Not Pushed)

### Starting Point

**Begin with STORY-013-01 (worktree + branch hierarchy).** This is the foundation: `protocol §10` is the reference every other M1 story cites. Until it lands, Architect cannot ground subsequent plans against a live rule.

The first Architect pass produces `.cleargate/sprint-runs/S-09/plans/M1.md` covering stories 01–04 as a coherent milestone. Dev spawns happen sequentially within M1 for SPRINT-09 itself (SPRINT-09 is v1 — no parallel worktrees yet). The first *sprint* that exercises parallelism is SPRINT-10.

### Relevant Context

- **V-Bounce Engine** (`github.com/sandrinio/V-Bounce-Engine@main`) — primary reference, cited inline in EPIC-013 §4.2. Architect pins HEAD SHA during M1 planning.
- **EPIC-013** (`.cleargate/delivery/pending-sync/EPIC-013_Execution_Phase_v2.md`) — this sprint's sole scope. Every story traces back to a §2 in-scope bullet + a §4.2 reference row.
- **Current agent definitions** (`.claude/agents/architect.md`, `developer.md`, `qa.md`, `reporter.md`) — patched in place. Not rewritten.
- **Current protocol** (`.cleargate/knowledge/cleargate-protocol.md`) — protocol §§10–13 appended. Existing §§1–9 untouched.
- **SPRINT-08 REPORT.md** — baseline for token budget, bounce rate (we had none; this sprint starts measuring).

### Constraints

- **SPRINT-09 runs on v1.** This sprint cannot use its own output mid-sprint. Resist the temptation to invoke new scripts before they've been merged + released. R1 flashcard enforces.
- **No MCP / wiki / admin-UI changes.** This is execution-loop only. Hard boundary in EPIC-013 §0 architecture_rules.
- **No new runtime dependencies** across any package. All new code is Node built-ins + git + bash.
- **Three-surface landing is mandatory** (R9). A story is not Done until the change lives in `cleargate-planning/` + `cleargate-cli/` + `.cleargate/`. Missing any → kicked back.
- **Reversibility.** Every M2 story's v2 behavior is gated behind `execution_mode: v2`. Under v1 (SPRINT-09 itself and any not-yet-migrated consumer project), behavior is unchanged.
- **Sprint report is written BEFORE state → Completed.** This is the v2 rule, we dogfood it now. Reporter spawns immediately after STORY-013-09 merges; user reviews; only then does the orchestrator archive the sprint.
