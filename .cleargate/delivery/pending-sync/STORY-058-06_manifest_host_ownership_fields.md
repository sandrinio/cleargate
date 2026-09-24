---
story_id: STORY-058-06
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
parallel_eligible: y
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
stamp_error: no ledger rows for work_item_id STORY-058-06
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-04T10:23:57Z
  sessions: []
---

# STORY-058-06: Install-manifest host ownership fields with legacy snapshot migration

**Milestone:** M3 — Lifecycle scoping

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate maintainer, I want the install manifest to record which host owns each file and which hosts are installed, so that upgrade, doctor, prune, and uninstall can scope their work and never touch another host's files.

### 1.2 Detailed Requirements
- Manifest entries gain `owner: "core" | "claude" | "codex" | "copilot"` alongside the existing `path`, `sha256`, `tier`, `overwrite_policy`, and `preserve_on_uninstall`.
- The install snapshot at `.cleargate/.install-manifest.json` gains `hosts: string[]`, the installed set.
- **A snapshot written before the `hosts` field existed is interpreted as `["claude"]`** — no migration flag, no user action.
- Shared assets read by more than one host are owned by `core`, never duplicated per host.
- `build-manifest.ts` assigns `owner` from the payload root a file came from, so ownership is derived rather than hand-maintained.

### 1.3 Out of Scope
- Consuming the fields in doctor/upgrade/uninstall — [[STORY-058-07]].
- Consuming them in `host remove` — [[STORY-058-05]].

### 1.4 Open Questions
- **Question:** does `owner` belong on the manifest entry, or is a path-prefix rule (`.codex/** ⇒ codex`) sufficient?
- **Recommended:** an explicit field. Shared assets break any prefix rule — `AGENTS.md` sits at the repo root and is read by two hosts while owned by `core`.
- **Human decision:** {pending Gate 1}

### 1.5 Risks
- A wrong `owner` value is not a cosmetic defect: [[STORY-058-05]]'s `host remove` deletes on it. Derivation from the payload root, plus a test that every payload file resolves to exactly one owner, is the guard.
- Legacy-snapshot migration is silent by design. If it is wrong, an existing user's next `upgrade` operates on a mis-scoped file set. Test it against a real pre-change snapshot fixture, not a synthesized one.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Manifest host ownership

  Scenario: Every payload file resolves to exactly one owner
    Given the generated payload
    When build-manifest assigns ownership
    Then every entry carries an owner
    And no entry carries more than one

  Scenario: Shared assets are owned by core
    Given an asset read by more than one host
    When ownership is assigned
    Then its owner is core
    And it appears exactly once in the manifest

  Scenario: Legacy snapshot is read as a Claude install
    Given an install snapshot written before the hosts field existed
    When the manifest is loaded
    Then the installed host set is claude
    And no migration flag was required

  Scenario: Snapshot records the installed set
    Given an install with claude and codex
    When the snapshot is written
    Then hosts is exactly claude and codex
```

### 2.2 Verification Steps (Manual)
- [ ] Inspect a generated `MANIFEST.json` and confirm every entry has an `owner`.
- [ ] Load a real pre-change `.install-manifest.json` and confirm it reads as `["claude"]`.

## 3. The Implementation Guide

### 3.1 Context & Files
- `cleargate-cli/src/lib/manifest.ts` — **modify**. Entry model gains `owner`; snapshot gains `hosts`; legacy default applied on load.
- `cleargate-cli/scripts/build-manifest.ts` — **modify**. Derive `owner` from the payload root.
- `cleargate-cli/src/commands/init.ts` — **modify**. Write `hosts` into the snapshot (Step 7 writes the snapshot today).

### 3.2 Technical Logic
Derive, don't declare. `owner` comes from which payload root the file was copied from — `scaffold/core/**` ⇒ `core`, `scaffold/hosts/<name>/**` ⇒ `<name>`. A hand-maintained mapping is a second source of truth that will drift from the payload; BUG-038's two-lists-one-truth failure in `copy-payload.ts` is the precedent worth not repeating.

Legacy migration is a read-time default, not a rewrite: absent `hosts` ⇒ `["claude"]`. Do not write the field back on read, or a user who never re-installs gets their snapshot mutated by a `doctor` run.

### 3.3 API Contract (if applicable)
```jsonc
{
  "cleargate_version": "0.27.0",
  "hosts": ["claude", "codex"],          // NEW — absent means ["claude"]
  "files": [
    { "path": "...", "sha256": "...", "tier": "agent",
      "overwrite_policy": "always", "preserve_on_uninstall": false,
      "owner": "claude" }                 // NEW
  ]
}
```

## Task Breakdown

- [ ] Add `owner` to the manifest entry model and `hosts` to the snapshot model.
- [ ] Derive `owner` in `build-manifest.ts` from the payload root.
- [ ] Apply the absent-`hosts` ⇒ `["claude"]` default at load, without writing back.
- [ ] Write `hosts` from the resolved set in init's snapshot step.
- [ ] Assert every payload file resolves to exactly one owner.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | owner derivation; exactly-one-owner; core ownership of shared assets; legacy default on load |
| Integration tests | 1 | Real pre-change snapshot fixture reads as ["claude"] and is not mutated |
| E2E / acceptance tests | 1 | `--host all` install writes the full hosts set |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.
- [ ] Legacy migration is tested against a real captured snapshot, not a synthesized one.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/lib/manifest.ts:36` — the entry model and drift engine being extended.
- **Surface:** `cleargate-planning/MANIFEST.json` — the live shape: `cleargate_version`, `generated_at`, and `files[]` with `path`/`sha256`/`tier`/`overwrite_policy`/`preserve_on_uninstall`.
- **Surface:** `cleargate-cli/src/commands/init.ts` — Step 7 writes the install snapshot to `.cleargate/.install-manifest.json`.
- **Surface:** `cleargate-cli/src/init/copy-payload.ts` — BUG-038's two-lists-one-truth note, the argument for deriving rather than declaring ownership.

## Why not simpler?

- **Smallest existing surface:** a path-prefix rule applied at read time — `.claude/** ⇒ claude`, `.codex/** ⇒ codex`.
- **Why isn't that sufficient?** It cannot express shared ownership. `AGENTS.md` sits at the repo root, is read by both Codex and Copilot, and must survive removing either — a prefix rule either assigns it to one host (so removing that host breaks the other) or to neither (so nothing ever cleans it up). An explicit derived field is the smallest thing that handles the shared case EPIC-058 §3 requires.

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

