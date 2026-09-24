---
story_id: STORY-058-03
parent_epic_ref: EPIC-058
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-09-04T00:00:00Z
ambiguity: 🟢 Low
context_source: Decomposition of [[EPIC-058]] on direct owner instruction 2026-09-04. Grounded in verified cleargate-cli source paths and Codex CLI v0.153.2 documented contracts; no path in this story is inferred.
actor: ClearGate maintainer
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-09-04T00:00:00Z
updated_at: 2026-09-04T00:00:00Z
created_at_version: cleargate@0.26.1
updated_at_version: cleargate@0.26.1
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-04T10:23:55Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-058-03
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-04T10:23:55Z
  sessions: []
---

# STORY-058-03: HostAdapter contract, registry, and behavior-preserving Claude adapter

**Milestone:** M2 — Host abstraction

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate maintainer, I want a typed `HostAdapter` contract with the existing Claude behavior implemented behind it, so that adding a second host is an implementation of an interface rather than a conditional threaded through every lifecycle command.

### 1.2 Detailed Requirements
- Define `HostAdapter` in `cleargate-cli/src/hosts/types.ts`: a `name`, the payload roots it owns, and the surgery operations it performs (instruction-file injection, hook-config merge, MCP registration) plus their inverses for uninstall.
- Implement `cleargate-cli/src/hosts/registry.ts` resolving a host name to its adapter, and rejecting unknown names with a listed set of valid ones.
- Implement `cleargate-cli/src/hosts/claude.ts` by delegating to the existing, unmodified helpers — `injectClaudeMd`, `mergeSettings`, `injectMcpJson`. No behavioral change.
- `cleargate init` with no host flag routes through the Claude adapter and produces a byte-identical result to today.

### 1.3 Out of Scope
- `--host` flag parsing — [[STORY-058-04]].
- Per-host manifest ownership — [[STORY-058-06]].
- The Codex adapter — [[STORY-058-10]].

### 1.4 Open Questions
- **Question:** does the adapter own its uninstall inverse, or does `uninstall.ts` keep its own per-host cleanup logic?
- **Recommended:** the adapter owns it. An adapter that can install a surface but not remove it guarantees the two drift.
- **Human decision:** {pending Gate 1}

### 1.5 Risks
- The refactor is behavior-preserving by intent, but `injectClaudeMd` and `mergeSettings` carry accumulated bug-fix behavior ([[BUG-043]], [[CR-105]] on bounded-block placement). Wrapping rather than rewriting is mandatory.
- An interface designed against exactly one implementation tends to encode that implementation's assumptions. Sketch the Codex adapter's needs from [[STORY-058-10]] before freezing the shape.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Host adapter contract

  Scenario: No-flag init is byte-identical through the adapter
    Given a fresh target repository
    When `cleargate init` runs with no host flag
    Then the installed tree is byte-identical to the pre-refactor Claude install

  Scenario: Registry rejects an unknown host
    Given a host name that is not registered
    When the registry is asked to resolve it
    Then it raises an error naming the valid host set

  Scenario: Claude adapter delegates rather than reimplements
    Given the Claude adapter's install path
    When it performs instruction, hook, and MCP surgery
    Then it calls the existing injectClaudeMd, mergeSettings, and injectMcpJson helpers

  Scenario: Adapter declares its own payload roots and inverse
    Given a registered adapter
    When it is asked which paths it owns
    Then it returns those roots
    And it exposes the inverse operation used at uninstall
```

### 2.2 Verification Steps (Manual)
- [ ] Install into a fixture before and after the refactor; diff the trees.
- [ ] Resolve a bogus host name and read the error message.

## 3. The Implementation Guide

### 3.1 Context & Files
- `cleargate-cli/src/hosts/types.ts` — **create**. The `HostAdapter` contract.
- `cleargate-cli/src/hosts/registry.ts` — **create**. Name → adapter resolution.
- `cleargate-cli/src/hosts/claude.ts` — **create**. Wraps existing helpers.
- `cleargate-cli/src/commands/init.ts` — **modify**. Route the install through the resolved adapter.
- `cleargate-cli/src/init/inject-claude-md.ts`, `merge-settings.ts`, `inject-mcp-json.ts` — **unchanged**, called by the adapter.

### 3.2 Technical Logic
Wrap, do not rewrite. The Claude adapter is a thin delegation layer over three helpers that already encode fixed defects; reimplementing their logic inside the adapter would silently drop those fixes.

The contract needs three operation groups: **install** (copy owned roots, then run surgery), **surgery** (instruction-file bounded block, hook config merge, MCP registration — each host does all three but in different file formats), and **remove** (the inverse, for uninstall and `host remove`). Designing remove now, rather than when uninstall is touched in [[STORY-058-07]], is what keeps the two in sync.

### 3.3 API Contract (if applicable)
```ts
interface HostAdapter {
  readonly name: 'claude' | 'codex' | 'copilot';
  ownedRoots(): string[];
  install(ctx: InstallCtx): Promise<void>;
  remove(ctx: RemoveCtx): Promise<void>;
}
```
Exact shape to be finalized against [[STORY-058-10]]'s Codex needs before merge.

## Task Breakdown

- [ ] Sketch the Codex adapter's required operations from EPIC-058 §4 so the contract is designed against two hosts, not one.
- [ ] Define `HostAdapter` in `types.ts`.
- [ ] Implement `registry.ts` with unknown-name rejection.
- [ ] Implement `claude.ts` as delegation over the three existing helpers.
- [ ] Route `init.ts`'s no-flag path through the resolved adapter.
- [ ] Prove byte-identity against a pre-refactor install.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | Contract shape; registry resolve; registry reject-unknown; adapter delegation |
| Integration tests | 1 | No-flag init byte-identical pre/post refactor |
| E2E / acceptance tests | 0 | Covered by [[STORY-058-09]]'s clean-room baseline; duplicating it here would assert the same thing twice |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.


## Existing Surfaces

- **Surface:** `cleargate-cli/src/commands/init.ts:188` — the scaffold installer, hook merge, CLAUDE.md injection, and `.mcp.json` registration; the primary extension point.
- **Surface:** `cleargate-cli/src/init/inject-claude-md.ts:25` — bounded-block extraction/injection.
- **Surface:** `cleargate-cli/src/init/merge-settings.ts:48` — non-destructive Claude hook merge.
- **Surface:** `cleargate-cli/src/init/inject-mcp-json.ts:37` — `.mcp.json` merge, `McpJsonShape`.

## Why not simpler?

- **Smallest existing surface:** a `switch (host)` inside `init.ts`.
- **Why isn't that sufficient?** The same switch would then have to be repeated in `upgrade.ts`, `doctor.ts`, `uninstall.ts`, `session-load-delta.ts`, and the manifest pruner — five more places, each able to drift independently. The adapter is the minimum structure that keeps host knowledge in one file per host. EPIC-058 §"Why not simpler?" makes the same argument at epic scope.

## Prior work

- [[EPIC-058]] — parent epic; this story is one of its decompositions.
- [[PROPOSAL-074]] — Antigravity single-host port; the `HostAdapter` precedent EPIC-058 generalizes.
- [[SPRINT-34]] — `Polyglot Portability Hardening`; language/test-stack portability, adjacent but distinct from harness portability.
- Decomposition-time re-check 2026-09-04: `cleargate-wiki-query` returned [[EPIC-058]] and [[PROPOSAL-074]] as the only multi-host prior work; no story-level prior art exists for this scope.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered (no "TBD" / no "{}").
- [x] `approved: true` is set in the YAML frontmatter. (Direct owner approval 2026-09-04.)

