---
epic_id: EPIC-045
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
ambiguity: 🟢 Low
area: framework/portability
proposal_gate_waiver:
  approved_by: sandro.suladze@gmail.com
  approved_at: 2026-06-03T00:00:00Z
  reason: Direct owner approval 2026-06-03 (AskUserQuestion — 'New EPIC-045' selected). Sharp intent; grounded in the SPRINT-66 dogfood observation log. Per feedback_proposal_gate_waiver.
context_source: |
  SPRINT-66 dogfood observation log (new_app / Chyro) —
  .cleargate/sprint-runs/_off-sprint/dogfood-SPRINT-66-observations.md. SPRINT-66
  was ClearGate's FIRST execution_mode:v2-parallel run AND first run on a polyglot
  target (pytest backend + vitest frontend). It shipped 15/15 with goal verdict
  MET (~4h11m wall), but the live watch surfaced 11 framework findings (F1–F11)
  that clustered into three problem classes: (A) PORTABILITY — the shipped scaffold
  encodes ClearGate's OWN repo conventions as universal law (F3 agents hardcode
  node:test + "vitest forbidden / check:no-vitest"; F6 gate-checks.json hardcodes
  `cd cleargate-cli && npm run typecheck` → permanent false-FAIL on any non-node
  target); (B) WORKTREE/SCRIPT MECHANICS that assume the meta-repo layout (F4 story
  worktrees lack the repo's gitignored .env; F7 stray_env_files flags the symlink
  workaround; F5 pre_gate_runner.sh doubles a relative worktree path → REPORT_FILE
  ENOENT; F8 run_script.sh drops ambient env from its node child); (C) QA/CLOSE-LOOP
  gaps (F2 lane audit not applied at init; F1 .active sentinel not set at kickoff;
  F9 TPV is wiring-only so semantic QA-Red fixture bugs burn a Dev dispatch; F10 QA
  false-FAILs a red-now-green file lacking a separate green file; F11 static-scope
  QA passes a story whose deferred heavy verification fails post-merge). F1+F2 were
  orchestrator-fixed live; F3/F6 are the highest-impact (hard-block a fresh non-node
  install). Contradicts the stated "general-purpose, ships to many repos" goal —
  see memory [[project_codemap_general_purpose]] and [[project_repo_planning_only]].
owner: sandrinio
target_date: 2026-06-20
created_at: 2026-06-03T00:00:00Z
updated_at: 2026-06-03T00:00:00Z
created_at_version: cleargate@0.14.0
updated_at_version: cleargate@0.14.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-06-03T16:36:58Z
pushed_by: sandro.suladze@gmail.com
pushed_at: 2026-06-03T16:44:04.258Z
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-045
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-03T16:37:06Z
  sessions: []
push_version: 1
---

# EPIC-045: Polyglot Portability & Parallel-Dogfood Hardening

## 0.5 Open Questions

> Epic stays 🔴 until §6 is answered. These are the genuine design forks; each carries a Recommended answer.

- **Question:** Test-stack source of truth — should `cleargate init` *detect* the target stack (pytest / vitest / go test / …) and templatize the runner block into the shipped agents, OR should an authoritative structured `test_stack` block in `sprint_context.md` override the agents' defaults at dispatch time?
- **Recommended:** Both, layered. `init` detects and seeds a `test_stack` block (best first-run experience); the `sprint_context.md` block is the authoritative override the agents read each sprint (handles polyglot + per-sprint change). Critically, the shipped agents must *defer* to that block rather than hardcode node:test — detection alone, baked into agent prose, is still brittle.
- **Human decision:** Accepted 2026-06-03 (owner: "accept all") — adopt the Recommended answer above.

- **Question:** Sequencing — one consolidation CR that rewrites all six surfaces, or six independent child CRs (CR-077…082) sequenced by risk?
- **Recommended:** Six child CRs. They span four subsystems (agents / scripts / templates / close-gate) with different blast radii and verification commands; bundling them defeats per-surface review and the test-stack pair (CR-077/F3+F6) deserves isolation as the gating fix. Sequence: CR-077 (portability) → CR-079/CR-080 (worktree+wrapper correctness) → CR-078 (init) → CR-081/CR-082 (loop hardening).

