---
story_id: STORY-058-04
parent_epic_ref: EPIC-058
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: "Completed"
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
updated_at: 2026-09-25T15:29:43Z
created_at_version: cleargate@0.26.1
updated_at_version: 5f98abba-dirty
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
draft_tokens:
  input: 0
  output: 0
  cache_creation: 0
  cache_read: 0
  model: claude-opus-5-5
  last_stamp: 2026-09-25T16:34:35Z
  sessions:
    - session: 75d958ba-2473-408d-b4db-e15b774ad28f
      model: claude-opus-5-5
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-09-25T15:31:00Z
---

# STORY-058-04: cleargate init --host selector parsing and profile expansion

**Milestone:** M2 — Host abstraction

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate user, I want to choose which coding-agent hosts get installed, so that a Codex-only or Claude-only repo carries only the files its host actually reads.

### 1.2 Detailed Requirements
- `cleargate init` accepts a repeatable `--host <value>` option alongside the existing `--force`, `--yes`, `--pin`, and `--from-source`.
- Accepted values: every host registered in `src/hosts/registry.ts` (`claude` at this story; `codex` joins with [[STORY-058-10]]; `copilot` when its adapter lands), plus the profiles `portable` (every registered host except claude) and `all` (every registered host). A profile that expands to no registered host is an error.
- Repeated flags and comma-separated values normalize to a de-duplicated set: `--host claude --host codex,claude` yields exactly `{claude, codex}`.
- Unknown values exit non-zero, naming the offending value and listing the valid set.
- **No flag preserves today's behavior exactly** — a Claude-only install, no `AGENTS.md`, no `.codex/**`.
- The resolved host set is computed once in `initHandler` (registry order); [[STORY-058-06]] persists it as the manifest `hosts` field.

### 1.3 Out of Scope
- `cleargate host add|remove` after install — [[STORY-058-05]].
- The manifest `hosts` field itself — [[STORY-058-06]] owns the schema; this story only supplies the value.
- Codex payload content — [[STORY-058-10]].

