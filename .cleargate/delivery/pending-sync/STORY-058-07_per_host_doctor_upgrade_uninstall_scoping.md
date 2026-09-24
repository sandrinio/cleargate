---
story_id: STORY-058-07
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
complexity_label: L3
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
  last_gate_check: 2026-09-04T10:23:57Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-058-07
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-24T22:38:21Z
  sessions: []
---

# STORY-058-07: Per-host scoping of doctor, upgrade, uninstall, and prune

**Milestone:** M3 — Lifecycle scoping

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate user with more than one host installed, I want doctor, upgrade, and uninstall to operate per host, so that maintaining one adapter never disturbs another or my own files.

### 1.2 Detailed Requirements
- `cleargate doctor` reports the shared core and each installed adapter independently, and accepts a host filter.
- `cleargate upgrade` updates only the installed core and adapters; it never implicitly adds a host that was not installed.
- Drift detection classifies per owner, so a modified Codex file is not reported against Claude.
- `cleargate uninstall` removes the selected hosts plus, when all hosts go, the shared core — always preserving `preserve_on_uninstall` entries and user-authored files.
- Manifest pruning removes stale entries scoped to the host being maintained.
- A legacy (pre-`hosts`) install upgrades safely as a Claude installation and gains no adapters implicitly.

### 1.3 Out of Scope
- `host add|remove` — [[STORY-058-05]].
- The manifest schema itself — [[STORY-058-06]]; this story consumes it.

### 1.4 Open Questions
- **Question:** should `cleargate upgrade` on a legacy install offer to adopt newly available hosts, or stay strictly non-additive?
- **Recommended:** strictly non-additive, and print a one-line hint that `cleargate host add <name>` exists. An upgrade that installs files the user never asked for is the behavior EPIC-058 §5 explicitly forbids.
- **Human decision:** {pending Gate 1}

### 1.5 Risks
- Largest surface in the sprint: four commands plus the drift engine, all currently assuming one `.claude/**` namespace. This is the story most likely to need splitting if the Architect finds the four paths do not share structure.
- `session-load-delta.ts` compares Claude-specific session-loaded paths to decide restart warnings; under multiple hosts, "which session needs restarting" becomes host-dependent and can produce a warning for the wrong tool.
- FLASHCARD 2026-09-02 `#test-harness #qa #danger`: `doctorHandler` always calls `exit()`. Every doctor test must inject an `exit` seam or it kills the runner mid-file and reports a green run.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Per-host lifecycle scoping

  Scenario: Doctor reports each adapter independently
    Given a repository with claude and codex installed
    When `cleargate doctor` runs
    Then the shared core is reported once
    And each adapter is reported separately

  Scenario: Upgrade never implicitly adds a host
    Given a repository with only claude installed
    When `cleargate upgrade` runs
    Then the core and the Claude adapter are updated
    And no Codex or Copilot files are created

  Scenario: Legacy snapshot upgrades as a Claude install
    Given an install snapshot written before the hosts field existed
    When `cleargate upgrade` runs
    Then it is treated as a Claude installation
    And no adapter is added implicitly

  Scenario: Drift is attributed to the owning host
    Given a modified Codex-owned file
    When drift detection runs
    Then the drift is reported against codex
    And no drift is reported against claude

  Scenario: Uninstalling one host preserves the others
    Given a repository with all adapters installed
    When one host is uninstalled
    Then only that host's owned files are removed
    And preserve_on_uninstall entries and user-authored files remain
```

### 2.2 Verification Steps (Manual)
- [ ] Install `--host all`, modify one Codex-owned file, run `doctor` and read the attribution.
- [ ] Run `upgrade` on a legacy fixture and confirm no new host appears.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/commands/doctor.ts` |
| Related Files | `cleargate-cli/src/commands/upgrade.ts`, `cleargate-cli/src/commands/uninstall.ts`, `cleargate-cli/src/lib/drift-check.ts`, `cleargate-cli/src/lib/session-load-delta.ts` |
| New Files Needed | No |

- `cleargate-cli/src/commands/doctor.ts` — **modify**. Report core + each adapter; accept a host filter.
- `cleargate-cli/src/commands/upgrade.ts` — **modify**. Currently performs Claude-specific instruction/settings surgery; route through adapters.
- `cleargate-cli/src/commands/uninstall.ts` — **modify**. Currently Claude-specific marker validation and hook cleanup.
- `cleargate-cli/src/lib/drift-check.ts` — **modify**. Classify drift by owner.
- `cleargate-cli/src/lib/session-load-delta.ts` — **modify**. Compare adapter-declared session-loaded paths rather than Claude-only paths.

### 3.2 Technical Logic
Every one of these commands currently answers "what did ClearGate install?" by assuming `.claude/**`. Replace that assumption with a manifest query filtered by owner — the manifest already knows, once [[STORY-058-06]] lands.

Restart warnings are the subtle case: each adapter declares which of its own files a running session has already loaded, and the warning names the host whose session is stale. A single generic "restart your agent" message under two installed hosts tells the user nothing actionable.

**Split signal:** this is the one L3 in the set. If the Architect finds `doctor`+`drift` and `upgrade`+`uninstall`+`prune` do not share a common manifest-query helper, split into two L2 stories along that line rather than carrying an L3.

### 3.3 API Contract (if applicable)
`cleargate doctor [--host <name>]`, `cleargate uninstall [--host <name>]`. Absent filter means all installed hosts.

## Task Breakdown

- [ ] Add a manifest query helper: entries filtered by owner and installed-host set.
- [ ] Route `doctor` reporting through it; add the host filter.
- [ ] Route `upgrade`'s instruction/settings surgery through adapters; keep it non-additive.
- [ ] Route `uninstall` cleanup through adapter inverses; preserve `preserve_on_uninstall`.
- [ ] Classify drift by owner.
- [ ] Make `session-load-delta` adapter-declared and host-named.
- [ ] Verify the legacy-snapshot upgrade path.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 6 | manifest query by owner; doctor per-host report; upgrade non-additive; drift attribution; uninstall preservation; session-load host naming |
| Integration tests | 2 | Legacy snapshot upgrade; uninstall-one-host preserving the rest |
| E2E / acceptance tests | 1 | `--host all` → `doctor` reports every adapter healthy |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.
- [ ] Every doctor test injects an `exit` seam (FLASHCARD 2026-09-02 `#test-harness #qa #danger`).
- [ ] If the four command paths did not share a manifest-query helper, this story was split into two L2s rather than shipped as an L3.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/commands/upgrade.ts:208` — Claude-specific instruction/settings surgery and session-loaded path handling.
- **Surface:** `cleargate-cli/src/commands/uninstall.ts:325` — Claude-specific marker validation and hook cleanup.
- **Surface:** `cleargate-cli/src/commands/doctor.ts` — current single-namespace health report.
- **Surface:** `cleargate-cli/src/lib/drift-check.ts` and `cleargate-cli/src/lib/session-load-delta.ts` — the drift and restart-warning engines.

## Why not simpler?

- **Smallest existing surface:** a host filter parameter threaded into each of the four commands.
- **Why isn't that sufficient?** That is roughly the shape of the fix, and it is why this story exists rather than a broader refactor — but the parameter alone is not enough, because each command currently *derives* its file set from the `.claude/**` path convention rather than from the manifest. The work is replacing four independent derivations with one manifest query; the filter is the easy half.

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

