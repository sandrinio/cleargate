---
sprint_id: SPRINT-34
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
lifecycle_init_mode: block
remote_id: null
source_tool: null
status: Draft
approved: true
start_date: null
end_date: null
synced_at: null
created_at: 2026-06-03T00:00:00Z
updated_at: 2026-06-03T00:00:00Z
created_at_version: cleargate@0.14.0
updated_at_version: cleargate@0.14.0
context_source: |
  SPRINT-34 bundles the six polyglot-portability CRs (CR-077..082, parent EPIC-045)
  surfaced by ClearGate's first v2-parallel dogfood, SPRINT-66 (new_app/Chyro) —
  see .cleargate/sprint-runs/_off-sprint/dogfood-SPRINT-66-observations.md (findings
  F1-F11) — plus two carried EPIC-043 hygiene CRs (CR-075 standalone test suite,
  CR-076 npm-package trim). Drafted 2026-06-03 per owner direction.
execution_mode: v2-parallel
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-06-03T16:35:34Z
stamp_error: no ledger rows for work_item_id SPRINT-34
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-03T16:44:37Z
  sessions: []
pushed_by: sandro.suladze@gmail.com
pushed_at: 2026-06-03T16:44:48.335Z
push_version: 1
---

# SPRINT-34: Polyglot Portability Hardening

## 0. Stakeholder Brief
*(Sponsor-readable summary. Pushed to PM tool. Pair with §3 Risks below.)*

- **Sprint Goal:** Harden ClearGate so a fresh install runs a sprint end-to-end on an arbitrary (non-node, worktree-isolated) target repo without orchestrator hand-fixes — fixing the 11 portability/loop defects the SPRINT-66 polyglot dogfood surfaced — and ship the two carried hygiene CRs.
- **Business Outcome:** ClearGate becomes genuinely "ships-to-many-repos" portable. A first-time non-node adopter (pytest / vitest / go) can `cleargate init` and execute a sprint without an expert orchestrator patching the scaffold's hardcoded `cleargate-cli` / `node:test` assumptions. Removes the guaranteed false-FAILs that today block any non-node target out of the box.
- **Risks (top 3):**
  - Three shared agent files (`qa.md`, `architect.md`, `developer.md`) are edited by CR-077 + CR-081 + CR-082 — merge contention if landed concurrently (see §2.2/§2.3).
  - Canonical edits under `cleargate-planning/**` do NOT auto-propagate to the live `/.claude/` instance — every CR needs a post-merge re-sync or the meta-repo keeps running the buggy scaffold (the BUG-024 trap).
  - CR-077 strips the meta-repo's own EPIC-028 "vitest-forbidden" rule from the *shipped* payload only — a mis-scoped strip could regress the meta-repo's own node:test discipline.
- **Metrics:** Zero orchestrator hand-fixes for stack/runner/path reasons on a fresh non-node sprint; zero post-init manual `.active` writes or lane reclassifications; zero ENOENT / lost-env wrapper incidents; zero wasted Dev dispatches from semantic QA-Red fixture bugs; zero "Done" stories with an unrun deferred verification.

## Sprint Goal
Harden ClearGate so a fresh install runs a sprint end-to-end on an arbitrary (non-node, worktree-isolated) target repo without orchestrator hand-fixes — fixing the 11 portability/loop defects the SPRINT-66 polyglot dogfood surfaced — and ship the two carried hygiene CRs.

## 1. Consolidated Deliverables
*(Eight CRs. CR-077…082 are EPIC-045 children (SPRINT-66 portability/loop findings F1–F11); CR-075/CR-076 are EPIC-043 hygiene CRs carried from SPRINT-33.)*

| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure |
|---|---|---|---|---|---|
| `CR-077` | Repo-derived test conventions + gate commands (F3 + F6) | standard | M1 | y | high |
| `CR-079` | Worktree config provisioning (F4 + F7) | standard | M1 | y | med |
| `CR-080` | Script-wrapper path + env correctness (F5 + F8) | fast | M1 | y | low |
| `CR-078` | init_sprint sets `.active` + applies lane audit (F1 + F2) | fast | M2 | y | med |
| `CR-081` | QA-loop semantic-fixture lint + red-now-green (F9 + F10) | standard | M3 | n | high |
| `CR-082` | Deferred-verification tracking + close gate (F11) | standard | M3 | n | med |
| `CR-075` | cleargate-cli standalone test suite (carried, EPIC-043) | standard | M4 | y | med |
| `CR-076` | Trim published npm package (carried, EPIC-043) | standard | M4 | y | low |

## 2. Execution Strategy
*(Written by Architect during Sprint Design Review. Required before sprint start. `execution_mode: v2-parallel` — most CRs are independent; the agent-file and qa.md contenders are serialized below.)*

