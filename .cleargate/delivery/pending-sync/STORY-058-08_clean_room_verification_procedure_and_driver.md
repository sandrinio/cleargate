---
story_id: STORY-058-08
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
expected_bounce_exposure: low
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-09-04T00:00:00Z
updated_at: 2026-09-25T22:01:56Z
created_at_version: cleargate@0.26.1
updated_at_version: 5bda3b15-dirty
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-04T10:25:03Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-058-08
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-24T23:05:30Z
  sessions: []
---

# STORY-058-08: Clean-room verification procedure and cleargate verify-install driver

**Milestone:** M4 — Clean-room verification

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate maintainer, I want a repeatable clean-room verification procedure with a scripted driver, so that install and upgrade changes are proven against a real fresh install instead of against this repo's hand-synced dogfood copy.

### 1.2 Detailed Requirements
- Author `.cleargate/knowledge/clean-room-verification.md`: create a new empty directory outside the repository, `git init`, install the packed artifact, run `cleargate init` for each host selector, and record pass/fail per checked behavior.
- Implement `cleargate verify-install`, executing the machine-checkable half: payload file presence, hook mode bits, absence of unsubstituted `__CLEARGATE_VERSION__`, instruction-file bounded block present, MCP registration present, manifest host set correct, and `doctor` exit code.
- `verify-install` exits non-zero listing every failed check, and prints which checks it cannot make (the ones needing a live host session).
- The procedure names the verification directory's location as a sibling under `~/Documents/Dev/`, never inside the repository and never under `/tmp`, and states that it is disposable and recreated per run.
- The procedure documents *why* the in-repo dogfood instance cannot serve as the witness.

### 1.3 Out of Scope
- Executing the Claude regression baseline — [[STORY-058-09]].
- Codex or Copilot smoke runs — those hosts' own stories.

