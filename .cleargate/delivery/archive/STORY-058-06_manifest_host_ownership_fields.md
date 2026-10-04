---
story_id: STORY-058-06
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
actor: ClearGate maintainer
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-09-04T00:00:00Z
updated_at: 2026-09-25T18:50:36Z
created_at_version: cleargate@0.26.1
updated_at_version: e6059145-dirty
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
  last_stamp: 2026-09-24T22:38:16Z
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
- **Resolved 2026-09-25 (Architect, under the owner's autonomy directive):** explicit field, derived from the payload root key at build time (`scaffold/core` ⇒ core, `scaffold/hosts/<h>` ⇒ h); a legacy entry without `owner` reads as claude for `.claude/**` and core otherwise — exact for every pre-058-06 payload, which was core+claude only.

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

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/lib/manifest.ts` |
| Related Files | `cleargate-cli/scripts/build-manifest.ts`, `cleargate-cli/src/commands/init.ts`, `cleargate-cli/scripts/verify-pack.mjs`, `cleargate-cli/test/helpers/scaffold-roots.ts`, `cleargate-cli/test/helpers/init-fixture.ts`, `cleargate-cli/test/scripts/scaffold-layout.red.node.test.ts`, `cleargate-cli/test/commands/init-from-source.node.test.ts`, `cleargate-cli/test/commands/init-from-source-dist.integration.node.test.ts` |
| New Files Needed | `cleargate-cli/src/lib/manifest-builder.ts`, `cleargate-cli/scripts/verify-pack-checks.mjs`, `cleargate-cli/test/lib/manifest-host-ownership.red.node.test.ts`, `cleargate-cli/test/commands/init-host-snapshot.red.node.test.ts`, `cleargate-cli/test/scripts/verify-pack-compat.red.node.test.ts`, `cleargate-cli/test/lib/manifest-legacy-snapshot.red.integration.node.test.ts`, `cleargate-cli/test/fixtures/manifest/legacy-install-manifest-0.10.0.json` |
| Orchestration Files | `.cleargate/delivery/pending-sync/STORY-058-06_manifest_host_ownership_fields.md`, `.cleargate/wiki/log.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-06-qa-red.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-06-tpv.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-06-dev.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-06-qa.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-06-arch.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-06-devops.md` |

- `cleargate-cli/src/lib/manifest.ts` — **modify**. Entry gains optional `owner`; snapshot gains optional `hosts`; `entryOwner`/`installedHosts` apply the legacy default at read time; `loadInstallSnapshot` unchanged, never writes.
- `cleargate-cli/src/lib/manifest-builder.ts` — **create**. The bundled manifest core moved from `scripts/build-manifest.ts` (FU-2), plus `buildViewManifest`/`buildInstallView`.
- `cleargate-cli/scripts/build-manifest.ts` — **modify**. A thin re-exporting entry; compat restricted to core + hosts/claude (FU-1); tracked-scaffold write refused (FU-4); compat written from the flat-view manifest with a build-time equality tripwire.
- `cleargate-cli/src/commands/init.ts` — **modify**. The `--from-source` bridge uses `buildInstallView` (`resolveCliPackageRoot` and the dynamic `.ts` import retired); one hoisted `payloadFilter` predicate serves copy and Step 7 (M3-A1); Step 7 writes `hosts` as the installed set via `mergeInstalledHosts` and carries forward installed-but-unselected hosts' entries (M3-A2).
- `cleargate-cli/scripts/verify-pack.mjs` — **modify**. Check 3c through `scripts/verify-pack-checks.mjs` (FU-3).

### 3.2 Technical Logic
Derive, don't declare. `owner` comes from which payload root the file was copied from — `scaffold/core/**` ⇒ `core`, `scaffold/hosts/<name>/**` ⇒ `<name>`. A hand-maintained mapping is a second source of truth that will drift from the payload; BUG-038's two-lists-one-truth failure in `copy-payload.ts` is the precedent worth not repeating.

Legacy migration is a read-time default, not a rewrite: absent `hosts` ⇒ `["claude"]`. Do not write the field back on read, or a user who never re-installs gets their snapshot mutated by a `doctor` run.

**Precondition (FU-1, STORY-058-02 post-flight).** `buildManifest({ scaffoldRoot })` currently builds `compat` from core **and every** `hosts/*` root (`scripts/build-manifest.ts:501-537` at cli `a821d40`). This story restricts `compat` to `core` + `hosts/claude`, keeps the all-roots collision check, and reconciles the doc comments **before** any `TIER_RULES` entry classifies a non-Claude path (`.codex/**`, `AGENTS.md`, `.agents/**`). Otherwise the first such rule leaks into `templates/cleargate-planning/MANIFEST.json` → `dist/MANIFEST.json`, and every no-flag Claude install's snapshot lists files it never copied — a Rule-2 release blocker. Shared assets live physically in `scaffold/core` under a path some registered adapter declares in `sharedRoots()`; their derived owner is therefore `core`, and install-time copy/snapshot gating is `payloadFilter` (STORY-058-04).

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

- [ ] QA-Red: ownership, snapshot, verify-pack-compat unit reds and the legacy-snapshot integration (scenarios 1-17). Amend scaffold-layout scenario 6, init-from-source and init-from-source-dist (18-20). Add the real 0.10.0 snapshot fixture and the init-fixture sanctioned-delta row
- [ ] FU-1: restrict `buildManifest({scaffoldRoot})` compat to `core` + `hosts/claude` (all-roots collision check kept; doc comments reconciled) **before** any non-Claude `TIER_RULES` entry exists
- [ ] FU-2: move the manifest core into bundled `src/lib/manifest-builder.ts`. Add `buildViewManifest`/`buildInstallView` as the one flat-view builder for prebuild, `--from-source` and `composeCanonicalPayload`. Retire `resolveCliPackageRoot` and the dynamic `.ts` import
- [ ] Stamp `owner` from the payload root key (`ownerForRootKey`); add `ManifestOwner`, `entryOwner`, `installedHosts`, `LEGACY_INSTALLED_HOSTS` (read-time default, never written back)
- [ ] Init Step 7: one hoisted payloadFilter predicate for copy and snapshot; hosts = the installed set (mergeInstalledHosts of the prior snapshot's hosts and the selection, registry order) as the last key; prior entries that the installed set admits but this run's selection does not (installed-but-unselected hosts' own entries and the core entries under their sharedRoots) carry forward
- [ ] FU-3: `verify-pack` check 3c (`checkCompatPayload`): compat entries present in the flat view, owners ∈ {core, claude}, `owner: 'claude'` ⇔ under `.claude`
- [ ] FU-4: `scaffoldRoot` mode refuses to write per-root manifests into the tracked `scaffold/`
- [ ] Typecheck, targeted reds and witnesses solo, M2 parity compare with the -06 delta row

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
- **Surface:** `cleargate-cli/templates/cleargate-planning/MANIFEST.json` (the composed compat manifest, generated by prebuild) — the live shape: `cleargate_version`, `generated_at`, and `files[]` with `path`/`sha256`/`tier`/`overwrite_policy`/`preserve_on_uninstall`.
- **Surface:** `cleargate-cli/src/commands/init.ts` — Step 7 writes the install snapshot to `.cleargate/.install-manifest.json`.
- **Surface:** `cleargate-cli/src/init/copy-payload.ts` — BUG-038's two-lists-one-truth note, the argument for deriving rather than declaring ownership.
- **Surface:** `cleargate-cli/scripts/build-manifest.ts:461-559` — `buildMultiRootManifest`, the per-root provenance -06 stamps.

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

