---
epic_id: EPIC-057
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: planning-layer
status: Draft
approved: true
proposal_gate_waiver:
  approved_by: sandrinio
  approved_at: 2026-08-26T00:00:00Z
ambiguity: 🟡 Medium
context_source: verified codebase grounding (git ls-files + check-ignore across mcp/ cleargate-cli/ admin/ = 0 tracked, all gitignored; 9 of 16 SPRINT-39 items reference cleargate-cli/src) + recorded direct approval 2026-08-26
owner: sandrinio
target_date: 2026-11-30
created_at: 2026-08-26T00:00:00Z
updated_at: 2026-08-25T21:20:00Z
created_at_version: cleargate@0.24.2
updated_at_version: cleargate@0.24.2
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: false
  failing_criteria:
    - id: interrogation-resolved
      detail: 1 occurrence at §11
  last_gate_check: 2026-08-25T21:20:00Z
  transition: ready-for-decomposition
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# EPIC-057: Multi-repo story execution — routing, not just detection

> **Not scheduled.** Filed 2026-08-26 as the recorded follow-on to [[BUG-046]], which detects worktree-unreachable surfaces but deliberately does not route them.

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Let a story whose file surface lives outside the worktree-reachable tree execute correctly, by declaring repo topology in config.yml and routing each story to the right checkout with the right branch.</objective>
  <architecture_rules>
    <rule>Must consume BUG-046's reachability classification — do NOT reimplement path classification</rule>
    <rule>Must not run `git worktree add` inside a nested independent repo (cleargate-enforcement.md §1.3)</rule>
    <rule>Cross-repo atomic merge is impossible and is explicitly not attempted — see OUT-OF-SCOPE</rule>
    <rule>Topology is declared per-install in config.yml; never hardcode cli/mcp/admin (they are this repo's shape, not every repo's)</rule>
  </architecture_rules>
  <target_files>
    <file path=".cleargate/config.yml" action="modify" />
    <file path=".claude/agents/architect-synth.md" action="modify" />
    <file path=".claude/skills/sprint-execution/SKILL.md" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**

ClearGate's execution model assumes one repo and one worktree per story. Real repos violate that constantly: gitignored vendored dependencies, git submodules, generated/ignored workspace packages, polyrepo products, and monorepos with ignored build outputs. A `git worktree add` materializes **tracked files only**, so any story whose surface touches such a path lands in a worktree where the path does not exist.

This is not hypothetical for ClearGate itself. All three product directories are gitignored in the meta repo with zero tracked files:

```
.gitignore:62 /mcp/   .gitignore:63 /cleargate-cli/   .gitignore:64 /admin/   → 0 tracked each
```

**9 of 16 SPRINT-39 items reference `cleargate-cli/src` paths.** They execute today only because the operator knows, as tribal practice, to work on a branch in the product's own checkout. That knowledge lives in one person's head and in a memory file — not in the framework that ships to users.

[[BUG-046]] makes the failure loud instead of silent. It does not make the story runnable. This epic does.

