---
cr_id: CR-124
parent_ref: EPIC-055
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-41
carry_over: false
area: planning,sprint-execution,sdr
status: Approved
approved: true
approved_by: sandrinio
approved_at: 2026-09-26T13:00:00Z
context_source: "Owner directive 2026-09-26 after reviewing the mediafi SPRINT-03 replan (commit 93ab6f1, §2.1 'Second orchestrator adjustment'): 'that's how i want cleargate to be planning sprints' and 'i want this delivered in the sprint. so the sprint also runs the same way from now on'. Verified codebase grounding at cleargate-cli main 35580b0 (architect-synth.md, architect-reader.md, sprint-execution SKILL.md §C.0, launch_wave.mjs, init_sprint.mjs, Sprint Plan Template §2.1)."
created_at: 2026-09-26T13:02:16Z
updated_at: 2026-09-26T13:02:16Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-26T13:04:22Z
  transition: ready-to-apply
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
  model: claude-opus-5-5
  last_stamp: 2026-09-26T13:54:55Z
  sessions:
    - session: 75d958ba-2473-408d-b4db-e15b774ad28f
      model: claude-opus-5-5
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-09-26T13:05:19Z
---

# CR-124: Contract-first build-then-integrate — sprints are planned and run as a dependency DAG, not collision waves

## 0.5 Open Questions

- **Question:** Does this CR replace EPIC-055 or amend it?
- **Recommended:** It amends it. EPIC-055 stays the home of the automated ready-set scheduler (segment budget, refcounted flashcard gate, worktree-add mutex). This CR reverses two of EPIC-055's out-of-scope lines — "full per-story DAG scheduling" and "any change to the five-clause predicate" — and delivers the planning half: the SDR emits a contract-first per-story DAG, `waves.json` can express it, and the sprint-execution skill defines the build/integrate/merge protocol. The Orchestrator runs that protocol by hand until EPIC-055's scheduler exists.
- **Human decision:** Recommended option taken under the owner's directive; the orchestrator resolved it under sprint autonomy.

- **Question:** Do waves survive?
- **Recommended:** Yes, as a derived, legible view: `waves` is computed from the DAG's build/integrate layers, and it keeps being what `init_sprint.mjs` and the dashboard read. The DAG fields are additive, so a v1 `waves.json` stays valid.
- **Human decision:** Recommended option taken (orchestrator, sprint autonomy).

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- "A story with `parallel_eligible: n`, or one that writes the DB, never shares a wave." These coarse flags serialized most of mediafi SPRINT-03 into 13 waves, and they serialize ClearGate's own sprints the same way.
- "A story waits for its upstream story to MERGE before it can start building." Upstream dependencies block integration, not building.
- "Execution is a chain of waves; every story in wave N waits for all of wave N−1 to merge."
- EPIC-055's out-of-scope lines "Full per-story DAG scheduling" and "Any change to the five-clause compatibility predicate".

**New Logic (The New Truth):**
1. **Only real collisions serialize.** These are:
   - ordered schema or migration journals;
   - lockfiles and other single-writer generated artifacts;
   - shared files whose edits must be applied in order, where a later edit rewrites an earlier one's region.
   `parallel_eligible` and DB writes become integration-order hints. When each story's tests use isolated resources, they are not wave separators.
2. **Contract step.** For each upstream→downstream edge whose consumer needs code that does not exist yet, the SDR names a contract: the exact exported names and types (type-exact skeletons with bodies that throw or return a stub). The contract goes on a `contract/S-<NN>-<slug>` branch cut from the sprint branch. A contract can stack on another. The owning story later replaces the bodies, and exported names and types are frozen.
3. **Parallel build.** Every story is cut from its declared base (the sprint branch, or a contract branch) and builds at once, each in its own worktree, through QA-Red → Developer.
4. **Integration by DAG.** A story integrates only when every upstream story it names has merged. Integration means:
   - merge the sprint branch into the story branch;
   - resolve conflicts, where the owner's file wins and the story re-applies its own insertions;
   - re-run the full verification;
   - run QA-Verify and the Architect post-flight on the integrated tree.
5. **Serial merges.** One merge at a time. If the sprint branch moved after a story integrated, the story re-syncs before merging.
6. **Over-constrained red tests** are re-scoped by QA-Red only, never by a Developer. A red test is over-constrained when it is broken by another story's legitimate additions, or when its casts become redundant once a real type lands.
7. **`waves.json`** gains additive fields: `contracts[]` (`id`, `branch`, `base`, `owner_story`, `frozen_exports`), per-story `base` and `upstream` (integration edges), and `schema_version: 2`. `waves` stays as the derived layered view.

