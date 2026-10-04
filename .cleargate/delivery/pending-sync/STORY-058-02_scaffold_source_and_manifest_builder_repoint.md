---
story_id: STORY-058-02
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
updated_at: 2026-09-25T14:08:22Z
created_at_version: cleargate@0.26.1
updated_at_version: 3c012bf9-dirty
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
stamp_error: no ledger rows for work_item_id STORY-058-02
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-24T22:38:05Z
  sessions: []
---

# STORY-058-02: Repoint scaffold-source validation and manifest builder; drop the sibling dependency

**Milestone:** M1 — Foundation

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate maintainer, I want `npm pack` to succeed from a standalone `cleargate-cli` checkout with no sibling directories present, so that the published package is provably self-contained.

### 1.2 Detailed Requirements
- `cleargate-cli/src/lib/scaffold-source.ts` validates the new core/host layout instead of requiring `.claude`, `.cleargate`, and `CLAUDE.md` at the source root.
- `cleargate-cli/scripts/build-manifest.ts` classifies files across `scaffold/core/**` and every `scaffold/hosts/*/**` root, not only `.claude/**`.
- `--from-source <path>` keeps working, validating against the new layout and reporting the same `ScaffoldSourceError` codes (`PATH_MISSING`, `LAYOUT_INVALID`) with the new expected items.
- A clone of `cleargate-cli` alone, with no sibling `cleargate-planning/`, completes `npm run prebuild`, `npm run build`, and `npm pack`.
- `cleargate-cli/scripts/verify-pack.mjs` asserts the tarball contains the core plus every host payload root.

### 1.3 Out of Scope
- Adding host adapters or `--host` parsing — [[STORY-058-03]] and [[STORY-058-04]].
- Changing manifest entry *shape*; the `owner` field arrives in [[STORY-058-06]]. This story only widens which paths get classified.

### 1.4 Open Questions
- **Question:** should `build-manifest.ts`'s `tier` vocabulary gain a host dimension now, or wait for [[STORY-058-06]]'s `owner` field?
- **Recommended:** wait. `tier` and `owner` are orthogonal (tier = what kind of asset, owner = which host installs it); conflating them now would force a second migration.
- **Human decision:** Resolved 2026-09-25 by the orchestrator under the owner's autonomy directive, per the M1 plan: `tier` waits; manifest entry shape unchanged; `owner`/`hosts` belong to [[STORY-058-06]].

### 1.5 Risks
- `verify-pack.mjs` runs inside `prepublishOnly`. A wrong assertion here fails the release rather than the build, i.e. at the worst possible moment.
- FLASHCARD 2026-09-02 `#test-harness #danger #release`: `npm test` in `cleargate-cli` writes into the real `.cleargate/delivery/` tree. Any test added here must set `CLEARGATE_REPO_ROOT`, or it will back-sync live work items.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Self-contained package build

  Scenario: Pack succeeds with no sibling directories
    Given a clone of cleargate-cli with no sibling cleargate-planning directory
    When `npm run prebuild`, `npm run build`, and `npm pack` run
    Then all three succeed
    And no file outside the checkout is read

  Scenario: Tarball carries core plus every host payload
    Given a packed tarball
    When verify-pack inspects it
    Then the core payload root is present
    And every declared host payload root is present

  Scenario: --from-source validates the new layout
    Given a directory that does not contain the core/host layout
    When `cleargate init --from-source <that path>` runs
    Then it exits non-zero with a LAYOUT_INVALID error naming the missing items

  Scenario: Manifest classifies core and host files
    Given the tracked scaffold layout
    When build-manifest runs
    Then every shipped core file and every shipped host file is classified as a manifest entry, or listed in INTENTIONALLY_UNTRACKED, or excluded by a TIER_RULES exclude rule
    And no payload file is left unaccounted for
```

### 2.2 Verification Steps (Manual)
- [ ] Clone `cleargate-cli` to a directory with no siblings; run prebuild, build, pack.
- [ ] `tar -tzf` the tarball and confirm the core and host roots are present.
- [ ] Run `cleargate init --from-source` against a deliberately malformed directory and read the error text.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/lib/scaffold-source.ts` |
| Related Files | `cleargate-cli/scripts/build-manifest.ts`, `cleargate-cli/scripts/verify-pack.mjs`, `cleargate-cli/package.json`, `cleargate-cli/src/commands/init.ts`, `cleargate-cli/scripts/copy-planning-payload.mjs`, `cleargate-cli/src/lib/manifest.ts`, `cleargate-cli/.gitignore`, `cleargate-cli/scripts/check-no-exec-mode-vocab.mjs`, `cleargate-cli/scripts/check-no-inline-id-regex.mjs`, `cleargate-cli/scripts/generate-changelog-diff.ts`, `cleargate-cli/test/**` (canonical-read repoint) |
| New Files Needed | `cleargate-cli/test/helpers/scaffold-roots.ts` |

