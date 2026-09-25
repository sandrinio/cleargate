---
story_id: STORY-058-05
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
actor: ClearGate user
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-09-04T00:00:00Z
updated_at: 2026-09-25T19:52:15Z
created_at_version: cleargate@0.26.1
updated_at_version: f8242d41-dirty
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-04T10:23:56Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-058-05
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-24T22:38:12Z
  sessions: []
---

# STORY-058-05: cleargate host list | add | remove lifecycle commands

**Milestone:** M3 — Lifecycle scoping

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate user who already installed ClearGate, I want to add or remove a coding-agent host without re-running init, so that adopting Codex later does not risk my existing Claude setup.

### 1.2 Detailed Requirements
- `cleargate host list` prints the installed host set and each host's owned-file health.
- `cleargate host add <name>` installs one adapter additively, leaving every other host's files and all user-authored content byte-identical.
- `cleargate host remove <name>` removes only that adapter's ClearGate-owned files and config entries, preserving the shared core, other hosts, and user-authored instructions, hooks, and MCP servers.
- `host add` is idempotent: running it twice records the host once and creates no duplicate hook or instruction entries.
- Removing the last remaining host is refused with a message pointing at `cleargate uninstall`.

### 1.3 Out of Scope
- Manifest schema for ownership — [[STORY-058-06]]; this story consumes it.
- Per-host scoping of `doctor` / `upgrade` / `uninstall` — [[STORY-058-07]].

### 1.4 Open Questions
- **Question:** should `host remove` of the last host be refused, or silently equivalent to `uninstall`?
- **Recommended:** refuse and point at `uninstall`. Silent equivalence means a typo can strip the scaffold.
- **Resolved 2026-09-25 (Architect):** refuse (exit 1) with a message naming `cleargate uninstall`; unknown or not-installed host names exit 2; nothing is written on any error path.

### 1.5 Risks
- `host remove` is the only destructive command in this epic. Its blast radius is bounded entirely by manifest ownership being correct — if [[STORY-058-06]]'s `owner` field is wrong for any entry, this command deletes the wrong file.
- Shared assets (`AGENTS.md`, portable skills) have multiple host consumers. EPIC-058 §3 requires they be owned by `core`, never duplicated per host; removing a host must not remove them while another host still reads them.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Host lifecycle commands

  Scenario: Add is additive and leaves other hosts untouched
    Given a repository installed with the Claude adapter
    When `cleargate host add codex` runs
    Then Codex-owned files are created
    And every Claude-owned file is byte-identical to before

  Scenario: Add is idempotent
    Given a repository with the Codex adapter installed
    When `cleargate host add codex` runs again
    Then codex is recorded exactly once
    And no duplicate hook or instruction entries are created

  Scenario: Remove preserves everything it does not own
    Given a repository with all adapters installed
    When `cleargate host remove copilot` runs
    Then only ClearGate-owned Copilot files and config entries are removed
    And the shared core, other hosts, user instructions, user hooks, and user MCP servers are unchanged

  Scenario: Shared assets survive while another consumer remains
    Given codex and copilot are both installed and both read the shared portable skills
    When `cleargate host remove copilot` runs
    Then the core-owned shared assets remain

  Scenario: Removing the last host is refused
    Given a repository with exactly one installed host
    When `cleargate host remove <that host>` runs
    Then it exits non-zero
    And the message points at `cleargate uninstall`

  Scenario: List reports the installed set
    Given a repository with claude and codex installed
    When `cleargate host list` runs
    Then it prints both hosts and their owned-file health
