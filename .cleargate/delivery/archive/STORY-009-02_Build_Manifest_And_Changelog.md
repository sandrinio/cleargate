---
story_id: STORY-009-02
parent_epic_ref: EPIC-009
status: "Abandoned"
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-006_Scaffold_Manifest_And_Uninstall.md
created_at: 2026-04-19T00:00:00Z
updated_at: 2026-04-19T00:00:00Z
created_at_version: post-SPRINT-04
updated_at_version: post-SPRINT-04
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:42:39.210Z
push_version: 3
---

# STORY-009-02: Build-Time MANIFEST.json Generator + CHANGELOG Diff

**Complexity:** L2 — two build-time scripts + npm plumbing; tsup asset plumbing per FLASHCARD `#tsup #npm-publish #assets`.

## 1. The Spec

### 1.1 User Story
As the build pipeline, I want `npm run build` to produce an up-to-date `cleargate-planning/MANIFEST.json` and every `@cleargate/cli` release's CHANGELOG to auto-open with a scaffold-diff block, so that drift detection has a source of truth and Vibe Coders see what changed before they upgrade.

### 1.2 Detailed Requirements

**`cleargate-cli/scripts/build-manifest.ts`:**
- Walks `cleargate-planning/` recursively.
- For each file: compute `hashNormalized(content)` via STORY-009-01's `sha256.ts`.
- Classify `tier` via a declarative rules table in the script (`.cleargate/knowledge/*` → `protocol`; `.cleargate/templates/*` → `template`; `.claude/agents/*` → `agent`; `.claude/hooks/*` → `hook`; `.claude/skills/*` → `skill`; `.claude/settings.json` → `cli-config`; `.cleargate/FLASHCARD.md` → `user-artifact`; `.cleargate/sprint-runs/**`, `.cleargate/wiki/**`, `.cleargate/hook-log/**` → `derived`).
- Assign `overwrite_policy` + `preserve_on_uninstall` per tier (table in PROP-006 §2.3).
- `user-artifact` tier → `sha256: null` (we never claim to know content).
- Read `cleargate_version` from `cleargate-cli/package.json`.
- Write `cleargate-planning/MANIFEST.json` with stable key order + 2-space indent for diff-friendliness.

**`cleargate-cli/scripts/generate-changelog-diff.ts`:**
- Fetches previous published manifest via `npm show @cleargate/cli@<prev> --json` (or by reading a cached copy during a release).
- Diffs previous-manifest vs. current-manifest.
- Emits a markdown block titled `## Scaffold files changed` listing: `added`, `removed`, `changed` (SHA differs but content-identical path-only moves collapse to "moved").
- Outputs to stdout for piping into CHANGELOG tooling.
- No-op / empty block if zero changes.

**`cleargate-cli/package.json` plumbing:**
- Add `"prebuild": "tsx scripts/build-manifest.ts"` (runs before the existing `build`).
- Add `"postbuild": "cp ../cleargate-planning/MANIFEST.json dist/"` (or equivalent tsup-safe copy) so the manifest ships with the bundle.
- Add `"MANIFEST.json"` + `"../cleargate-planning/MANIFEST.json"` to `files[]` (adjust path per the actual repo layout — verify with `npm pack --dry-run`).
- Per FLASHCARD `#tsup #bundle #import-meta`: manifest-loading code (STORY-009-01) MUST accept a `packageRoot` seam so tests can point at a fixture tree; dev layout (src/) and dist layout (bundled) both work.

### 1.3 Out of Scope
Actual `cleargate doctor --check-scaffold` or `cleargate upgrade` consumption of the manifest (STORIES-009-04 / 009-05).

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: Build-time manifest + changelog diff

  Scenario: Fresh build writes MANIFEST.json
    Given a clean cleargate-cli working tree
    When npm run build
    Then cleargate-planning/MANIFEST.json exists
    And it has cleargate_version matching package.json
    And every file under cleargate-planning/ appears in files[] except derived/ artifacts

  Scenario: User-artifact tier has null sha
    Given cleargate-planning/.cleargate/FLASHCARD.md exists (if seeded)
    When build-manifest runs
    Then its manifest entry has sha256: null AND tier: "user-artifact"

  Scenario: Re-running build yields byte-identical manifest
    Given no source changes between runs
    When npm run build twice
    Then MANIFEST.json bytes are unchanged (stable ordering)

  Scenario: CHANGELOG diff lists changed files
    Given previous manifest had cleargate-protocol.md at sha "abc"
    And current manifest has it at sha "def"
    When generate-changelog-diff runs
    Then stdout contains "Changed: .cleargate/knowledge/cleargate-protocol.md"

  Scenario: Path-moved-only collapses
    Given a file moved from path A to path B with identical content
    When generate-changelog-diff runs
    Then stdout shows "Moved: A → B" (not separate Added+Removed lines)

  Scenario: npm pack includes MANIFEST.json
    When npm pack --dry-run
    Then the tarball listing includes MANIFEST.json
```

### 2.2 Verification Steps
- [ ] `npm run build && cat cleargate-planning/MANIFEST.json | jq '.files | length'` > 0.
- [ ] `npm pack --dry-run` listing shows `MANIFEST.json`.

## 3. Implementation

| Item | Value |
|---|---|
| Primary Files | `cleargate-cli/scripts/build-manifest.ts`, `cleargate-cli/scripts/generate-changelog-diff.ts` |
| Related | `cleargate-cli/package.json`, `cleargate-cli/tsup.config.ts` (if asset-copy lives here) |
| Deps | STORY-009-01 (sha256 + manifest lib) |

## 4. Quality Gates

| Test Type | Min | Notes |
|---|---|---|
| Script unit tests | 4 | tier-classifier happy, user-artifact null-sha, stable ordering, empty-diff no-op |
| npm-pack smoke | 1 | `npm pack --dry-run` includes MANIFEST.json |
| Idempotency test | 1 | Byte-identical re-run |

## Ambiguity Gate
🟢.
