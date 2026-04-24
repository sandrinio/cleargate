---
story_id: STORY-009-01
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
pushed_at: 2026-04-20T19:44:26.772Z
push_version: 3
---

# STORY-009-01: `sha256.ts` Normalized Hasher + `manifest.ts` Library

**Complexity:** L2 — pure libraries; unit tests heavy (normalization + classifier × 4 states).

## 1. The Spec

### 1.1 User Story
As the manifest system, I want a deterministic SHA256 hasher and a drift classifier so that I can compare package/install/current SHAs cross-platform without a git dependency.

### 1.2 Detailed Requirements

**`cleargate-cli/src/lib/sha256.ts`:**
- Exports `hashNormalized(content: string | Buffer): string` (hex-encoded, 64 chars).
- Normalization: LF line endings (CRLF → LF), UTF-8 no-BOM (strip leading `\ufeff`), trailing-newline enforced (append `\n` if missing before hashing).
- Exports `hashFile(path: string): Promise<string>` that reads the file, normalizes, hashes.
- Exports `shortHash(full: string): string` — first 8 hex chars for human-readable output.

**`cleargate-cli/src/lib/manifest.ts`:**
- Exports `loadPackageManifest(): ManifestFile` — reads `cleargate-planning/MANIFEST.json` from the installed package (threading `templateDir` seam per FLASHCARD `#tsup #bundle #import-meta`).
- Exports `loadInstallSnapshot(projectRoot: string): ManifestFile | null` — reads `.cleargate/.install-manifest.json`; returns null if absent.
- Exports `computeCurrentSha(file: ManifestEntry, projectRoot: string): Promise<string | null>` — returns current-FS SHA for tracked file; null if file missing.
- Exports `classify(pkg, install, current): DriftState` — returns `"clean" | "user-modified" | "upstream-changed" | "both-changed" | "untracked"` per PROP-006 §2.4 decision table.
- Exports `writeDriftState(projectRoot: string, state: DriftMap): Promise<void>` — writes `.cleargate/.drift-state.json` atomically (write-temp-then-rename).
- `user-artifact` tier (sha256:null) is skipped by `classify` — returns `"untracked"` (PROP-006 Q8).

### 1.3 Out of Scope
CLI wiring (STORY-009-04). Build-time manifest generation (STORY-009-02).

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: sha256 + manifest lib

  Scenario: CRLF normalizes to LF before hashing
    Given a string "foo\r\nbar\r\n"
    When hashNormalized is called
    Then the result equals hashNormalized("foo\nbar\n")

  Scenario: Leading BOM stripped
    Given a string "\ufeffhello\n"
    When hashNormalized is called
    Then the result equals hashNormalized("hello\n")

  Scenario: Trailing newline enforced
    Given a string "hello" (no trailing \n)
    When hashNormalized is called
    Then the result equals hashNormalized("hello\n")

  Scenario: classify — clean
    Given install_sha = current_sha = package_sha = "abc"
    When classify()
    Then result is "clean"

  Scenario: classify — user-modified
    Given install_sha == package_sha, current_sha != install_sha
    When classify()
    Then result is "user-modified"

  Scenario: classify — upstream-changed
    Given install_sha == current_sha, package_sha != install_sha
    When classify()
    Then result is "upstream-changed"

  Scenario: classify — both-changed
    Given install_sha, current_sha, package_sha all differ pairwise
    When classify()
    Then result is "both-changed"

  Scenario: user-artifact tier skipped
    Given a manifest entry with sha256: null and tier: "user-artifact"
    When classify()
    Then result is "untracked" (no further comparison)

  Scenario: writeDriftState is atomic
    Given a partial write is interrupted
    Then .cleargate/.drift-state.json either reflects old or new — never half-written
```

### 2.2 Verification Steps
- [ ] Cross-platform test: hash a CRLF Windows-authored file on macOS — result identical to the LF version.

## 3. Implementation

| Item | Value |
|---|---|
| Primary Files | `cleargate-cli/src/lib/sha256.ts`, `cleargate-cli/src/lib/manifest.ts` |
| Deps | `node:crypto`, `node:fs` |

## 4. Quality Gates

| Test Type | Min | Notes |
|---|---|---|
| Unit tests | 12 | Normalization × 3, classifier × 5 states + user-artifact, atomicity |
| Cross-platform fixture | 1 | CRLF / BOM / no-trailing-newline inputs hash identically |

## Ambiguity Gate
🟢.