```

### 2.2 Verification Steps (Manual)
- [ ] Install Claude only, `host add codex`, diff the Claude tree — expect zero changes.
- [ ] `host add codex` twice; inspect the recorded host set and the hook config for duplicates.
- [ ] `host remove codex`; confirm user-authored MCP servers and hooks survive.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File (new) | `cleargate-cli/src/commands/host.ts` |
| Related Files | `cleargate-cli/src/cli.ts`, `cleargate-cli/src/hosts/types.ts`, `cleargate-cli/src/hosts/claude.ts`, `cleargate-cli/src/hosts/registry.ts` — unchanged, `cleargate-cli/src/lib/manifest.ts` — unchanged |
| New Files Needed | `cleargate-cli/src/hosts/lifecycle.ts`, `cleargate-cli/test/hosts/host-lifecycle.red.node.test.ts`, `cleargate-cli/test/commands/host-cli.red.integration.node.test.ts` |
| Orchestration Files | `.cleargate/delivery/pending-sync/STORY-058-05_host_lifecycle_commands.md`, `.cleargate/wiki/log.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-05-qa-red.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-05-tpv.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-05-dev.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-05-qa.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-05-arch.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-05-devops.md` |

- `cleargate-cli/src/commands/host.ts` — **create**. The `list` / `add` / `remove` subcommands.
- `cleargate-cli/src/hosts/lifecycle.ts` — **create**. The removal plan/execute pair and add/health, reused by STORY-058-07's `uninstall --host`.
- `cleargate-cli/src/hosts/types.ts` / `cleargate-cli/src/hosts/claude.ts` — **modify**. Optional `InstallCtx.logPrefix`, byte-neutral for init.
- `cleargate-cli/src/cli.ts` — **modify**. Register the `host` command group.
- `cleargate-cli/src/hosts/registry.ts` — **read** (no change: `resolve` and `pathUnderRoots` suffice).
- `cleargate-cli/src/lib/manifest.ts` — **read**. Ownership drives what `remove` may delete.

### 3.2 Technical Logic
`remove` deletes strictly by manifest ownership: an entry is removable only if its `owner` equals the host being removed. Anything owned by `core`, by another host, or absent from the manifest entirely (i.e. user-authored) is left alone. This is the safety property; assert it directly rather than inferring it from a tree diff.

Config-entry removal is surgical, not file deletion: removing Codex must strip ClearGate's entries from `.codex/hooks.json` and the ClearGate MCP server from `.codex/config.toml` while preserving every user entry in those files — the same non-destructive discipline `merge-settings.ts` already applies to `.claude/settings.json`.

### 3.3 API Contract (if applicable)
`cleargate host list` → table of `{ host, owned_files, healthy }`.
`cleargate host add <name>` / `cleargate host remove <name>` → exit 0 on success; non-zero with a named reason otherwise.

## Task Breakdown

- [ ] QA-Red: lifecycle unit reds (scenarios 1-8, 11) and the spawned host-cli integration (9-10), over fixture registries R2/R3 plus the real Claude adapter
- [ ] Create `src/hosts/lifecycle.ts`: `planHostRemoval` (deletes strictly by `entryOwner === host`, surgery targets and preserved entries kept, orphaned shared entries removed), `executeHostRemoval`, `addHost`, `computeHostHealth`, `HostLifecycleError`
- [ ] Create `src/commands/host.ts`: `list` / `add <name>` / `remove <name>` handlers; exit 2 for unknown, not-installed or no snapshot; exit 1 for last-host refusal with an `uninstall` pointer
- [ ] Add `InstallCtx.logPrefix` (default `'[cleargate init] '`, byte-neutral for init) and use it in `claude.ts` `install()`
- [ ] Register the `host` command group after `init` in `cli.ts`
- [ ] Typecheck, targeted reds, witnesses and M2 parity compare solo

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | add idempotence; remove ownership gate; last-host refusal; shared-asset retention; list output |
| Integration tests | 2 | add-then-diff other host byte-identity; remove preserving user MCP + hook entries |
| E2E / acceptance tests | 1 | all-hosts install → remove one → remaining hosts still healthy |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.
- [ ] `remove` is proven to delete only manifest-owned entries, asserted directly on ownership rather than via tree diff.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/lib/manifest.ts:36` — manifest entry model; ownership is what bounds `remove`.
- **Surface:** `cleargate-cli/src/init/merge-settings.ts:48` — the existing non-destructive merge; the precedent for surgical un-merge.
- **Surface:** `cleargate-cli/src/commands/uninstall.ts:325-342` (marker pre-validation) and `:434-457` (surgery) — existing Claude-specific marker validation and hook cleanup; the closest existing removal logic.

## Why not simpler?

- **Smallest existing surface:** re-running `cleargate init --host <new>` to add, and `uninstall` to remove.
- **Why isn't that sufficient?** `init` re-runs the whole install pipeline including first-install-only seeding and instruction-block surgery, and `uninstall` is all-or-nothing — neither can add or remove exactly one adapter. EPIC-058 §2 lists `host add|remove` as a v1 requirement precisely so additive adapters are surgically reversible.

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