## 2. Blast Radius & Invalidation

- [x] Update Epic: [[EPIC-055]] — two out-of-scope lines are reversed (§1); its scheduler scope stays.
- [x] Update Story: [[STORY-058-12]] — the host dispatch-mode split edits the same sprint-execution skill sections (§C.0). Its dispatch contract must carry the build/integrate phases. Ordering is pinned by the SPRINT-41 remainder re-plan.
- [x] Update Story: [[STORY-058-11]] — translates Claude agents and skills for Codex. If the architect-synth, architect-reader and sprint-execution texts change, its translated copies must follow them. Ordering is pinned by the re-plan.
- [x] Database schema impacts? No.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect-synth.md:41` — the five-clause wave-compatibility predicate; clause 1 is `parallel_eligible` and the DB-write axis serializes.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect-reader.md:22` — the per-story digest (`file_surface`, `file_creates`, `db_write_set`, `dep_predecessors`); it has no exports-provided or exports-consumed fields for contract formation.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:265` — §C.0 wave execution and the §C.0.1 `launch_wave` contract; its merge-then-next-wave chain model has no build/integrate split.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/launch_wave.mjs:6` — launches one Architect-planned wave from `waves.json`.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/init_sprint.mjs:192` — reads `lane_assignments` from the sprint's waves file; it must accept v2 files.
- **Surface:** the Sprint Plan Template (cleargate-cli scaffold core templates, line 94) — §2.1 Phase Plan is written as sequential and parallel waves.
- **Why this CR extends rather than rebuilds:** the SDR fan-out ([[STORY-033-03]]), the collision surface ([[BUG-033]], [[BUG-046]]) and the `waves.json` lane source ([[CR-078]]) are kept. The digest gains contract fields, the predicate narrows to real collisions, `waves.json` gains additive v2 fields, and the skill gains the integrate step. Nothing is replaced.

## Prior work

- [[EPIC-055]] — wave-level DAG plus the ready-set scheduler; approved, not decomposed. This CR amends its scope (§1, §2).
- [[STORY-033-03]] — the SDR reader/synth fan-out and the `waves.json` artifact this CR extends.
- [[CR-078]] — `waves.json` is the canonical lane source; v2 must keep `lane_assignments` intact.
- [[STORY-058-12]] — host dispatch-mode split (Claude parallel vs Codex serial), which shares the skill surface.
- [[BUG-033]], [[BUG-046]] — fail-safe collision metadata; both are kept.
- The external model is mediafi SPRINT-03 §2.1 "Second orchestrator adjustment" (commit 93ab6f1): 7 stories built concurrently from `contract/S-03-web` and `contract/S-03-reg`.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/scaffold/core/.cleargate/scripts/launch_wave.mjs` — adds `storyBases(plan)` and `integrationReady(plan, storyId, mergedIds)` after `worktreeAddCommand` (`:112-115`); `launchWave` gains a `bases` parameter. Does not touch `:1-41` or `:129-224`.
- `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect-reader.md` — the digest gains `exports_provided` and `exports_consumed`.
- `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect-synth.md` — the real-collision predicate, contract formation, and v2 `waves.json` emission.
- `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect.md` — §2.1 Phase Plan gains one sentence naming the contract-first DAG.
- `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md` — §A.4 (SDR output), new `#### C.0.2 Contract-first build and integration (CR-124)`.
- `cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-enforcement.md` `:103` — the wave-predicate text.
- `cleargate-cli/scaffold/core/.cleargate/templates/Sprint Plan Template.md` — §2.1 becomes a DAG plus contracts example.
- `cleargate-cli/test/helpers/init-fixture.ts` — the 7 sanctioned baseline-hash rows (plan §7.5).
- `cleargate-cli/CHANGELOG.md` — `### Added` entry for contract-first sprint planning.
- **Add (new test files):** `cleargate-cli/test/scripts/waves-json-v2.red.node.test.ts`, `cleargate-cli/test/docs/contract-first-dag-text.red.node.test.ts`, `cleargate-cli/test/scripts/init-sprint-waves-v2.red.integration.node.test.ts`.
- **Conditional:** `cleargate-cli/scaffold/hosts/codex/.codex/agents/architect{,-synth,-reader}.toml` — regenerated via `npm run gen:codex`, only if [[STORY-058-11]] merged first.
- **Removed:** `init_sprint.mjs` — it reads only `lane_assignments` (`:195-211`, measured); a `schema_version: 2` file already works, so it needs no change.
- **Outer twins (byte copies, one commit):** `.cleargate/knowledge/cleargate-enforcement.md`, `.cleargate/scripts/launch_wave.mjs`, `.cleargate/templates/Sprint Plan Template.md`.
The exact file list, contract text and test shapes are pinned by the SPRINT-41 remainder re-plan (`plans/replan-contract-first.md`).