### 1.4 Open Questions
- **Question:** should `--host` with an empty value (`--host ""`) be an error or a no-op?
- **Recommended:** error. A silently-ignored empty selector reads as "installed nothing on purpose".
- **Resolved 2026-09-25 (Architect, under the owner's autonomy directive):** error (exit 2), including an empty comma segment (`claude,`) and a whitespace-only value; validation runs before any write.

### 1.5 Risks
- Backward compatibility is the whole risk. Any change to the no-flag path is a regression for every existing user; this is exactly what [[STORY-058-09]]'s clean-room baseline exists to catch.
- Profile expansion is a place where `all` and `portable` can quietly diverge from the registry as hosts are added. Derive them from the registry rather than hard-coding member lists.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Host selector parsing

  Scenario: No flag preserves the Claude-only install
    Given a fresh target repository
    And a host registry in which codex is also registered
    When `cleargate init` runs with no host flag
    Then the resolved host set is exactly claude
    And no AGENTS.md or .codex files are created

  Scenario: Repeated and comma-separated flags normalize to one set
    Given a fresh target repository
    And a host registry with claude and codex registered
    When `cleargate init --host claude --host codex,claude` runs
    Then the resolved host set is exactly claude and codex
    And each adapter installs once

  Scenario: Profiles expand from the registry
    Given a host registry with claude, codex, and copilot registered
    When `--host portable` is resolved
    Then it expands to codex and copilot
    And `--host all` expands to every registered host

  Scenario: Unknown host is rejected
    Given a fresh target repository
    When `cleargate init --host cursor` runs
    Then it exits non-zero
    And the message names "cursor" and lists the valid host set
    And nothing is written to the target repository

  Scenario: Empty selector is rejected
    Given a fresh target repository
    When `cleargate init --host ""` runs
    Then it exits non-zero with a message naming the empty value
    And nothing is written to the target repository
```

### 2.2 Verification Steps (Manual)
- [ ] Run each selector form against a scratch fixture and inspect the resulting tree.
- [ ] Run with no flag and diff against a pre-change install.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/cli.ts` |
| Related Files | `cleargate-cli/src/commands/init.ts`, `cleargate-cli/src/hosts/registry.ts`, `cleargate-cli/src/init/copy-payload.ts` |
| New Files Needed | `cleargate-cli/test/hosts/host-selection.red.node.test.ts`, `cleargate-cli/test/commands/init-host-selection.red.node.test.ts`, `cleargate-cli/test/commands/init-host-parity.red.integration.node.test.ts`, `cleargate-cli/test/commands/init-host-cli.red.integration.node.test.ts` |
| Orchestration Files | `.cleargate/delivery/pending-sync/STORY-058-04_init_host_selector_parsing.md`, `.cleargate/wiki/log.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-04-qa-red.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-04-tpv.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-04-dev.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-04-qa.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-04-arch.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-04-devops.md` |

- `cleargate-cli/src/cli.ts` — **modify**. Register the repeatable `--host` option on the `init` command (currently `--force`, `--yes`, `--pin <ver>`, `--from-source <path>`).
- `cleargate-cli/src/commands/init.ts` — **modify**. Normalize the requested set, then invoke each resolved adapter.
- `cleargate-cli/src/hosts/registry.ts` — **modify**. Profile expansion derived from registered members.
- `cleargate-cli/src/init/copy-payload.ts` — **modify**. Additive `include?: (relPath) => boolean` option; absent = include all (existing callers unchanged). `init` passes the registry-derived payload filter so an unselected host's owned or shared roots are not copied.

### 3.2 Technical Logic
Normalization is: collect every `--host` occurrence → split each on commas → trim → lowercase → expand profiles → de-duplicate → validate. Validate *after* expansion so a profile name is never reported as an unknown host.

Derive `all` as "every registered adapter" and `portable` as "every registered adapter except claude" from the registry itself. Hard-coded member lists are how a third host gets added to the registry and silently omitted from `all`.

### 3.3 API Contract (if applicable)
`initHandler({ force, yes, pin, fromSource, hosts?: readonly string[] })` — `hosts` carries the raw `--host` occurrences; absent or empty means the Claude-only default, which is what preserves backward compatibility. Selector errors print `[cleargate init] ERROR: --host: …` and exit 2 before any write.

## Task Breakdown

- [x] QA-Red: `host-selection` unit, `init-host-selection` unit, `init-host-parity` and `init-host-cli` integration (scenarios 1-17), all over injected fixture registries, plus the M2-A15 default-path routing witness (spy the production `claudeAdapter.install`)
- [x] Add `HOST_PROFILES`, `DEFAULT_HOSTS`, `HostSelectionError`, `collectHostOption`, `normalizeHostSelectors` and `payloadFilter` to `registry.ts`, profiles derived from `names()`; `names()`/`UnknownHostError.valid` return a frozen copy (-03 post-flight FU-5)
- [x] Add additive `include` to `copyPayload`; install core ∪ the selected adapters' owned/shared roots
- [x] Add `InitOptions.hosts`; validate as Step 0 right after the `registry` seam, before Step 1 and the `--from-source` `mkdtemp` (exit 2, nothing written to the target or `os.tmpdir()`); run each selected adapter's `install` once in registry order
- [x] Register repeatable `--host <value>` on `init` in `cli.ts` with registry-derived help
- [x] Prove no-flag and `--host claude` byte-identical to the pre-M2 baseline; typecheck; witnesses solo

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 6 | No-flag default; repeated flags; comma-separated; dedupe; profile expansion; unknown + empty rejection |
| Integration tests | 1 | No-flag install byte-identical to pre-change |
| E2E / acceptance tests | 1 | `--host all` produces every adapter's owned roots |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.
- [ ] The no-flag path is proven byte-identical, not assumed.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/cli.ts:145` — the `init` command registration and its current four options.
- **Surface:** `cleargate-cli/src/commands/init.ts:215` — `initHandler`, the entry point receiving the parsed options.
- **Surface:** `cleargate-cli/src/hosts/registry.ts` — created by [[STORY-058-03]]; this story adds profile expansion to it.

## Why not simpler?

- **Smallest existing surface:** a single boolean `--codex` flag on `init`.
- **Why isn't that sufficient?** A boolean per host does not compose: it cannot express "codex and copilot but not claude", it cannot dedupe, and it grows a new flag per host forever. A normalized set with profile expansion is the smallest form that handles the additive-coexistence requirement EPIC-058 §2 states.

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