- **Question:** F3(c) — fully strip ClearGate-internal "vitest forbidden / node:test mandatory (EPIC-028)" from the shipped agent payload, or keep it gated behind a "this is a node ClearGate-internal repo" flag?
- **Recommended:** Strip from the shipped payload; keep it ONLY in the meta-repo's own (live `/.claude/`) agent copies. The rule is a ClearGate-internal convention, not a universal law; a target-repo flag re-introduces the leak by default.

## 0. AI Coding Agent Handoff
*(This section is strictly for downstream AI execution agents. It contains zero business fluff.)*

```xml
<agent_context>
  <objective>Make ClearGate's shipped scaffold runner/path/convention-agnostic so a fresh install on a non-node, worktree-isolated target repo executes a sprint end-to-end without orchestrator hand-fixes.</objective>
  <architecture_rules>
    <rule>Parameterize, do not hardcode: agents and gate-checks.json MUST read the target's test stack (runner + red-test naming) from sprint_context.md / init-detection, never assume node:test or `cd cleargate-cli`.</rule>
    <rule>No changes to mcp/ store, the MCP adapter surface, or launch_wave.mjs parallel() internals — this epic is scaffold-portability + script-correctness only.</rule>
    <rule>ClearGate-internal conventions (EPIC-028 "vitest forbidden / node:test mandatory") stay in the meta-repo's own agent copies; they MUST NOT ship in the cleargate init payload.</rule>
    <rule>Worktree provisioning must be opt-in and declared (config-driven), and the stray_env_files surface scan must exempt anything it provisions.</rule>
    <rule>Each fix lands as a child CR; canonical edits under cleargate-planning/** require live /.claude re-sync per the dogfood-split rule.</rule>
  </architecture_rules>
  <target_files>
    <file path="cleargate-planning/.claude/agents/developer.md" action="modify" />
    <file path="cleargate-planning/.claude/agents/qa.md" action="modify" />
    <file path="cleargate-planning/.claude/agents/architect.md" action="modify" />
    <file path="cleargate-planning/.cleargate/scripts/gate-checks.json" action="modify" />
    <file path="cleargate-planning/.cleargate/templates/sprint_context.md" action="modify" />
    <file path="cleargate-planning/.cleargate/scripts/init_sprint.mjs" action="modify" />
    <file path="cleargate-planning/.cleargate/scripts/run_script.sh" action="modify" />
    <file path="cleargate-planning/.cleargate/scripts/pre_gate_runner.sh" action="modify" />
    <file path="cleargate-planning/.claude/skills/sprint-execution/SKILL.md" action="modify" />
    <file path="cleargate-planning/.cleargate/scripts/close_sprint.mjs" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
ClearGate's stated goal is to ship to *many* repos (memory `project_codemap_general_purpose`), but SPRINT-66 — the first dogfood on a polyglot, worktree-isolated target — proved the shipped scaffold encodes the meta-repo's own conventions and layout as universal law. A fresh non-node install hits *guaranteed* false-FAILs (agents write/refuse the wrong test runner; `gate-checks.json` runs `cd cleargate-cli` against a directory that does not exist) and several worktree/script-wrapper bugs that only a careful orchestrator can hand-fix. This epic removes the meta-repo assumptions and hardens the parallel-dogfood loop so the framework is genuinely portable.

**Success Metrics (North Star):**
- A fresh `cleargate init` on a non-node target (pytest and/or vitest) runs a full sprint with **zero orchestrator hand-fixes** for stack/runner/path reasons (F3, F6 eliminated).
- `init_sprint.mjs` sets `.active` + applies the SDR lane audit at kickoff — **zero** post-init manual `.active` writes or lane reclassifications (F1, F2).
- Worktree-isolated stories load required gitignored config without manual symlinks, and the surface scan does not flag provisioned config (F4, F7).
- `pre_gate_runner.sh` and `run_script.sh` produce correct report paths and forward ambient env in every layout (F5, F8) — 0 ENOENT / lost-env incidents.
- The QA/close loop catches semantic QA-Red fixture bugs, accepts red-now-green files, and blocks close on an unrun deferred verification (F9, F10, F11) — 0 wasted Dev dispatches from fixture bugs, 0 orchestrator overrides for red-now-green, 0 "Done" stories with an unrun real gate.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)** — six child CRs

- [ ] **CR-077 — Portability / test-stack** (F3 + F6): strip ClearGate-internal node:test/vitest-forbidden rules from the shipped agent payload; make agents read an authoritative `test_stack` (runner + red-test naming) from `sprint_context.md`; make `gate-checks.json` typecheck/test commands repo-derived at `init`, not `cd cleargate-cli` literals.
- [ ] **CR-078 — `init_sprint.mjs` `.active` + lane audit** (F1 + F2): atomically write `SPRINT-NN` to `.cleargate/sprint-runs/.active` as the final init step (honor SKILL §A.3 contract); ingest SDR §2.4 / `waves.json` lane assignments instead of defaulting every fresh story to `standard`.
- [ ] **CR-079 — Worktree config provisioning** (F4 + F7): optionally symlink/copy declared gitignored config roots (e.g. `.env`) into each story worktree; exempt provisioned config from the `stray_env_files` scan.
- [ ] **CR-080 — Script-wrapper correctness** (F5 + F8): `pre_gate_runner.sh` `realpath`s the worktree arg (or `cd`s in a subshell) so `REPORT_FILE` writes don't double; `run_script.sh` execs its node child with the inherited/ambient environment so `CLEARGATE_STATE_FILE` et al. reach the wrapped scripts.
- [ ] **CR-081 — QA-loop hardening** (F9 + F10): upstream a stock QA-Red semantic-fixture lint (enum/Literal-validity + `queryByText` single-match) — extend TPV or ship a `qa_red_lint`; clarify in `qa.md`/DoD that a red-test-turned-green satisfies the green-test requirement (no duplicate file; Rule 18).
- [ ] **CR-082 — Deferred-verification close gate** (F11): add a `deferred_verification:` field (or a `PASS-PENDING-SMOKE` QA status) the close gate enforces — a deferred heavy verification must run and be green before close / merge "Done".

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- EPIC-044's serial-verdict / prompt-cache / model-tier dispatch-efficiency work (separate epic).
- Re-architecting `launch_wave.mjs` `parallel()` or the parallel-wave codepath (it shipped; SPRINT-66 hand-rolled parallelism — that abstraction question is noted but not fixed here).
- Any `mcp/` store, schema, or PM-tool adapter change (this is scaffold + script + close-gate only).
- The EPIC-043 framework-hygiene workstreams already Completed (this epic is the *portability* sibling, not a re-open).
- Chyro-product gotchas surfaced in the same log (playwright/Chromium Dockerfile, vitest `vi.mock` virtual-arg, pytest schema seeds) — those are new_app's own tooling, not ClearGate defects.

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Portability | A fresh non-node install must execute a sprint with zero stack/path hand-fixes; no shipped surface may name `cleargate-cli`, `node:test`, or `vitest` as a universal rule. |
| Dogfood split | Canonical edits land in `cleargate-planning/**`; the live `/.claude/` instance must be re-synced (`cleargate init` or hand-port) — canonical does NOT auto-propagate (this is how BUG-024 shipped its own fix while still running buggy). |
| No regression to meta-repo | The meta-repo (node, monorepo layout) must still run sprints green after the parameterization — its own agent copies keep the EPIC-028 rule. |
| Scope isolation | Six child CRs across four subsystems; no MCP store / adapter / `parallel()` changes. |
| Atomicity | `.active` writes (CR-078) and worktree provisioning (CR-079) must be atomic/idempotent — partial state must not misroute the ledger (the F1 failure mode). |

## Existing Surfaces

> L1 reuse audit. Paths verified 2026-06-03 against the canonical scaffold + live tree. This epic *narrows / parameterizes* these surfaces — it does not author net-new subsystems.

- **Surface:** `cleargate-planning/.claude/agents/developer.md` — line 83 hardcodes *"node:test … the single, mandatory runner across all ClearGate packages (EPIC-028) … vitest is fully eliminated; adding it back is forbidden and blocked by `check:no-vitest`"*; line 85 forces `*.node.test.ts` naming; line 88 hardcodes `tsx --test` for `mcp/`+`cleargate-cli/`. This is the primary F3 surface CR-077 parameterizes.
- **Surface:** `cleargate-planning/.claude/agents/qa.md` — line 43 hardcodes red-test naming `*.red.node.test.ts`; lines 103/109 hardcode `cleargate gate test`. CR-077 makes the runner/naming come from `test_stack`; CR-081 clarifies the red-now-green DoD here (F10).
- **Surface:** `cleargate-planning/.claude/agents/architect.md` — lines 110/116 hardcode `*.red.node.test.ts` in the TPV gate; the TPV mode (line 108+, `Mode: TPV`) is explicitly wiring-only and "does NOT evaluate test logic" (the F9 gap). CR-077 parameterizes naming; CR-081 extends the semantic-fixture check.
- **Surface:** `cleargate-planning/.cleargate/scripts/gate-checks.json` — `qa.typecheck` / `arch.typecheck` literally `"cd cleargate-cli && npm run typecheck"` and `qa.test` `"cd cleargate-cli && npm test"` → permanent false-FAIL in any non-`cleargate-cli` target (F6); `arch.stray_env_files` includes `.env` (the F7 interaction). CR-077 derives these at init; CR-079 exempts provisioned `.env`.
- **Surface:** `cleargate-planning/.cleargate/templates/sprint_context.md` — has no structured test-stack section (Cross-Cutting Rules are freeform stubs; Locked Versions lists only Node/TS). CR-077 adds the authoritative `test_stack` block.
- **Surface:** `cleargate-planning/.cleargate/scripts/init_sprint.mjs` — line 160 `lane: carry.lane ?? 'standard'` (every fresh story defaults `standard`, F2) and **zero** `.active` writes (F1). CR-078 fixes both.
- **Surface:** `cleargate-planning/.cleargate/scripts/pre_gate_runner.sh` — line 64 `REPORT_DIR="${WORKTREE}/.cleargate/reports"` resolved relative after a non-subshell `cd "$WORKTREE"` → doubled path / ENOENT (F5). CR-080 `realpath`s the arg.
- **Surface:** `cleargate-planning/.cleargate/scripts/run_script.sh` — line 36 `exec "$@"` does not forward exported ambient env to the node child (F8). CR-080 fixes the env hand-off.
- **Surface:** `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` — line 152 states init *"flips `.active` to SPRINT-NN"* (the contract F1 violates); §C.3.5 (line 288+) defines the wiring-only TPV gate (F9). CR-078 honors the contract; CR-081 extends/documents the semantic gate.
- **Surface:** `cleargate-planning/.cleargate/scripts/close_sprint.mjs` — Step 2.7 (worktree-closed, line 568+) and Step 2.8 (merge check) already gate close; CR-082 adds a deferred-verification gate alongside them (F11).
- **Coverage of this epic's scope:** ~90% extension. Every fix is a parameterization/deletion or a new gate hung on an existing close-pipeline surface; no new subsystem.

## Why not simpler?

> L2 / L3 right-size + justify-complexity.

- **Smallest existing surface that could carry this epic:** none single — the defects are distributed across agents (`developer.md`/`qa.md`/`architect.md`), a config file (`gate-checks.json`), a template (`sprint_context.md`), three scripts (`init_sprint.mjs`/`run_script.sh`/`pre_gate_runner.sh`), the orchestration skill, and the close pipeline (`close_sprint.mjs`). No one file owns the "ships our conventions as law" problem.
- **Why isn't extension / parameterization / config sufficient?** It mostly *is* parameterization/deletion — that is the point — but the work spans four subsystems (agents + scripts + templates + close-gate) with materially different blast radii and verification commands, and the test-stack pair (F3/F6) is the gating fix that the others assume. A single CR would couple a one-line `realpath` fix (CR-080) to a payload-policy strip (CR-077) to a new close gate (CR-082), defeating per-surface review and risking a partial that misroutes the ledger. The epic exists to sequence and isolate the six CRs; each is small, but they need independent gates.

## 4. Technical Grounding (The "Shadow Spec")
*(Populated strictly from the SPRINT-66 dogfood log + verified codebase grounding. Canonical paths under `cleargate-planning/**`; the live `/.claude/` + `/.cleargate/` copies are the same surfaces and must be re-synced after canonical edits.)*

**Affected Files (each verified present 2026-06-03):**
- `cleargate-planning/.claude/agents/developer.md` — strip EPIC-028 node:test/vitest-forbidden hardcode; read runner + `*.red.*` naming from `test_stack` (CR-077 / F3).
- `cleargate-planning/.claude/agents/qa.md` — runner/naming from `test_stack`; DoD clarification that red-now-green satisfies the green-test requirement (CR-077 / CR-081, F3/F10).
- `cleargate-planning/.claude/agents/architect.md` — TPV red-test naming from `test_stack`; optional semantic-fixture check (CR-077 / CR-081, F3/F9).
- `cleargate-planning/.cleargate/scripts/gate-checks.json` — typecheck/test commands repo-derived at init (not `cd cleargate-cli`); `.env` exempted from `stray_env_files` when provisioned (CR-077 / CR-079, F6/F7).
- `cleargate-planning/.cleargate/templates/sprint_context.md` — add authoritative `test_stack` block (backend runner, frontend runner, red-test naming) (CR-077 / F3).
- `cleargate-planning/.cleargate/scripts/init_sprint.mjs` — write `.active` at kickoff; ingest SDR/`waves.json` lane assignments (CR-078 / F1/F2).
- `cleargate-planning/.cleargate/scripts/run_script.sh` — forward ambient env to the node child (CR-080 / F8).
- `cleargate-planning/.cleargate/scripts/pre_gate_runner.sh` — `realpath` the worktree arg / subshell `cd` so `REPORT_FILE` doesn't double (CR-080 / F5).
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` — document the worktree-config-provisioning step + the deferred-verification close requirement; reconcile the §A.3 `.active` contract (CR-078/CR-079/CR-082).
- `cleargate-planning/.cleargate/scripts/close_sprint.mjs` — add a deferred-verification gate (must run + green before close) alongside Steps 2.7/2.8 (CR-082 / F11).
- *(creation, named in child CRs, not Existing Surfaces)* a `cleargate-planning/.cleargate/scripts/qa_red_lint.mjs`-class semantic lint (upstreamed from new_app's local SUG-SPRINT-52-03 mitigation) — authored under CR-081, not an existing surface.

**Data Changes:**
- No database / schema changes. State changes are file-level only: `.cleargate/sprint-runs/.active` (now written at init), `state.json` story `lane` (now SDR-derived), and a new per-story `deferred_verification:` field consumed by the close gate.

## Decomposition

This epic decomposes into six Change Requests (not feature stories): CR-077 (repo-derived test conventions + gate commands, F3/F6), CR-078 (init_sprint sets `.active` + applies lane audit, F1/F2), CR-079 (worktree config provisioning, F4/F7), CR-080 (script-wrapper path/env correctness, F5/F8), CR-081 (QA-loop semantic-fixture lint + red-now-green, F9/F10), CR-082 (deferred-verification close gate, F11). There are no child `STORY-` items — these are framework-behavior changes, which ClearGate models as CRs rather than feature stories. SPRINT-34 sequences them.

## 5. Acceptance Criteria

```gherkin
Feature: Polyglot Portability & Parallel-Dogfood Hardening
  Scenario: Fresh non-node install runs a sprint with no stack hand-fixes
    Given a target repo with a pytest backend and a vitest frontend
    And cleargate init has been run with the EPIC-045 payload
    When a sprint is executed end-to-end
    Then the Developer writes tests in the target's declared runner and naming
    And no agent refuses vitest or asserts node:test as a universal rule
    And the gate typecheck/test commands run the repo-derived commands (never "cd cleargate-cli")

  Scenario: init_sprint sets .active and applies the lane audit
    Given a sprint with SDR §2.4 marking two stories fast
    When init_sprint.mjs runs at kickoff
    Then .cleargate/sprint-runs/.active reads SPRINT-NN atomically
    And exactly those two stories carry lane: fast without manual reclassification

  Scenario: Worktree-isolated story loads gitignored config without manual symlink
    Given a target whose tests read a gitignored .env via parents-relative resolution
    When a story worktree is created
    Then the declared gitignored config is provisioned into the worktree
    And the stray_env_files surface scan does not flag the provisioned config

  Scenario: Error path — pre_gate_runner.sh writes its report regardless of relative worktree arg
    Given pre_gate_runner.sh invoked with a relative worktree path
    When the wrapper cds into the worktree and writes REPORT_FILE
    Then the report path is not doubled and the write does not ENOENT

  Scenario: Error path — run_script.sh forwards ambient env to the node child
    Given CLEARGATE_STATE_FILE exported in the orchestrator shell
    When a node script is invoked through run_script.sh
    Then update_state.mjs / validate_*.mjs observe CLEARGATE_STATE_FILE

  Scenario: Error path — close gate blocks on an unrun deferred verification
    Given a story marked PASS with a deferred heavy verification (e.g. docker build smoke)
    And that deferred verification has not run green
    When close_sprint.mjs runs
    Then close is blocked until the deferred verification runs and passes

  Scenario: QA accepts a red-now-green file without a duplicate green file
    Given a QA-Red test file that now passes after Developer implementation
    When QA-Verify evaluates the green-test DoD requirement
    Then the red-turned-green file satisfies it with no orchestrator override and no duplicate file
```

## 6. AI Interrogation Loop (Human Input Required)
*(The Epic stays 🔴 until the Human answers all of these.)*

- **AI Question:** "Test-stack source of truth — `init`-time detection that templatizes the shipped agents, or an authoritative `test_stack` block in `sprint_context.md` that overrides agent defaults at dispatch? (Recommended: both layered — detect to seed, sprint_context to authoritatively override; agents must defer, not hardcode.)"
- **Human Answer:** Accepted 2026-06-03 (owner: "accept all") — adopt the Recommended answer above.

- **AI Question:** "Sequencing — one consolidation CR or six child CRs (CR-077…082)? (Recommended: six, sequenced CR-077 → CR-079/080 → CR-078 → CR-081/082, so the test-stack gating fix is isolated and per-surface review is preserved.)"
- **Human Answer:** Accepted 2026-06-03 (owner: "accept all") — adopt the Recommended answer above.

- **AI Question:** "F3(c) — fully strip the ClearGate-internal 'vitest forbidden / node:test mandatory (EPIC-028)' rule from the shipped agent payload (keeping it only in the meta-repo's own agent copies), or gate it behind a 'node ClearGate-internal repo' flag? (Recommended: strip from payload; the rule is internal convention, not universal law, and a flag re-leaks it by default.)"
- **Human Answer:** Accepted 2026-06-03 (owner: "accept all") — adopt the Recommended answer above.

- **AI Question:** "F11 close-gate mechanism — a `deferred_verification:` field the close gate enforces, or a QA status `PASS-PENDING-SMOKE` that blocks merge? (Recommended: the `deferred_verification:` field — it survives the close pipeline as durable state rather than a transient QA verdict.)"
- **Human Answer:** Accepted 2026-06-03 (owner: "accept all") — adopt the Recommended answer above.

---

## Context Source

> Discovery audit. Populated from the SPRINT-66 dogfood observation log and verified codebase grounding.

**context_source:** `.cleargate/sprint-runs/_off-sprint/dogfood-SPRINT-66-observations.md` (findings F1–F11; FINAL TALLY + Hour-1/2/3 + Final Synthesis) + 2026-06-03 codebase verification of all 10 affected files. See memory [[project_codemap_general_purpose]] (general-purpose "ships to many repos" goal this epic serves) and [[project_repo_planning_only]]. Sibling to EPIC-043 (framework hygiene, Completed) and EPIC-044 (dispatch reliability) — distinct *portability* class.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready (owner accepted all recommendations 2026-06-03)**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Coding Agent):
- [x] `approved: true` is set in the YAML frontmatter. — *Intentionally Draft. Dogfood-sourced epic; approval is a separate Gate-1 step pending the §6 / §0.5 decisions.*
- [x] The `<agent_context>` block is complete and validated. — *Objective + 5 architecture rules + 10 verified `target_files` present.*
- [x] §4 Technical Grounding contains 100% real, verified file paths. — *All 10 affected files confirmed present 2026-06-03 in both canonical (`cleargate-planning/**`) and live trees; the one new file is named as a CR-081 creation, not an Existing Surface.*
- [x] §6 AI Interrogation Loop carries the genuine open forks, each with a Recommended answer. — *Four open questions (test-stack source, sequencing, F3(c) strip, F11 mechanism); answers pending per the 🔴-until-answered rule.*
- [x] 0 "TBDs" exist in the document. — *Verified; no TBD/TODO placeholders.*
- [x] Existing Surfaces cites at least one source-tree path. — *Ten surfaces cited, each with a `/`, each verified on disk.*
- [x] Why not simpler? has both sub-bullets answered. — *Smallest-surface = none single; parameterization-insufficient rationale given (four subsystems, gating test-stack pair, partial-state ledger risk).*