### 2.1 Phase Plan
Most CRs touch disjoint surfaces and are parallel-capable. The two constraints that force serialization are (a) the shared agent `.md` files (`qa.md`/`architect.md`/`developer.md`) and (b) CR-077 being the gating portability fix the QA-loop CRs build on top of.

- **Wave 1 (parallel) — portability + script correctness foundation:**
  - `CR-077` (agents + `gate-checks.json` + `sprint_context.md` — the test-stack gating fix) ‖
  - `CR-079` (worktree config provisioning; touches worktree setup + `gate-checks.json` `stray_env_files` exemption) ‖
  - `CR-080` (fast — `run_script.sh` + `pre_gate_runner.sh`, isolated script bugs)
  - *Note:* CR-077 and CR-079 both touch `gate-checks.json` (different keys: CR-077 = typecheck/test commands; CR-079 = `stray_env_files` exemption) — flagged in §2.2, low conflict but ordered CR-077 → CR-079.
- **Wave 2 (fast, after Wave 1) — init wiring:**
  - `CR-078` (`init_sprint.mjs` + SKILL §A.3 `.active` contract). Sequenced after CR-077 so the lane-audit ingestion lands against the parameterized sprint-context shape, not the old freeform stub.
- **Wave 3 (sequential) — QA/close-loop hardening (depends on CR-077's parameterized qa.md/architect.md):**
  - `CR-081` (QA-Red semantic-fixture lint + red-now-green DoD in `qa.md`) → `CR-082` (deferred-verification close gate; amends `qa.md` DoD + `close_sprint.mjs`). **Strictly serial — both edit `qa.md`.**
- **Wave 4 (parallel) — carried hygiene (independent of the EPIC-045 surfaces):**
  - `CR-075` (`cleargate-cli/test/**` + package scripts) ‖ `CR-076` (npm-package trim). Independent of waves 1–3; can run concurrently with any wave if a Developer slot is free. Coordinate the single shared `changelog-format` `npm pack` assertion between the two (already flagged in CR-075 §2).

### 2.2 Merge Ordering (Shared-File Surface Analysis)

| Shared File | Stories Touching It | Merge Order | Rationale |
|---|---|---|---|
| `cleargate-planning/.claude/agents/qa.md` | CR-077, CR-081, CR-082 | 077 → 081 → 082 | CR-077 parameterizes runner/red-test naming (test_stack); CR-081 adds the red-now-green DoD clause; CR-082 amends the same DoD to add the deferred-verification requirement. 082 must amend the file 081 produced. |
| `cleargate-planning/.claude/agents/architect.md` | CR-077, CR-081 | 077 → 081 | CR-077 parameterizes the TPV `*.red.*` naming; CR-081 extends the TPV/semantic-fixture check on top of the parameterized form. |
| `cleargate-planning/.claude/agents/developer.md` | CR-077 | n/a (single writer) | Only CR-077 edits developer.md (strip EPIC-028 hardcode + read test_stack). No contention. |
| `cleargate-planning/.cleargate/scripts/gate-checks.json` | CR-077, CR-079 | 077 → 079 | CR-077 makes typecheck/test commands repo-derived; CR-079 adds the `stray_env_files` provisioned-config exemption. Disjoint keys; order avoids a re-baseline race. |
| `cleargate-planning/.cleargate/scripts/close_sprint.mjs` | CR-082 | n/a (single writer) | Only CR-082 adds the deferred-verification gate alongside Steps 2.7/2.8. No contention. |
| `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` | CR-078, CR-079, CR-082 | 078 → 079 → 082 | CR-078 reconciles the §A.3 `.active` contract; CR-079 documents the worktree-provisioning step; CR-082 documents the deferred-verification close requirement. Different sections — append-ordered to avoid hunk overlap. |
| `cleargate-cli/test/changelog-format.node.test.ts` | CR-075, CR-076 | 075 → 076 | Both rewrite the `npm pack` tarball assertion; CR-075 makes it cwd-relative/standalone first, CR-076 then asserts the trimmed contents (already flagged in CR-075 §2 overlap). |

### 2.3 Shared-Surface Warnings
- **`qa.md` three-way contention (CR-077 / CR-081 / CR-082).** All three edit `cleargate-planning/.claude/agents/qa.md`. Land **CR-077 first** (parameterizes runner + red-test naming via `test_stack`), then **CR-081** (adds the red-now-green DoD clause), then **CR-082 amends** the DoD to add the deferred-verification requirement. Never run 081 and 082 concurrently — they edit the same DoD region. Serialize Wave 3.
- **`architect.md` contention (CR-077 / CR-081).** CR-077 parameterizes the TPV `*.red.*` naming; CR-081 extends the TPV semantic-fixture check. CR-077 must merge first so CR-081 builds on the parameterized naming, not the hardcoded `*.red.node.test.ts`.
- **`developer.md` (CR-077 only).** Single writer; no contention but it is the riskiest single edit (strip the EPIC-028 "vitest-forbidden / node:test mandatory" hardcode from the *shipped* payload while preserving it in the meta-repo's own live copy). High bounce exposure.
- **`gate-checks.json` (CR-077 / CR-079).** Disjoint keys (commands vs `stray_env_files`); order CR-077 → CR-079 to keep the gate re-baseline single-writer.
- **Dogfood-split re-sync (every CR).** Each canonical edit under `cleargate-planning/**` requires a live `/.claude/` (and `/.cleargate/`) re-sync (`cleargate init` or hand-port) before the meta-repo runs the new behavior. Skipping this is the BUG-024 trap (fix shipped to canonical, live ran buggy). Capture the re-sync in each CR's DevOps step.
- **`changelog-format` `npm pack` assertion (CR-075 / CR-076).** One shared assertion; CR-075 lands the standalone/cwd-relative form, CR-076 then asserts trimmed tarball contents.

### 2.4 Lane Audit
*(Two CRs proposed `fast`. Rationale per row; all others `standard`.)*

| Story | Lane | Rationale (≤80 chars) |
|---|---|---|
| `CR-080` | fast | Two isolated shell-wrapper bugs (realpath + env forward); no agent/DoD/schema surface |
| `CR-078` | fast | Init-script wiring only (`.active` write + lane ingest); honors existing §A.3 contract |

### 2.5 ADR-Conflict Flags
- **CR-077 vs EPIC-028 closure (2026-05-18, "vitest eliminated / node:test mandatory").** CR-077 deliberately *removes* the EPIC-028 rule from the **shipped agent payload** while keeping it in the meta-repo's own (live `/.claude/`) agent copies. This is not a reversal of EPIC-028 — it scopes an internal convention to the internal repo. Architect must confirm the meta-repo's own node:test discipline is preserved (the F3(c) decision in EPIC-045 §0.5 / §6 governs this; resolve at Gate 1 before CR-077 starts).
- **CR-082 close-gate addition vs CR-019 (sprint close is Gate-4-class).** CR-082 adds a deferred-verification check alongside Steps 2.7/2.8 in `close_sprint.mjs`; it must compose with the existing Gate-4 ack flow (no autonomous `--assume-ack`), not replace it.

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| `qa.md` three-way edit (CR-077/081/082) collides | Serialize per §2.2: 077 → 081 → 082; Wave 3 is strictly sequential; DevOps merges one at a time on the single-writer axis. |
| `architect.md` two-way edit (CR-077/081) collides | Merge CR-077 first; CR-081 rebases onto the parameterized TPV naming. |
| Stripping EPIC-028 rule regresses the meta-repo's own node:test discipline | CR-077 strips from the shipped payload ONLY; meta-repo live agent copies retain the rule. Verify meta-repo sprint still runs green post-merge (§2.5). |
| Canonical edits don't reach the live instance (BUG-024 trap) | Every CR's DevOps step re-syncs `/.claude/` + `/.cleargate/` (`cleargate init` or hand-port) before declaring done. |
| EPIC-045 still 🔴 (six open questions in §6 / §0.5) | Resolve the four EPIC-045 forks at Gate 1 before any EPIC-045 child CR starts; CR-077's payload-strip scope (F3c) is the gating decision. |
| `gate-checks.json` re-baseline races between CR-077 and CR-079 | Disjoint keys + order CR-077 → CR-079 keep the gate config single-writer per merge. |
| Carried CRs (075/076) share the `changelog-format` `npm pack` assertion | Land CR-075 (standalone form) before CR-076 (trimmed-contents assertion); already flagged in CR-075 §2. |
| Deferred-verification gate (CR-082) over-blocks legitimate closes | Gate only fires when a `deferred_verification:` field is present and unrun; absence = no gate. Compose with Gate-4 ack (CR-019), don't replace it. |

## Metrics & Metadata
- **Expected Impact:** A fresh non-node `cleargate init` executes a full sprint with zero stack/runner/path orchestrator hand-fixes (eliminates F3, F6); zero post-init `.active`/lane corrections (F1, F2); zero ENOENT/lost-env wrapper incidents (F5, F8); zero wasted Dev dispatches from semantic QA-Red fixture bugs (F9); red-now-green files accepted with no override (F10); zero "Done" stories with an unrun deferred verification (F11). Plus the published `cleargate` package becomes standalone-testable (CR-075) and trimmed (CR-076).
- **Priority Alignment:** CR-077 is the highest-impact, highest-priority deliverable — it is the gating portability fix the QA-loop CRs (081/082) and init CR (078) build on. CR-075/CR-076 are carried EPIC-043 hygiene, sequenced last (M4) as they are independent of the EPIC-045 surfaces and can fill any free Developer slot.

---

## Execution Guidelines (Local Annotation — Not Pushed)
*(Vibe Coder: Fill this in locally to direct Claude Code during the Execution Phase. This section never syncs to the PM tool.)*

- **Starting Point:** CR-077 first — it is the gating portability fix (parameterize the shipped agents + `gate-checks.json` + `sprint_context.md` off the target's `test_stack`). Resolve the four EPIC-045 §6/§0.5 forks (especially F3(c) payload-strip scope) at Gate 1 before dispatching it. Wave 1 then runs CR-077 ‖ CR-079 ‖ CR-080 (fast).
- **Relevant Context:**
  - Source of all findings: `.cleargate/sprint-runs/_off-sprint/dogfood-SPRINT-66-observations.md` (F1–F11, Hour-1/2/3 syntheses).
  - Parent epic: `.cleargate/delivery/pending-sync/EPIC-045_Polyglot_Portability_And_Parallel_Dogfood_Hardening.md` (verified `target_files` + per-CR mapping in its §2/§4).
  - Carried CRs: `.cleargate/delivery/pending-sync/CR-075_Cleargate_Cli_Standalone_Test_Suite.md` + `.cleargate/delivery/pending-sync/CR-076_Trim_Published_Npm_Package.md`.
  - Shared agent surfaces verified on disk 2026-06-03: `cleargate-planning/.claude/agents/{qa,architect,developer}.md`; scripts `cleargate-planning/.cleargate/scripts/{init_sprint.mjs,run_script.sh,pre_gate_runner.sh,close_sprint.mjs,gate-checks.json}`; template `cleargate-planning/.cleargate/templates/sprint_context.md`.
- **Constraints:**
  - No `mcp/` store, MCP adapter, or `launch_wave.mjs` `parallel()` changes — scaffold-portability + script-correctness + close-gate only (per EPIC-045 §2 OUT-OF-SCOPE).
  - Every canonical edit under `cleargate-planning/**` requires a live `/.claude/` + `/.cleargate/` re-sync before "done" (BUG-024 trap).
  - The EPIC-028 "vitest forbidden / node:test mandatory" rule stays in the meta-repo's own agent copies; it MUST NOT remain in the shipped `cleargate init` payload (CR-077 / F3c).
  - Wave 3 (CR-081 → CR-082) is strictly sequential — both edit `qa.md`.

---

## Context Source

> Discovery audit. Populated from the SPRINT-66 dogfood observation log + verified codebase grounding.

**context_source:** `.cleargate/sprint-runs/_off-sprint/dogfood-SPRINT-66-observations.md` (findings F1–F11 + Hour-1/2/3 syntheses; the first `execution_mode: v2-parallel` run on a polyglot pytest+vitest target) + parent `EPIC-045_Polyglot_Portability_And_Parallel_Dogfood_Hardening.md` (CR-077…082 mapping, verified `target_files`) + carried `CR-075_Cleargate_Cli_Standalone_Test_Suite.md` / `CR-076_Trim_Published_Npm_Package.md` (EPIC-043). Shared agent/script/template surfaces verified on disk 2026-06-03. See memory [[project_codemap_general_purpose]] (the "ships to many repos" goal this sprint serves) and [[project_framework_sprint_crossrepo_execution]].

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity — sprint plan drafted from dogfood findings, not yet Gate-1/Gate-2-approved**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] Sprint Goal is one clear sentence stated in §0 and the Sprint Goal section. — *Single sentence, identical in both places.*
- [x] §1 Consolidated Deliverables lists every selected work item with lane + milestone + parallel + bounce. — *Eight CRs (CR-077…082 + carried CR-075/CR-076), each with lane/milestone/parallel/bounce.*
- [x] §2 Execution Strategy (Phase Plan + Merge Ordering + Shared-Surface Warnings) is written. — *Four-wave Phase Plan; merge-order table; explicit qa.md/architect.md/developer.md + gate-checks.json contention warnings.*
- [x] Shared-file surface analysis names every file touched by >1 CR with a merge order. — *qa.md (077→081→082), architect.md (077→081), gate-checks.json (077→079), SKILL.md (078→079→082), changelog-format test (075→076).*
- [x] Lane Audit justifies every non-`standard` lane. — *CR-080 + CR-078 marked fast with ≤80-char rationale; all others standard.*
- [x] All selected items have parent epics / decomposition (no orphan epics in scope). — *CR-077…082 → EPIC-045; CR-075/CR-076 → EPIC-043. No undecomposed epic is in sprint scope.*
- [ ] `approved: true` is set in the YAML frontmatter. — *Intentionally Draft. Pending Gate-1 approval AND the four open EPIC-045 §6/§0.5 forks (test-stack source, sequencing, F3c payload-strip, F11 mechanism); EPIC-045 itself is still 🔴.*
