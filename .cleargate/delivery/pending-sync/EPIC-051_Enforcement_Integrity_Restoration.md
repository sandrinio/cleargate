---
epic_id: EPIC-051
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Active
approved: true
ambiguity: 🟢 Low
context_source: framework self-audit 2026-07-17 (46 verified findings, artifact 47060f0b) + [[CR-070]] execution_mode collapse + [[CR-074]] topology retirement + [[EPIC-043]] WS8 gate-integrity precedent + recorded direct approval (proposal gate waived per direct-Epic-request)
area: framework/enforcement
proposal_gate_waiver: true
approved_by: sandrinio
approved_at: 2026-07-17T00:00:00Z
owner: sandrinio
target_date: 2026-07-31
created_at: 2026-07-17T00:00:00Z
updated_at: 2026-07-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-07-17T19:58:54Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-051
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-07-17T19:58:54Z
  sessions: []
---

# EPIC-051: Enforcement Integrity Restoration (post-CR-074)

## 0. AI Coding Agent Handoff
*(This section is strictly for downstream AI execution agents. It contains zero business fluff.)*

```xml
<agent_context>
  <objective>Close the gap between "documented as enforced" and "actually enforced" that CR-070/CR-074's execution_mode retirement opened: restore the pre-commit gates that silently went advisory, purge dead v1/v2 vocabulary, and add a guard so canonical→live/payload drift cannot recur.</objective>
  <architecture_rules>
    <rule>CLEARGATE_ADVISORY=1 is the ONLY sanctioned enforcement-strength lever post-CR-074; do not reintroduce execution_mode / v1 / v2 / CLEARGATE_PARALLEL_WAVES / CLEARGATE_EXEC_MODE as behavior switches.</rule>
    <rule>Every canonical edit under cleargate-planning/** must be mirrored to the npm payload via `npm run prebuild` and hand-synced to the live /.claude|/.cleargate copies (dogfood split — see CLAUDE.md).</rule>
    <rule>Real infra, no mocks for gate tests; node:test only (*.node.test.ts via tsx). Vitest is forbidden (EPIC-028).</rule>
    <rule>No new database tables or columns — this epic is scripts, hooks, docs, templates, and CLI only.</rule>
  </architecture_rules>
  <target_files>
    <file path="cleargate-planning/.cleargate/scripts/file_surface_diff.sh" action="modify" />
    <file path="cleargate-planning/.cleargate/scripts/test_ratchet.mjs" action="modify" />
    <file path="cleargate-planning/.cleargate/scripts/assert_story_files.mjs" action="modify" />
    <file path="cleargate-planning/.cleargate/templates/Sprint Plan Template.md" action="modify" />
    <file path="cleargate-cli/src/lib/lifecycle-reconcile.ts" action="modify" />
    <file path="cleargate-cli/src/commands/doctor.ts" action="modify" />
    <file path="CLAUDE.md" action="modify" />
    <file path="cleargate-planning/CLAUDE.md" action="modify" />
    <file path="cleargate-planning/.cleargate/knowledge/cleargate-protocol.md" action="modify" />
    <file path="cleargate-planning/.cleargate/knowledge/readiness-gates.md" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
A 2026-07-17 six-lens self-audit (53 agents, 46 verified findings, 0 refuted) found that CR-070/CR-074 retired the `execution_mode`/v1/v2 axis in code but left the enforcement layer half-wired: multiple pre-commit gates the docs call **"Always enforced"** now silently do nothing, dead v1/v2 vocabulary litters ~15 shipping surfaces (including a root `CLAUDE.md` paragraph that routes on a field that no longer exists), and nothing keeps the canonical scaffold in sync with the live/root copies that actually execute. A gate that silently checks nothing is worse than no gate — it manufactures false assurance, and some of these ship to end users in v0.17.1.

**Success Metrics (North Star):**
- Every gate documented "Always enforced" (`file-surface`, `test-ratchet`, `decomposition`) blocks (non-zero exit) on violation in a fresh run — proven by a test, not by inspection.
- Zero live `execution_mode` / `v1` / `v2` / `CLEARGATE_EXEC_MODE` behavior-switch tokens remain in any shipping surface (`grep` gate returns 0 outside archive/changelog/tests-asserting-absence).
- `cleargate doctor` fails non-zero when canonical ≠ live or canonical-block ≠ root-CLAUDE.md-block; passes clean after a re-sync.
- Documentation claims of enforcement match reality: any discipline that is human-judged (duplicate check, Ambiguity Gate) is labelled advisory, or given a real predicate.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] Restore the file-surface pre-commit gate to unconditional blocking (drop the retired-`execution_mode` code path; keep `SKIP_SURFACE_GATE=1` / `CLEARGATE_ADVISORY=1` as the only bypass).
- [ ] Repair or retire the test-ratchet pre-commit gate (it spawns the eliminated vitest against a nonexistent baseline).
- [ ] Give the decomposition + sprint-readiness gates a real work list (scaffold `epics:`/`proposals:`/`context_source:` into the Sprint Plan Template; decide fail-open vs fail-closed).
- [ ] Remove the `CLEARGATE_EXEC_MODE=v1` silent bypass from `assert_story_files.mjs`.
- [ ] Sweep dead `execution_mode`/v1/v2 vocabulary from docs, agents, templates, and script comments; re-mirror payload; re-inject root CLAUDE.md.
- [ ] Add a canonical↔live↔root-injection drift guard to `cleargate doctor` (and/or CI).
- [ ] Resolve the "enforced-in-name-only" overclaims: duplicate check + Ambiguity Gate get either real predicates or honest advisory language.
- [ ] Reconcile break-glass semantics: `CLEARGATE_ADVISORY` coverage vs the enforcement §15 claim; `--assume-ack` teeth vs relabel.
- [ ] Clean up doc-internal contradictions + phantom references (gate-numbering canon, stale §9 flow, `pull` path, `triage-classifier.ts` phantom, autonomy `.agent` key).

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- Reintroducing any execution-topology or enforcement-strength axis beyond `CLEARGATE_ADVISORY`.
- Changing the five-agent execution loop, the `/workflows` wave path, or `launch_wave` behavior (CR-074 is settled).
- Any MCP-server, admin-console, or database change.
- Net-new gates beyond the drift guard (this is remediation, not expansion).
- Re-litigating the CR-074 decision to make execution a single unnamed path.

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Dogfood split | Three copies (canonical / live / payload) must stay in sync; canonical is source of truth. Blind `cp` already destroyed live-only content once (FLASHCARD 2026-07-17). Diff before sync. |
| Test runner | node:test (`tsx --test`, `*.node.test.ts`) only. Vitest is forbidden and its binary is absent — the test-ratchet fix must not depend on it. |
| Shipping surface | `file_surface_diff.sh` + `test_ratchet.mjs` ship in the npm payload (v0.17.1). Broken gates reach end users. |
| Backward-compat | Existing sprints authored before this epic must not break; template additions default-empty. |
| Policy forks | 8 items in §6 are genuine forks (advisory scope, gate-numbering canon, fail-open/closed). Epic stays 🔴 until answered. |

## Existing Surfaces

> L1 reuse audit. List source-tree implementations the epic could extend. Cite file:line.

- **Surface:** `cleargate-planning/.cleargate/scripts/file_surface_diff.sh:47-87,305-319` — the file-surface gate; already has a `detect_execution_mode()` seam and a `SKIP_SURFACE_GATE=1` bypass (line 8) to build the fix on.
- **Surface:** `cleargate-planning/.cleargate/scripts/test_ratchet.mjs:30,42-103` — the ratchet; `BASELINE_PATH` + vitest spawn are the exact lines to rewire to node:test.
- **Surface:** `cleargate-cli/src/lib/lifecycle-reconcile.ts:564-625` — `reconcileDecomposition` reads `epics:`/`proposals:` from sprint frontmatter; the gate exists, it just has no input.
- **Surface:** `cleargate-cli/src/commands/doctor.ts` — the drift guard extends the existing doctor command (which already runs `--session-start` checks) rather than a net-new binary.
- **Surface:** `cleargate-planning/.cleargate/knowledge/readiness-gates.md:9-36` — the 7-shape predicate vocabulary the Ambiguity/duplicate-check predicates (if chosen) would extend.
- **Coverage of this epic's scope:** partial — every fix extends an existing script/command/doc; only the drift guard is net-new logic, and it lives inside an existing command.

## Why not simpler?

> L2 / L3 right-size + justify-complexity. Answer both.

- **Smallest existing surface that could carry this epic:** none single — the work spans four subsystems (pre-commit hooks, `.cleargate` gate scripts, CLI `lifecycle-reconcile`/`doctor`, and the docs/templates/agents corpus) plus one net-new drift guard and eight policy decisions.
- **Why isn't extension / parameterization / config sufficient?** A single CR would trip the Granularity Rubric on every axis: unrelated goals joined (gate repair + vocabulary sweep + net-new drift guard), >5 scenarios, subsystems spanned, and L4 wall-time. The findings also fork on human decisions that must be resolved per-concern, not globally. An epic with per-concern stories lets the P0 gate fixes ship independently and fast while the decision-gated policy stories resolve at Gate 2.

## 4. Technical Grounding (The "Shadow Spec")
*(Verified 2026-07-17 against canonical `cleargate-planning/**` and `cleargate-cli/src/**`.)*

**Affected Files (verified):**
- `cleargate-planning/.cleargate/scripts/file_surface_diff.sh` — `detect_execution_mode()` (47), `echo "v1"` fallbacks (55, 81), `EXECUTION_MODE="v1"` (85), `if [[ "${EXECUTION_MODE}" == "v1" ]]` → `exit 0` (305, 311); v2-only `exit 1` (319). Live + payload copies too.
- `cleargate-planning/.cleargate/scripts/test_ratchet.mjs` — `BASELINE_PATH … test-baseline.json` (30), vitest spawn args (78-79). Also outer live `.cleargate/scripts/test_ratchet.mjs` (FLASHCARD note, CR-075).
- `.cleargate/templates/Sprint Plan Template.md` + canonical mirror — frontmatter ends line 39; no `epics:`/`proposals:`/`context_source:`.
- `cleargate-planning/.cleargate/scripts/assert_story_files.mjs:20,232-233` — `CLEARGATE_EXEC_MODE ?? 'v2'` bypass.
- `cleargate-cli/src/lib/lifecycle-reconcile.ts:564-565,586,625` — `epics`/`proposals` frontmatter read; empty ⇒ vacuous pass.
- `CLAUDE.md` (root) — "Sprint mode. Read `execution_mode:` … Default `v1`." paragraph + "block in v2" (canonical dropped these; root diverged).
- `cleargate-planning/CLAUDE.md` — residual "under v2"/"block in v2".
- `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md:119` — "Under `execution_mode: v2` … under `v1` it warns" (dead vocab + inverted default) + §4 Gate-3 vocab; §9 pre-CR-025 flow; `.cleargate/plans/` path (§6/§8).
- `cleargate-planning/.cleargate/templates/story.md:33-37,155` — "v2 Decomposition Signals" / "under v1" / "under v2 execution mode" block.
- `cleargate-planning/.claude/agents/{qa,devops,reporter}.md` — "forbidden under v2".
- `cleargate-planning/.cleargate/scripts/close_sprint.mjs` + `cleargate-cli/src/commands/sprint.ts` — execution_mode comments/docstrings.
- `cleargate-planning/.claude/hooks/pre-tool-use-autonomy.sh:53` — `jq -r '.agent // "unknown"'` (should be `.agent_type`).
- `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` §15 — CLEARGATE_ADVISORY "all CLI gates" claim; `readiness-gates.md` — duplicate-check/Ambiguity predicates.

**Data Changes:** None. No schema, no tables, no migrations.

## 5. Acceptance Criteria

```gherkin
Feature: Enforcement Integrity Restoration

  Scenario: File-surface gate blocks an off-surface commit
    Given a story whose §3 file table omits a staged file
    And no bypass env is set
    When the pre-commit surface gate runs
    Then it exits non-zero and names the off-surface file

  Scenario: Documented gates match reality
    Given the shipped scaffold after this epic
    When I grep every shipping surface for execution_mode/v1/v2/CLEARGATE_EXEC_MODE behavior switches
    Then zero hits remain outside archive, changelog, and absence-asserting tests

  Scenario: Drift guard catches a stale live copy
    Given canonical cleargate-planning/.claude diverges from live /.claude
    When `cleargate doctor` runs
    Then it exits non-zero and names the drifted path

  Scenario: Decomposition gate has a work list
    Given a sprint authored from the Sprint Plan Template
    When `cleargate sprint init` runs the decomposition gate
    Then the gate reads a non-empty epics/proposals list (or fails closed if none is declared)

  Scenario: A gate that cannot find its inputs fails loud (error path)
    Given a decomposition or lifecycle-init gate whose inputs are missing
    When the gate runs without --allow-drift
    Then it exits with an Error, not a silent pass
```

## 6. AI Interrogation Loop — RESOLVED (Gate 1, 2026-07-17)
*(All eight decisions were answered by the owner at Gate-1 review and integrated into the story scope below. No open questions remain.)*

- **Q1 → NARROW.** `CLEARGATE_ADVISORY=1` is NOT universal; §15 is narrowed to its true scope (`cleargate sprint preflight` + the `cleargate sprint init` story-file assertion) and disclaims all other gates. Not threaded into file-surface / decomposition / lifecycle-init / close. → STORY-051-01, -05, -08.
- **Q2 → CI-TOKEN GUARD.** `close_sprint.mjs --assume-ack` refuses (exits non-zero) unless `CLEARGATE_CI_ACK=1`. → STORY-051-08.
- **Q3 → HARD CHECK.** `cleargate doctor` exits non-zero on canonical↔live and canonical↔root-CLAUDE.md drift. → STORY-051-06.
- **Q4 → ADD REAL TEETH.** Body-persisted `## Prior work` predicate + an unchecked-checkbox predicate over the Ambiguity Gate; the CLAUDE.md "auditable/literally" wording is aligned to the now-real enforcement. → STORY-051-07.
- **Q5 → FOUR-GATE MODEL.** Protocol §4 (Brief / Sprint-Ready / Execution / Close) is canonical; the CLAUDE.md + §9 three-gate references (Initiative / Ambiguity / Push) are re-mapped onto it. → STORY-051-09.
- **Q6 → RETIRE.** The test-ratchet is removed from the pre-commit payload entirely (typecheck + node:test still run). → STORY-051-02.
- **Q7 → KEEP, RETARGETED.** The sprint-readiness context_source criterion stays but points at the sprint's own decomposition evidence. → STORY-051-03.
- **Q8 → FAIL CLOSED.** Decomposition + lifecycle-init gates exit non-zero on missing inputs / reconciler exception unless `--allow-drift`. → STORY-051-03.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — approved at Gate 1 (2026-07-17)**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Coding Agent):
- [x] `approved: true` is set in the YAML frontmatter.
- [x] The `<agent_context>` block is complete and validated.
- [x] §4 Technical Grounding contains 100% real, verified file paths.
- [x] §6 AI Interrogation Loop is empty (all human answers integrated into the spec).
- [x] 0 "TBDs" exist in the document.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.