- `cleargate-cli/src/lib/scaffold-source.ts` — **modify**. `REQUIRED_ITEMS` currently `['.claude', '.cleargate', 'CLAUDE.md']`; becomes the core/host layout check. `ScaffoldSourceError` codes preserved.
- `cleargate-cli/scripts/build-manifest.ts` — **modify**. Tier classifier currently hard-coded to `.claude/**`.
- `cleargate-cli/scripts/verify-pack.mjs` — **modify**. Add core + host root assertions.
- `cleargate-cli/package.json` — **modify**. `prebuild` / `prepublishOnly` no longer depend on the sibling.
- **Amended 2026-09-25 (SPRINT-41 M1 plan) — the rest of "drop the sibling dependency":** `src/commands/init.ts:226-246` (`--from-source <scaffold>` composes core+Claude into an owned temp flat payload, cleans only that dir); `scripts/copy-planning-payload.mjs` also emits the split `templates/scaffold/**` view (gitignored in cli `.gitignore`); `src/lib/manifest.ts:125-129` dev fallback → `<cli>/templates/cleargate-planning`; `scripts/check-no-exec-mode-vocab.mjs`, `scripts/check-no-inline-id-regex.mjs`, `scripts/generate-changelog-diff.ts` → CLI-local roots; new `test/helpers/scaffold-roots.ts`, and every cli test whose **canonical** read resolves `<cli>/../cleargate-planning/**` (~85 files) repointed to the scaffold, with a guard test against new sibling reads. Live-side reads keep `META_ROOT`. Reason: once [[STORY-058-01]] moves canonical into `cleargate-cli/scaffold/`, tests still reading the frozen snapshot would stop testing what ships. Out of scope: `src/lib/drift-check.ts:143-160` ([[BUG-085]]), `src/commands/scaffold-lint.ts:57`, `src/wiki/derive-repo.ts:10`.

### 3.2 Technical Logic
`scaffold-source.ts`'s validation is a listing-membership check, not an `existsSync` probe — keep that discipline when the required-items set changes. The manifest classifier walks payload roots; parameterize the roots rather than adding a second hard-coded branch, so [[STORY-058-10]] adding a Codex root needs no classifier change.

Prove self-containment negatively: the acceptance test copies the checkout to a temp location with no siblings and builds there. A test that builds in place cannot distinguish "self-contained" from "sibling happened to be present".

### 3.3 API Contract (if applicable)
`ScaffoldSourceError` keeps its `code` union (`PATH_MISSING` | `LAYOUT_INVALID`) and `missing: string[]` payload. Callers are unaffected.

## Task Breakdown

*(Refined 2026-09-25 from the SPRINT-41 M1 plan, `sprint-runs/SPRINT-41/plans/M1.md` §STORY-058-02.)*

- [x] Validate the case-exact core/host layout with the existing error codes (directory listing, not `existsSync`)
- [x] Bridge `--from-source` to a temp composed Claude view with manifest; clean only that temp dir
- [x] Parameterize `build-manifest` over scaffold roots: per-root manifests, unchanged compatibility manifest, collision rejection
- [x] Emit the split `templates/scaffold/**` view; extend verify-pack with per-root presence and negative controls
- [x] Repoint the manifest dev fallback and the check/changelog scripts to CLI-local roots
- [x] Add `test/helpers/scaffold-roots.ts`; repoint canonical reads in cli tests; add the sibling-read guard
- [x] Prove a standalone prebuild/build/pack/verify-pack and tarball install with no sibling (plus the poisoned-sibling control)

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 3 | scaffold-source validation (valid, PATH_MISSING, LAYOUT_INVALID); manifest root parameterization |
| Integration tests | 1 | Copy-out-and-build with no siblings present |
| E2E / acceptance tests | 1 | Pack, then install from the tarball into a fixture |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.
- [ ] Any new test sets `CLEARGATE_REPO_ROOT` so it cannot write into the real delivery tree.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/lib/scaffold-source.ts:27` — `REQUIRED_ITEMS = ['.claude', '.cleargate', 'CLAUDE.md']`, the exact constant this story replaces.
- **Surface:** `cleargate-cli/scripts/build-manifest.ts` — tier classifier hard-coded to `.claude/**`.
- **Surface:** `cleargate-cli/scripts/verify-pack.mjs` — existing packed-tarball verification, invoked from `prepublishOnly`.
- **Surface:** `cleargate-cli/test/cr075-standalone-contract.node.test.ts` — existing standalone-contract coverage; the natural home for the no-siblings assertion.

## Why not simpler?

- **Smallest existing surface:** `scaffold-source.ts`'s `REQUIRED_ITEMS` array — a three-string edit.
- **Why isn't that sufficient?** Changing the validator without the manifest classifier produces a package that installs but whose files are unclassified, so `upgrade`, `doctor --drift`, and `uninstall` silently stop tracking them. The two must move together; `verify-pack` is what proves they did.

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