**Success Metrics (North Star):**
- A story whose surface spans repos executes without operator intervention, or is refused with a specific, actionable reason.
- Repo topology is declared once per install rather than known tribally.
- The five-clause wave predicate stops certifying "disjoint" for two stories sharing an unisolated checkout.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] A `repos:` block in `config.yml` declaring each satellite checkout: path, whether it is an independent git repo, and its branch-naming convention.
- [ ] Story routing: given a story's classified surface, resolve which checkout(s) it executes in.
- [ ] Per-repo branch naming for satellite repos (the meta repo's `story/STORY-X` convention does not necessarily transfer).
- [ ] Wave-predicate extension: two stories touching the same *unisolated* satellite checkout are never co-waved, even when their file surfaces are disjoint — a shared checkout has no per-story `.git` index to keep them apart.
- [ ] Cross-repo merge ordering recorded in `waves.json` and surfaced in the sprint's §2.2 table.

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- **Atomic cross-repo merge.** Two repos cannot merge atomically. The honest deliverable is explicit ordering plus a named inconsistency window, not the illusion of atomicity.
- Reimplementing path classification — [[BUG-046]] owns it.
- Git submodule *management* (add/update/sync). Detecting and routing around submodules is in scope; driving them is not.
- Converting ClearGate's own repos into a monorepo. Orthogonal decision.

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Isolation | A satellite checkout shared across stories has ONE working tree and ONE index. Two concurrent stories there are not isolated regardless of file disjointness — the wave predicate must treat the checkout itself as the collision axis. |
| Atomicity | No cross-repo transaction exists. Any design claiming atomic multi-repo merge is wrong; the deliverable is ordering plus a documented window. |
| Generality | Topology must be declared per-install. Hardcoding `cli`/`mcp`/`admin` reproduces the mistake [[BUG-041]] and `STORY-054-04` both exist to correct. |

## Existing Surfaces

- **Surface:** `.cleargate/scripts/collision_surface.sh` — emits a story's file surface. [[BUG-046]] adds reachability classification here; this epic consumes that output rather than re-deriving it.
- **Surface:** `.claude/agents/architect-synth.md` — the five-clause predicate and wave packer. Extended with a checkout-collision axis, in the same shape as the existing coarse DB axis.
- **Surface:** `.cleargate/knowledge/cleargate-enforcement.md` §1.3 — the nested-repo rule (corrected by [[BUG-046]]). This epic supplies the missing positive guidance it leaves behind.
- **Surface:** `.cleargate/config.yml` — per-repo config; gains the `repos:` block.
- **Surface:** `.cleargate/scripts/provision_worktree_config.sh` — existing precedent for provisioning non-tracked material into a worktree; the closest existing mechanism and worth evaluating as a partial route before designing a new one.
- **Coverage of this epic's scope:** ~25% extension. Classification and config plumbing exist or arrive with BUG-046; routing, per-repo branching, and the checkout-collision axis are net-new.

## Prior work

- `cleargate wiki query "multi repo story execution routing"` → **none found**.
- [[BUG-046]] — direct parent. Detects unreachable surfaces and corrects the two false documentation lines; explicitly defers routing to this epic.
- [[BUG-033]] — the fail-open precedent; established "unproven, never proven-disjoint."
- [[EPIC-033]] — built the wave/worktree machinery this epic generalizes.
- [[EPIC-055]] — parallel wave scheduling. Interacts: more concurrency means more chances to co-wave two stories into one shared checkout. Order between them is a scheduling call, not a hard dependency.
- [[CR-108]] / [[BUG-045]] — both touch `cleargate-cli/`, both currently rely on the tribal workaround this epic replaces.

## Why not simpler?

- **Smallest existing surface that could carry this epic:** `provision_worktree_config.sh`, which already copies or symlinks non-tracked roots into a worktree. It could plausibly provision a satellite checkout the same way.
- **Why isn't extension / parameterization / config sufficient?** Because symlinking a satellite repo into a worktree gives the *appearance* of isolation without the substance: two stories provisioned with the same symlink target write to one working tree and one index, so a per-worktree pre-commit gate that assumes isolation is silently wrong. Fixing that requires the wave predicate to learn a new collision axis — the checkout, not the file — which is a change to the safety decision procedure, not a parameter. The config block alone is easy; the predicate change is what makes the epic.

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files:**
- `.cleargate/config.yml` + `cleargate-planning/.cleargate/config.yml` + `config.example.yml` — `repos:` block.
- `.claude/agents/architect-synth.md` + mirror — checkout-collision axis in the predicate.
- `.claude/skills/sprint-execution/SKILL.md` + mirror — §C.2 routing rules.
- `.cleargate/knowledge/cleargate-enforcement.md` + mirror — positive multi-repo guidance.

**Data Changes:**
- `config.yml`: `repos[].{path, independent, branch_pattern}`.
- `waves.json`: per-story `checkout` assignment; cross-repo edges in `merge_order`.

## 5. Acceptance Criteria

```gherkin
Feature: Multi-repo story execution
  Scenario: A story in a satellite repo routes to its own checkout
    Given a story whose surface is entirely under a declared satellite repo
    When the orchestrator prepares execution
    Then it uses that repo's checkout and branch convention
    And it does not attempt git worktree add in the meta repo

  Scenario: Two stories in one shared checkout are never co-waved
    Given two stories with disjoint file surfaces
    And both surfaces are under the same unisolated satellite checkout
    When architect-synth packs waves
    Then the two stories land in different waves

  Scenario: A story spanning two repos is ordered, not merged atomically
    Given a story touching both the meta repo and a satellite repo
    When the barrier merges it
    Then the merge order is explicit
    And the inconsistency window is recorded in the sprint log

  Scenario: An undeclared satellite is refused, not guessed
    Given a story surface under a gitignored path not declared in config.yml repos:
    When the orchestrator prepares execution
    Then it refuses and names the path and the missing declaration
```

## 6. AI Interrogation Loop (Human Input Required)

- **AI Question:** "Where does repo topology come from? Three options with different costs. (a) Hand-declared in `config.yml` — explicit, but every user must write it and it silently rots when a path moves. (b) Auto-detected by scanning for nested `.git` directories and gitignored roots at `cleargate init` / `doctor` time — zero user effort, but guesses intent and may mis-classify a vendored dir as a satellite repo. (c) Detected, then written into `config.yml` for the human to confirm — a doctor-style suggestion the user accepts. I lean (c), because it matches how `doctor` already surfaces state and keeps the declaration reviewable, but it is the most work."
- **Human Answer:** Unresolved — replace this entire line with the human's decision.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green (Ready for Coding Agent):
- [x] `approved: true` is set in the YAML frontmatter.
- [x] The `<agent_context>` block is complete and validated.
- [x] §4 Technical Grounding contains 100% real, verified file paths.
- [ ] §6 AI Interrogation Loop is empty (all human answers integrated into the spec).
- [x] 0 "TBDs" exist in the document.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.

> **Gate 1 sign-off: approved 2026-08-26** by sandrinio. 🟡 until §6 is answered; deliberately unscheduled. Sequenced after [[BUG-046]].