### 1.4 Open Questions
- **Question:** should `verify-install` be a public command or hidden like `stamp`?
- **Recommended:** public. Users hitting a broken install benefit from it, and it is the natural thing to ask for in a bug report.
- **Resolved 2026-09-25 (Architect, under the owner's autonomy directive):** public, reachable in pre-member state (not in GATED_COMMANDS).

### 1.5 Risks
- A driver that only checks file presence gives false confidence: the 2026-09-04 clean-room run found a defect where every file was present and correct, and the failure was behavioral. The checklist must include behavioral probes (hooks actually firing), even where they stay manual.
- `/tmp` is explicitly excluded because npm and git resolution differ there; a driver that quietly falls back to a temp dir would defeat the story's purpose.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Clean-room verification driver

  Scenario: Driver passes on a correct install
    Given a freshly installed clean-room repository
    When `cleargate verify-install` runs
    Then it exits 0
    And it lists the checks it could not make without a live host session

  Scenario: Driver fails on a missing payload file
    Given a clean-room install with one payload file deleted
    When `cleargate verify-install` runs
    Then it exits non-zero
    And the output names the missing file

  Scenario: Driver catches an unsubstituted version pin
    Given an install containing a literal __CLEARGATE_VERSION__ token
    When `cleargate verify-install` runs
    Then it exits non-zero naming the offending file

  Scenario: Driver catches a lost hook executable bit
    Given an install whose hook files are not executable
    When `cleargate verify-install` runs
    Then it exits non-zero naming the affected hooks

  Scenario: Procedure is committed and names its constraints
    Given the repository
    When .cleargate/knowledge/clean-room-verification.md is read
    Then it specifies a directory outside the repository and outside /tmp
    And it explains why the in-repo dogfood instance cannot witness payload defects
```

### 2.2 Verification Steps (Manual)
- [ ] Follow the written procedure end to end without consulting anything else; note every step that needed knowledge not in the document.
- [ ] Break one payload file deliberately and confirm the driver names it.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File (new) | `cleargate-cli/src/commands/verify-install.ts` |
| Related Files | `cleargate-cli/src/cli.ts`, `cleargate-cli/src/commands/init.ts`, `cleargate-cli/CHANGELOG.md`, `cleargate-cli/scripts/verify-pack.mjs` — reference, unchanged |
| New Files Needed | `.cleargate/knowledge/clean-room-verification.md`, `cleargate-cli/src/lib/cli-package-root.ts`, `cleargate-cli/test/commands/verify-install.red.node.test.ts`, `cleargate-cli/test/commands/verify-install-cli.red.integration.node.test.ts`, `cleargate-cli/test/docs/clean-room-verification-doc.red.node.test.ts` |
| Orchestration Files | `.cleargate/delivery/pending-sync/STORY-058-08_clean_room_verification_procedure_and_driver.md`, `.cleargate/wiki/log.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-08-qa-red.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-08-tpv.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-08-dev.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-08-qa.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-08-arch.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-08-devops.md` |

- `.cleargate/knowledge/clean-room-verification.md` — **create** (outer, meta-repo only; no `scaffold/core` twin). It verifies ClearGate's own packed artifact, and shipping it would change every install's bytes.
- `cleargate-cli/src/commands/verify-install.ts` — **create**. The driver: 12 pinned checks, a per-host `HOST_VERIFIERS` table, and the live-check list.
- `cleargate-cli/src/lib/cli-package-root.ts` — **create**. `findCleargatePackageRoot`, the one package-root walk (bundled and tsx).
- `cleargate-cli/src/cli.ts` — **modify**. Register the public `verify-install` command before `upgrade`.
- `cleargate-cli/src/commands/init.ts` — **modify**. Route `readRunningCliVersion` through `findCleargatePackageRoot`; nothing else.
- `cleargate-cli/CHANGELOG.md` — **modify**. `### Added` under `## Unreleased`.
- `cleargate-cli/scripts/verify-pack.mjs` — **reference, unchanged**. Overlapping assertions are re-expressed over the installed tree with `src/lib` accessors; `src/` never imports `scripts/`.

### 3.2 Technical Logic
The driver checks what a machine can check about an installed tree; the document carries what only a human with a running host can check. Keeping both in one story is deliberate — a driver without the document gives false confidence, and a document without the driver is not run.

Ground the check list in what the 2026-09-04 run actually exercised: payload tree, hook mode bits, pin-placeholder absence, bounded block byte-size, MCP registration, `settings.json` event set, `doctor`, `scaffold-lint`. That run is the reference implementation of the procedure this story writes down.

`scaffold-lint` from the 2026-09-04 run lints the scaffold *source* (`cleargate-planning/`), not an install, so it is not a clean-room check. The 2026-09-04 run installed the published 0.26.1 via the global binary, and that was correct for a published release. A sprint artifact must be packed and put first on PATH (M4 plan F1).

### 3.3 API Contract (if applicable)
`cleargate verify-install [--host <name>] [--json] [--cwd <dir>]` → exit 0 when every machine check passes; exit 1 listing every failed check (with the offending files); exit 2 on usage errors (unregistered `--host`, missing `--cwd`). It always prints the live-session checks it cannot make. It is read-only, it never creates or falls back to a temp directory, and its check ids are stable (M4 plan catalogue).

## Task Breakdown

- [ ] Write .cleargate/knowledge/clean-room-verification.md with the pinned H2 sections, including why the dogfood instance, a local-dist install and /tmp cannot witness payload defects
- [ ] Add src/lib/cli-package-root.ts (findCleargatePackageRoot) and route init's readRunningCliVersion through it
- [ ] Implement src/commands/verify-install.ts: the 12 pinned checks, HOST_VERIFIERS.claude, the live-check list, text and --json output, exit 0/1/2, read-only
- [ ] Register the public verify-install command before upgrade in cli.ts
- [ ] Add the CHANGELOG ### Added entry under ## Unreleased
- [ ] Prove every failure mode against a deliberately broken fixture install (U2-U16)
- [ ] QA-Verify follows the procedure end to end in a sibling clean room; every gap found is folded back into the doc

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | Each failure mode: missing file, unsubstituted pin, lost mode bit, missing MCP registration |
| Integration tests | 1 | Driver exits 0 against a correct fixture install |
| E2E / acceptance tests | 1 | Driver run inside a real clean-room install |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.
- [ ] The procedure was followed once by someone other than its author, and every gap they hit was folded back in.

## Existing Surfaces

- **Surface:** `cleargate-cli/scripts/verify-pack.mjs` — existing packed-tarball verification invoked from `prepublishOnly`; overlapping assertions to reuse.
- **Surface:** `cleargate-cli/test/integration/foreign-repo.integration.node.test.ts:1` — existing init-into-blank-fixture coverage; in-process and tmpdir-based, so it cannot witness packaging or hook-wiring defects.
- **Surface:** `cleargate-cli/test/e2e/dogfood-install.integration.node.test.ts` — existing e2e install check.
- **Surface:** `.cleargate/hook-log/gate-check.log` — the artifact the 2026-09-04 clean-room run read to find [[BUG-067]]'s field confirmation.

## Why not simpler?

- **Smallest existing surface:** `foreign-repo.integration.node.test.ts`, which already installs into blank fixtures and runs scaffold-lint, gate-run, and wiki-build.
- **Why isn't that sufficient?** It calls `initHandler()` in-process, in an OS tmpdir, from the source tree — so it never exercises the packed artifact, never runs the hooks as a host would invoke them, and never leaves a tree a human can open a real session against. The 2026-09-04 defect was invisible to it for exactly those reasons.

## Prior work

- [[EPIC-058]] — parent epic; this story is one of its decompositions.
- [[PROPOSAL-074]] — Antigravity single-host port; the `HostAdapter` precedent EPIC-058 generalizes.
- [[SPRINT-34]] — `Polyglot Portability Hardening`; language/test-stack portability, adjacent but distinct from harness portability.
- Decomposition-time re-check 2026-09-04: `cleargate-wiki-query` returned [[EPIC-058]] and [[PROPOSAL-074]] as the only multi-host prior work; no story-level prior art exists for this scope.
- [[BUG-067]] — found in the field by the first execution of this procedure; the concrete argument for the story.

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

