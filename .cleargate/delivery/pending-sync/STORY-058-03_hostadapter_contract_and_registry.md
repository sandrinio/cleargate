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
updated_at: 2026-09-25T14:11:07Z
created_at_version: cleargate@0.26.1
updated_at_version: a7836beb-dirty
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
draft_tokens:
  input: 0
  output: 0
  cache_creation: 0
  cache_read: 0
  model: claude-opus-5-5
  last_stamp: 2026-09-25T10:23:37Z
  sessions:
    - session: 75d958ba-2473-408d-b4db-e15b774ad28f
      model: claude-opus-5-5
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-09-25T10:20:51Z
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
- **Resolved 2026-09-25 (Architect, under the owner's autonomy directive):** the adapter owns the inverse as `remove(ctx)`, implemented by delegating to the helpers `uninstall.ts` uses today (`removeBlock`, `removeClearGateHooks`). Wiring `uninstall.ts` to call it is [[STORY-058-07]].

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
    Then the installed tree, file modes, and init output are byte-identical to the pre-refactor Claude install

  Scenario: Registry rejects an unknown host
    Given a host name that is not registered
    When the registry is asked to resolve it
    Then it raises an error naming the valid host set

  Scenario: Claude adapter delegates rather than reimplements
    Given the Claude adapter's install path
    When it performs instruction, hook, and MCP surgery
    Then it calls the existing injectClaudeMd, mergeSettings, and injectMcpJson helpers

  Scenario: Adapter declares its own payload roots and inverse
    Given the registered Claude adapter
    When it is asked which paths it owns
    Then it returns `.claude` as its owned root and CLAUDE.md, .claude/settings.json, and .mcp.json as surgery targets
    And its remove operation strips the ClearGate block and hooks it installed while preserving user content
```

### 2.2 Verification Steps (Manual)
- [ ] Install into a fixture before and after the refactor; diff the trees.
- [ ] Resolve a bogus host name and read the error message.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/commands/init.ts` |
| Related Files | `cleargate-cli/src/init/inject-claude-md.ts` — unchanged, `cleargate-cli/src/init/merge-settings.ts` — unchanged, `cleargate-cli/src/init/inject-mcp-json.ts` — unchanged, `cleargate-cli/src/lib/claude-md-surgery.ts` — unchanged, `cleargate-cli/src/lib/settings-json-surgery.ts` — unchanged |
| New Files Needed | `cleargate-cli/src/hosts/types.ts`, `cleargate-cli/src/hosts/registry.ts`, `cleargate-cli/src/hosts/claude.ts`, `cleargate-cli/test/helpers/init-fixture.ts`, `cleargate-cli/test/hosts/host-adapter-contract.red.node.test.ts`, `cleargate-cli/test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` |
| Orchestration Files | `.cleargate/delivery/pending-sync/STORY-058-03_hostadapter_contract_and_registry.md`, `.cleargate/wiki/log.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-03-qa-red.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-03-tpv.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-03-dev.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-03-qa.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-03-arch.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-03-devops.md` |

- `cleargate-cli/src/hosts/types.ts` — **create**. The `HostAdapter` contract.
- `cleargate-cli/src/hosts/registry.ts` — **create**. Name → adapter resolution.
- `cleargate-cli/src/hosts/claude.ts` — **create**. Wraps existing helpers.
- `cleargate-cli/src/commands/init.ts` — **modify**. Route the install through the resolved adapter.
- `cleargate-cli/src/init/inject-claude-md.ts`, `merge-settings.ts`, `inject-mcp-json.ts`, `src/lib/claude-md-surgery.ts`, `src/lib/settings-json-surgery.ts` — **unchanged**, called by the adapter (`remove` uses the last two, exactly as `uninstall.ts:434-456` does today).
- `cleargate-cli/test/helpers/init-fixture.ts` — **create**. Frozen-clock init fixture and baseline capture/compare, reused by STORY-058-04.

### 3.2 Technical Logic
Wrap, do not rewrite. The Claude adapter is a thin delegation layer over three helpers that already encode fixed defects; reimplementing their logic inside the adapter would silently drop those fixes.

The contract needs three operation groups: **install** (the shared copier copies core plus the adapter's declared `ownedRoots()`/`sharedRoots()`; then `install()` runs the adapter's surgery), **surgery** (instruction-file bounded block, hook config merge, MCP registration — each host does all three but in different file formats), and **remove** (the inverse, for uninstall and `host remove`). Designing remove now, rather than when uninstall is touched in [[STORY-058-07]], is what keeps the two in sync.

### 3.3 API Contract (if applicable)
```ts
export type HostName = 'claude' | 'codex' | 'copilot';

export interface InstallCtx {
  readonly cwd: string;          // target repo root
  readonly payloadDir: string;   // flat composed payload (core + claude): InitOptions.payloadDir | --from-source temp view | npm default
  readonly pinVersion: string;   // init passes `pinVersion ?? 'latest'`, exactly as Step 5b does today (init.ts:542)
  readonly force: boolean;
  readonly stdout: (s: string) => void;
  readonly stderr: (s: string) => void;
}
export interface RemoveCtx {
  readonly cwd: string;
  readonly stdout: (s: string) => void;
  readonly stderr: (s: string) => void;
}
export interface RemoveReport { readonly removed: readonly string[]; }

export interface HostAdapter {
  readonly name: HostName;
  /** Install-relative POSIX roots copied verbatim from the payload and owned exclusively by this host.
   *  No leading '/', no '..' segment, no trailing '/', non-empty. */
  ownedRoots(): readonly string[];
  /** Roots copied only when a declaring host is selected; owned by core in the manifest (e.g. Codex/Copilot `.agents`). Claude: []. */
  sharedRoots(): readonly string[];
  /** Files this host edits surgically (bounded block / merge / registration). No lifecycle command deletes one wholesale. */
  surgeryTargets(): readonly string[];
  /** Post-copy surgery: instruction bounded block, hook-config merge, MCP registration. */
  install(ctx: InstallCtx): Promise<void>;
  /** Inverse of install's surgery (uninstall, `host remove`): strips ClearGate-owned content only. */
  remove(ctx: RemoveCtx): Promise<RemoveReport>;
}
```
Finalized 2026-09-25 against [[STORY-058-10]]/[[STORY-058-11]] needs (AGENTS.md, `.codex/hooks.json`, `.codex/config.toml` as surgery targets; `.codex` owned; `.agents` shared). [[STORY-058-12]] adds `dispatchMode`.

## Task Breakdown

- [ ] QA-Red: add `test/helpers/init-fixture.ts`, the contract unit reds (scenarios 1-11) and the parity integration (12); capture the pre-refactor baseline at the red commit
- [ ] Create `src/hosts/types.ts` (`HostName`, `InstallCtx`, `RemoveCtx`, `RemoveReport`, `HostAdapter` with owned/shared roots and surgery targets)
- [ ] Create `src/hosts/registry.ts` (`createHostRegistry` with name/root invariants, `defaultHostRegistry`, `UnknownHostError`, `pathUnderRoots`; Map-based lookup)
- [ ] Create `src/hosts/claude.ts`: move `HOOK_ADDITION` verbatim; `install` = init Steps 4/5/5b verbatim; `remove` = `uninstall.ts:434-456` surgery; injectable deps
- [ ] Route `init.ts` through `registry.resolve('claude').install(ctx)`; add the `hostRegistry` seam; keep -02's hoisted `.mcp.json` `let`s and assign pre/post around the adapter loop inside the Steps 3–7 `try` (M2-A1/A2); drop unused imports
- [ ] Typecheck, the targeted reds, parity compare against the baseline, and the regression witnesses solo

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

- **Surface:** `cleargate-cli/src/commands/init.ts:251` (`initHandler`; Steps 4–5b at `:461-557`, inside the Steps 3–7 `try` at `:366`) — the scaffold installer, hook merge, CLAUDE.md injection, and `.mcp.json` registration; the primary extension point.
- **Surface:** `cleargate-cli/src/init/inject-claude-md.ts:30` / `:45` (`extractBlock` / `injectClaudeMd`) — bounded-block extraction/injection.
- **Surface:** `cleargate-cli/src/init/merge-settings.ts:48` — non-destructive Claude hook merge.
- **Surface:** `cleargate-cli/src/init/inject-mcp-json.ts:77` (`injectMcpJson`; `:37` is `mergeMcpJson`) — `.mcp.json` merge, `McpJsonShape`.

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