## Task Breakdown
- [ ] QA-Red: waves-json-v2 (init_sprint v1/v2, storyBases, launchWave bases, integrationReady, export guard), contract-first-dag-text (reader, synth, SKILL §A.4/§C.0.2 + -12 anchors, enforcement, template, architect.md, vocab), init-sprint-waves-v2 integration, 7 M2 rows incl. the shared enforcement row
- [ ] launch_wave.mjs: storyBases, integrationReady, launchWave bases (no header/validator change)
- [ ] architect-reader digest exports_provided / exports_consumed; architect-synth real-collision predicate, contract formation, schema_version 2 shape; architect.md §2.1 sentence
- [ ] SKILL.md §A.4 + §C.0 intro sentence + §C.0.2 (inside A2; -12 anchors byte-identical; no banned tokens outside A2)
- [ ] enforcement :103 wording; Sprint Plan Template §2.1 body; byte-copy the 3 twins
- [ ] Integrate: merge cli main; regenerate codex agent TOMLs if STORY-058-11 merged first; re-verify; QA-Verify + post-flight on the integrated tree
- [ ] RS-CR live re-sync of 3 agents + SKILL.md; dogfood ledger rows through close

## 4. Verification Protocol

**Command/Test:** the command list = the 3 new files (`cleargate-cli/test/scripts/waves-json-v2.red.node.test.ts`, `cleargate-cli/test/docs/contract-first-dag-text.red.node.test.ts`, `cleargate-cli/test/scripts/init-sprint-waves-v2.red.integration.node.test.ts`) plus the plan §7.4 anchors, each run solo via `cd cleargate-cli && npm run test:file -- <file>`, plus the existing `init_sprint` / `launch_wave` shell tests.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | A story built from a contract branch and a story built from the sprint branch both integrate |
| Interfaces | T | Agents (reader, synth), the skill protocol, and the scripts (`init_sprint`, `launch_wave`) |
| Data | T | v1 and v2 `waves.json` |
| Rules | T | Only real collisions serialize; integration waits for upstream merges; merges are serial |

```gherkin
Feature: Contract-first build-then-integrate sprint DAG

  @rules
  Scenario: Coarse flags no longer serialize the build
    Given two stories flagged parallel_eligible n whose written files do not collide and whose tests use isolated resources
    When architect-synth plans them
    Then both are in the same build set, and any ordering between them appears only as an integration edge

  @paths
  Scenario: A downstream story builds against a frozen contract
    Given story B consumes exports that story A has not written yet
    When architect-synth plans them
    Then waves.json names a contract with A's frozen exports on a contract branch and records B's base as that branch

  @data
  Scenario Outline: init_sprint and launch_wave accept both schema versions
    Given a waves.json with <version>
    When init_sprint.mjs and launch_wave.mjs read it
    Then lane assignments and wave composition are unchanged
    Examples:
      | version            |
      | no schema_version  |
      | schema_version: 2  |

  @interfaces
  Scenario: The skill defines the integration protocol
    Given the sprint-execution skill
    Then §C.0 defines the contract step, parallel build, integrate-after-upstream-merge, serial merge with re-sync, and the QA-Red re-scope rule

  @rules
  Scenario: Integration waits for upstream merges
    Given story B lists story A in upstream
    When B finishes building before A has merged
    Then B does not integrate or merge until A has merged
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 17 | 10 red, 7 anchors |
| Integration tests | 1 | `init_sprint.mjs` over a real v2 `waves.json` in a scaffolded install |
| E2E / acceptance tests | 1 | the §4 Contract-first ledger |

---

## Context Source

**context_source:** the owner directive of 2026-09-26 after reviewing mediafi SPRINT-03 §2.1, and verified grounding at cleargate-cli main `35580b0`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
